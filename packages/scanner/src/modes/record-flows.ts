import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { normalizeRoute, isLoginPage, loadRoutePatterns, type RoutePattern } from './dedup.js';
import { runRecordFlowsTests } from './record-flows-playwright.js';
import { parseTrace, correlateScreenshots, extractScreenshotBySha1 } from './trace-parser.js';

interface FlowStep {
  action: 'goto' | 'waitFor' | 'click' | 'fill' | 'end';
  title: string;
  screenshot?: string;
  timestamp?: number;
}

interface FlowGallery {
  [nodeId: string]: FlowStep[];
}

interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual' | 'e2e-record';
  };
  nodes: {
    id: string;
    route: string;
    label: string;
    group: string;
    screenshot?: string;
    metadata?: Record<string, unknown>;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'link' | 'redirect' | 'router-push' | 'shared-nav';
  }[];
  groups: { id: string; label: string; color?: string; routePrefix?: string }[];
  flows?: {
    name: string;
    steps: string[];
    gallery?: FlowGallery;
    partial?: boolean;
  }[];
  sharedNav?: unknown;
}

export interface RecordFlowsOptions {
  flowsDir: string;
  baseUrl: string;
  storageState?: string;
  routesJson?: string;
  screenshotDir: string;
  output: string;
  name?: string;
  failOnTestErrors?: boolean;
}

