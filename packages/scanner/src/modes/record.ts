import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  normalizeRoute,
  isLoginPage,
  loadRoutePatterns,
  type RoutePattern,
  type PageRecord,
} from './dedup.js';
import { parseTrace, extractScreenshotBySha1 } from './trace-parser.js';

interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'e2e-record';
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
  flows?: { name: string; steps: string[] }[];
}

export interface RecordOptions {
  playwrightConfig: string;
  storageState?: string;
  routesJson?: string;
  screenshotDir: string;
  output: string;
  name?: string;
}

interface TraceEntry {
  testName: string;
  testFile: string;
  workerId: number;
  tracePath: string;
  status: string;
}


export async function recordTests(options: RecordOptions): Promise<NavMapGraph> {
  const { playwrightConfig, routesJson, screenshotDir, name } = options;

  const screenshotDirAbs = path.resolve(screenshotDir);
  fs.mkdirSync(screenshotDirAbs, { recursive: true });

  // Load route patterns if provided
  let routePatterns: RoutePattern[] | undefined;
  if (routesJson && fs.existsSync(routesJson)) {
    console.log(`Loading route patterns from ${routesJson}...`);
    routePatterns = loadRoutePatterns(routesJson);
    console.log(`  ${routePatterns.length} patterns loaded`);
  }

  // Resolve the reporter path (shipped with this package)
  const reporterPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'reporter.js');

  // Build playwright args — use execFileSync to avoid shell injection
  const configPath = path.resolve(playwrightConfig);
  const args = ['playwright', 'test', '--config', configPath, `--reporter=${reporterPath}`];

  console.log(`Running: npx ${args.join(' ')}`);
  console.log(`Screenshot dir: ${screenshotDirAbs}\n`);

  const env = {
    ...process.env,
    NAV_MAP_SCREENSHOT_DIR: screenshotDirAbs,
  };

  try {
    execFileSync('npx', args, {
      stdio: 'inherit',
      env,
      cwd: path.dirname(configPath),
      timeout: 10 * 60 * 1000,
    });
  } catch {
    console.warn('\nSome tests failed — continuing with available traces.\n');
  }

  // Read the manifest
  const manifestPath = path.join(screenshotDirAbs, '.nav-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Reporter manifest not found at ${manifestPath}. Ensure trace: 'on' is set in your Playwright config.`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const traces: TraceEntry[] = manifest.traces;
  console.log(`\nProcessing ${traces.length} traces...`);

  // Parse traces and collect navigation events
  const pages = new Map<string, PageRecord>();
  const edgeSet = new Map<string, { source: string; target: string; visitCount: number }>();
  const flows: { name: string; steps: string[] }[] = [];
  let baseUrl: string | undefined;

  for (const trace of traces) {
    if (!fs.existsSync(trace.tracePath)) {
      console.warn(`  Trace not found: ${trace.tracePath}`);
      continue;
    }

    console.log(`  Parsing: ${trace.testName} (${trace.tracePath})`);

    const { navigations } = await parseTrace(trace.tracePath);
    const events = navigations.map(n => ({ url: n.url, timestamp: n.timestamp }));
    if (events.length === 0) continue;

    // Detect base URL from first event
    if (!baseUrl && events.length > 0) {
      try {
        const u = new URL(events[0].url);
        baseUrl = `${u.protocol}//${u.host}`;
      } catch {
        /* ignore */
      }
    }

    const flowSteps: string[] = [];
    let prevNodeId: string | null = null;

    for (const event of events) {
      let pathname: string;
      try {
        // Handle both absolute and relative URLs
        if (event.url.startsWith('/')) {
          pathname = event.url.split('?')[0].split('#')[0];
        } else {
          pathname = new URL(event.url).pathname;
        }
      } catch {
        continue;
      }

      if (isLoginPage(event.url)) continue;

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
        const edgeKey = `${prevNodeId}->${normalized.id}`;
        const existing = edgeSet.get(edgeKey);
        if (existing) {
          existing.visitCount++;
        } else {
          edgeSet.set(edgeKey, {
            source: prevNodeId,
            target: normalized.id,
            visitCount: 1,
          });
        }
      }

      if (flowSteps[flowSteps.length - 1] !== normalized.id) {
        flowSteps.push(normalized.id);
      }

      prevNodeId = normalized.id;
    }

    if (flowSteps.length >= 1) {
      flows.push({ name: trace.testName, steps: flowSteps });
    }
  }

  console.log(`\nDiscovered ${pages.size} pages, ${edgeSet.size} edges, ${flows.length} flows`);

  // Extract screenshots from traces
  console.log('Extracting screenshots from traces...');
  for (const trace of traces) {
    if (!fs.existsSync(trace.tracePath)) continue;
    const { screenshots: traceScreenshots } = await parseTrace(trace.tracePath);
    if (traceScreenshots.length > 0) {
      const lastSs = traceScreenshots[traceScreenshots.length - 1];
      for (const page of pages.values()) {
        if (!page.screenshot) {
          const extracted = await extractScreenshotBySha1(
            trace.tracePath,
            lastSs.sha1,
            screenshotDirAbs,
            page.id
          );
          if (extracted) {
            page.screenshot = path.relative(process.cwd(), extracted);
          }
          break;
        }
      }
    }
  }

  // Build groups
  const groupMap = new Map<string, Set<string>>();
  for (const page of pages.values()) {
    const existing = groupMap.get(page.group) ?? new Set();
    existing.add(page.id);
    groupMap.set(page.group, existing);
  }

  const GROUP_COLORS = ['#5b9bf5', '#4eca6a', '#b07ce8', '#f0a050', '#6e8ca8', '#556878'];
  const groups = [...groupMap.entries()]
    .filter(([, members]) => members.size > 0)
    .map(([id], i) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: GROUP_COLORS[i % GROUP_COLORS.length],
      routePrefix: id === 'root' ? '/' : `/${id}`,
    }));

  return {
    version: '1.0',
    meta: {
      name: name ?? 'Recorded Navigation Map',
      baseUrl,
      generatedAt: new Date().toISOString(),
      generatedBy: 'e2e-record',
    },
    nodes: [...pages.values()],
    edges: [...edgeSet.values()].map(e => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'link' as const,
      label: e.visitCount > 1 ? `${e.visitCount} visits` : undefined,
    })),
    groups,
    flows: flows.length > 0 ? flows : undefined,
  };
}

// Inline parseTraceNavigation and extractScreenshotsFromTrace removed —
// now using shared trace-parser.ts module
