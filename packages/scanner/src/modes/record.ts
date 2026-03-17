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
import { optimizeScreenshot } from '../screenshots/optimize.js';

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

interface NavEvent {
  url: string;
  timestamp: number;
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

    const events = await parseTraceNavigation(trace.tracePath);
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

    if (flowSteps.length >= 2) {
      flows.push({ name: trace.testName, steps: flowSteps });
    }
  }

  console.log(`\nDiscovered ${pages.size} pages, ${edgeSet.size} edges, ${flows.length} flows`);

  // Extract screenshots from traces
  console.log('Extracting screenshots from traces...');
  for (const trace of traces) {
    if (!fs.existsSync(trace.tracePath)) continue;
    await extractScreenshotsFromTrace(trace.tracePath, screenshotDirAbs, pages, routePatterns);
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

async function parseTraceNavigation(tracePath: string): Promise<NavEvent[]> {
  const events: NavEvent[] = [];

  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(tracePath);

    for (const entry of zip.getEntries()) {
      if (!entry.entryName.endsWith('.trace') && !entry.entryName.endsWith('.jsonl')) continue;

      const content = entry.getData().toString('utf-8');
      for (const line of content.split('\n').filter(Boolean)) {
        try {
          const event = JSON.parse(line);
          // Playwright trace format: Frame.goto in 0-trace.trace
          if (event.class === 'Frame' && event.method === 'goto' && event.params?.url) {
            events.push({ url: event.params.url, timestamp: event.startTime ?? Date.now() });
          }
          // Also catch Navigate actions in test.trace
          if (event.title && /^Navigate to /.test(event.title) && event.params?.url) {
            events.push({ url: event.params.url, timestamp: event.startTime ?? Date.now() });
          }
          // Fallback: any event with a navigation-like URL param
          if (event.method === 'navigated' || event.type === 'navigation') {
            const url = event.params?.url ?? event.url;
            if (url) events.push({ url, timestamp: event.timestamp ?? Date.now() });
          }
        } catch {
          /* skip malformed lines */
        }
      }
    }
  } catch (err) {
    console.warn(`  Warning: Failed to parse trace ${tracePath}: ${err}`);
  }

  return events;
}

async function extractScreenshotsFromTrace(
  tracePath: string,
  outputDir: string,
  pages: Map<string, PageRecord>,
  _routePatterns?: RoutePattern[]
): Promise<void> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(tracePath);

    for (const entry of zip.getEntries()) {
      if (!entry.entryName.endsWith('.png') && !entry.entryName.endsWith('.jpeg')) continue;

      const imageData = entry.getData();
      const rawPath = path.join(outputDir, `_tmp_${entry.entryName.replace(/\//g, '_')}`);
      fs.writeFileSync(rawPath, imageData);

      // Assign to first page without a screenshot
      for (const page of pages.values()) {
        if (!page.screenshot) {
          const optimizedPath = path.join(outputDir, `${page.id}.webp`);
          try {
            await optimizeScreenshot(rawPath, optimizedPath);
            page.screenshot = path.relative(process.cwd(), optimizedPath);
          } catch {
            /* skip */
          }
          break;
        }
      }

      try {
        fs.unlinkSync(rawPath);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.warn(`  Warning: Failed to extract screenshots from ${tracePath}: ${err}`);
  }
}