export async function recordFlows(options: RecordFlowsOptions): Promise<NavMapGraph> {
  const { flowsDir, baseUrl, storageState, routesJson, screenshotDir, name, failOnTestErrors } =
    options;

  const flowsDirAbs = path.resolve(flowsDir);
  const screenshotDirAbs = path.resolve(screenshotDir);
  fs.mkdirSync(screenshotDirAbs, { recursive: true });

  // Load existing graph for merge
  let routePatterns: RoutePattern[] | undefined;
  let existingGraph: NavMapGraph | undefined;
  if (routesJson && fs.existsSync(routesJson)) {
    console.log(`Loading existing graph from ${routesJson}...`);
    existingGraph = JSON.parse(fs.readFileSync(routesJson, 'utf-8'));
    routePatterns = loadRoutePatterns(routesJson);
    console.log(`  ${routePatterns.length} route patterns loaded`);
  }

  // Discover test files
  const testFiles = await glob('**/*.spec.{ts,js}', { cwd: flowsDirAbs });
  if (testFiles.length === 0) {
    throw new Error(`No .spec.ts/.spec.js files found in ${flowsDirAbs}`);
  }
  console.log(`Found ${testFiles.length} flow test(s):`);
  for (const f of testFiles) console.log(`  ${f}`);

  // Resolve cwd — follow symlinks to find original project root
  let cwd = flowsDirAbs;
  try {
    const firstTestReal = fs.realpathSync(path.join(flowsDirAbs, testFiles[0]));
    let dir = path.dirname(firstTestReal);
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        cwd = dir;
        break;
      }
      dir = path.dirname(dir);
    }
  } catch {
    // fallback to flows dir
  }
  console.log(`Working directory: ${cwd}`);

  console.log('\nRunning Playwright tests...');
  await runRecordFlowsTests({
    flowsDirAbs,
    screenshotDirAbs,
    baseUrl,
    storageState,
    cwd,
    failOnTestErrors,
  });

  // Read reporter manifest
  const manifestPath = path.join(screenshotDirAbs, '.nav-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Reporter manifest not found at ${manifestPath}.`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`\nProcessing ${manifest.traces.length} trace(s)...`);

  // Parse traces and build flows
  const pages = new Map<string, NavMapGraph['nodes'][0]>();
  const edgeSet = new Map<string, { source: string; target: string; visitCount: number }>();
  const flows: NonNullable<NavMapGraph['flows']> = [];

  for (const trace of manifest.traces) {
    if (!fs.existsSync(trace.tracePath)) {
      console.warn(`  Trace not found: ${trace.tracePath}`);
      continue;
    }

    console.log(`  Parsing: ${trace.testName}`);
    const { actions, screenshots } = await parseTrace(trace.tracePath);

    // Add 'end' action
    const lastTs = actions.length > 0 ? actions[actions.length - 1].timestamp + 1 : 0;
    actions.push({ action: 'end', title: 'Test complete', timestamp: lastTs });

    // Correlate screenshots with key actions
    const ssMap = correlateScreenshots(actions, screenshots);

    // Build flow
    const flowSteps: string[] = [];
    const gallery: FlowGallery = {};
    let prevNodeId: string | null = null;
    let currentNodeId: string | null = null;
    let stepCounter = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Track current page from goto events
      if (action.action === 'goto' && action.url) {
        let pathname: string;
        try {
          pathname = action.url.startsWith('/')
            ? action.url.split('?')[0].split('#')[0]
            : new URL(action.url).pathname;
        } catch {
          continue;
        }

        if (isLoginPage(action.url)) continue;

        const normalized = normalizeRoute(pathname, routePatterns);
        if (!normalized) continue;

        if (!pages.has(normalized.id)) {
          pages.set(normalized.id, {
            id: normalized.id,
            route: normalized.route,
            label: normalized.label,
            group: normalized.group,
          });
        }

        if (prevNodeId && prevNodeId !== normalized.id) {
          const key = `${prevNodeId}->${normalized.id}`;
          const existing = edgeSet.get(key);
          if (existing) existing.visitCount++;
          else edgeSet.set(key, { source: prevNodeId, target: normalized.id, visitCount: 1 });
        }

        prevNodeId = currentNodeId;
        currentNodeId = normalized.id;
        if (!flowSteps.includes(normalized.id)) {
          flowSteps.push(normalized.id);
        }
      }

      // Build gallery entry for key actions
      if (
        currentNodeId &&
        (action.action === 'goto' || action.action === 'waitFor' || action.action === 'end')
      ) {
        if (!gallery[currentNodeId]) gallery[currentNodeId] = [];

        const sha1 = ssMap.get(i);
        let screenshotPath: string | undefined;
        if (sha1) {
          stepCounter++;
          const safeName = trace.testName
            .replace(/[^a-zA-Z0-9]/g, '-')
            .slice(0, 40)
            .replace(/-+$/, '');
          const filename = `${safeName}-step-${String(stepCounter).padStart(2, '0')}`;
          const extracted = await extractScreenshotBySha1(
            trace.tracePath,
            sha1,
            screenshotDirAbs,
            filename
          );
          if (extracted) {
            screenshotPath = path.relative(process.cwd(), extracted);
          }
        }

        gallery[currentNodeId].push({
          action: action.action,
          title: action.title,
          screenshot: screenshotPath,
          timestamp: action.timestamp,
        });

        // Update page screenshot to latest key-moment capture
        if (screenshotPath && currentNodeId) {
          const page = pages.get(currentNodeId);
          if (page) page.screenshot = screenshotPath;
        }
      }
    }

    if (flowSteps.length >= 1) {
      flows.push({
        name: trace.testName,
        steps: flowSteps,
        gallery: Object.keys(gallery).length > 0 ? gallery : undefined,
        partial: trace.status === 'failed' ? true : undefined,
      });
    }
  }

  console.log(
    `\nDiscovered ${pages.size} page(s), ${edgeSet.size} edge(s), ${flows.length} flow(s)`
  );

  // Build groups
  const groupMap = new Map<string, Set<string>>();
  for (const page of pages.values()) {
    const s = groupMap.get(page.group) ?? new Set();
    s.add(page.id);
    groupMap.set(page.group, s);
  }
  const GROUP_COLORS = ['#5b9bf5', '#4eca6a', '#b07ce8', '#f0a050', '#6e8ca8', '#556878'];
  const groups = [...groupMap.entries()]
    .filter(([, m]) => m.size > 0)
    .map(([id], i) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: GROUP_COLORS[i % GROUP_COLORS.length],
      routePrefix: id === 'root' ? '/' : `/${id}`,
    }));

  let graph: NavMapGraph = {
    version: '1.0',
    meta: {
      name: name ?? 'Recorded Flows',
      baseUrl: baseUrl,
      generatedAt: new Date().toISOString(),
      generatedBy: 'e2e-record',
    },
    nodes: [...pages.values()],
    edges: [...edgeSet.values()].map(e => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'link' as const,
    })),
    groups,
    flows: flows.length > 0 ? flows : undefined,
  };

  if (existingGraph) {
    graph = mergeGraphs(existingGraph, graph);
  }

  return graph;
}

function mergeGraphs(existing: NavMapGraph, recorded: NavMapGraph): NavMapGraph {
  const merged = JSON.parse(JSON.stringify(existing)) as NavMapGraph;

  // Merge pages
  const existingNodeMap = new Map(merged.nodes.map(n => [n.id, n]));
  for (const node of recorded.nodes) {
    const existingNode = existingNodeMap.get(node.id);
    if (existingNode) {
      if (node.screenshot) existingNode.screenshot = node.screenshot;
    } else {
      merged.nodes.push(node);
    }
  }

  // Merge edges
  const existingEdgeKeys = new Set(merged.edges.map(e => `${e.source}->${e.target}`));
  for (const edge of recorded.edges) {
    const key = `${edge.source}->${edge.target}`;
    if (!existingEdgeKeys.has(key)) {
      merged.edges.push(edge);
      existingEdgeKeys.add(key);
    }
  }

  // Merge flows
  const existingFlows = merged.flows ?? [];
  for (const flow of recorded.flows ?? []) {
    const idx = existingFlows.findIndex(f => f.name === flow.name);
    if (idx >= 0) existingFlows[idx] = flow;
    else existingFlows.push(flow);
  }
  merged.flows = existingFlows.length > 0 ? existingFlows : undefined;

  return merged;
}
