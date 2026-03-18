# Record Flows Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `record-flows` command that runs standard Playwright tests from a user directory, captures step-by-step screenshots via trace parsing, and merges with existing nav-map.json.

**Architecture:** Extract trace parsing into a shared `trace-parser.ts` module (used by both `record` and `record-flows`). The new command generates a temporary Playwright config, runs tests, parses trace ZIPs for navigation + action events, correlates screenshots via `screencast-frame` entries, and assembles flows with galleries.

**Tech Stack:** Playwright (test runner, trace format), adm-zip (trace ZIP parsing), Node.js (execFileSync, fs, path)

**Spec:** `docs/superpowers/specs/2026-03-18-record-flows-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `packages/core/src/types.ts` | Add `NavMapFlowStep`, `NavMapFlowGallery`, update `NavMapFlow` | Modify |
| `packages/scanner/src/modes/trace-parser.ts` | Parse trace ZIPs: navigation, actions, screencast-frame correlation | Create |
| `packages/scanner/src/modes/record.ts` | Refactor to use shared trace-parser | Modify |
| `packages/scanner/src/modes/record-flows.ts` | Discover tests, generate config, run, parse, merge | Create |
| `packages/scanner/src/cli.ts` | Add `record-flows` command | Modify |
| `packages/scanner/src/index.ts` | Export new functions | Modify |

---

## Task 1: Update types

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Add flow step and gallery types**

In `packages/core/src/types.ts`, after the existing `NavMapFlow` interface (line 32), replace it with:

```typescript
export interface NavMapFlowStep {
  action: 'goto' | 'waitFor' | 'click' | 'fill' | 'end';
  title: string;
  screenshot?: string;
  timestamp?: number;
}

export interface NavMapFlowGallery {
  [nodeId: string]: NavMapFlowStep[];
}

export interface NavMapFlow {
  name: string;
  steps: string[];
  gallery?: NavMapFlowGallery;
  partial?: boolean;
}
```

- [ ] **Step 2: Update core exports**

In `packages/core/src/index.ts`, add to the types export block:

```typescript
NavMapFlowStep,
NavMapFlowGallery,
```

- [ ] **Step 3: Build core to verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat: add NavMapFlowStep and NavMapFlowGallery types"
```

---

## Task 2: Create shared trace parser

**Files:**
- Create: `packages/scanner/src/modes/trace-parser.ts`

- [ ] **Step 1: Create trace-parser.ts**

This module extracts navigation events, action events, and correlates screenshots from Playwright trace ZIPs.

```typescript
import path from 'node:path';
import fs from 'node:fs';

export interface TraceNavEvent {
  url: string;
  timestamp: number;
}

export interface TraceActionEvent {
  action: 'goto' | 'waitFor' | 'click' | 'fill' | 'end';
  title: string;
  timestamp: number;
  url?: string;
}

export interface TraceScreenshot {
  sha1: string;
  timestamp: number;
}

export interface TraceParseResult {
  navigations: TraceNavEvent[];
  actions: TraceActionEvent[];
  screenshots: TraceScreenshot[];
}

/**
 * Parse a Playwright trace ZIP for navigation events, action events,
 * and screencast-frame entries.
 */
export async function parseTrace(tracePath: string): Promise<TraceParseResult> {
  const navigations: TraceNavEvent[] = [];
  const actions: TraceActionEvent[] = [];
  const screenshots: TraceScreenshot[] = [];

  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(tracePath);

    for (const entry of zip.getEntries()) {
      if (!entry.entryName.endsWith('.trace')) continue;

      const content = entry.getData().toString('utf-8');
      for (const line of content.split('\n').filter(Boolean)) {
        try {
          const event = JSON.parse(line);

          // Navigation: Frame.goto
          if (event.class === 'Frame' && event.method === 'goto' && event.params?.url) {
            const url = event.params.url;
            const ts = event.startTime ?? 0;
            navigations.push({ url, timestamp: ts });
            actions.push({ action: 'goto', title: `Navigate to ${url}`, timestamp: ts, url });
          }

          // Navigate title in test.trace
          if (event.title && /^Navigate to /.test(event.title) && event.params?.url) {
            const url = event.params.url;
            navigations.push({ url, timestamp: event.startTime ?? 0 });
          }

          // waitFor* events — key moments
          if (event.class === 'Locator' && event.method?.startsWith('waitFor')) {
            actions.push({
              action: 'waitFor',
              title: event.title ?? `waitFor ${event.method}`,
              timestamp: event.startTime ?? 0,
            });
          }
          if (event.class === 'Frame' && event.method === 'waitForSelector') {
            actions.push({
              action: 'waitFor',
              title: event.title ?? 'waitForSelector',
              timestamp: event.startTime ?? 0,
            });
          }

          // Expect/assertion waits (toBeVisible, toHaveURL, etc.)
          if (event.class === 'Expect' || event.title?.startsWith('expect.')) {
            actions.push({
              action: 'waitFor',
              title: event.title ?? `expect ${event.method}`,
              timestamp: event.startTime ?? 0,
            });
          }

          // Click events
          if (event.class === 'Locator' && event.method === 'click') {
            actions.push({
              action: 'click',
              title: event.title ?? 'click',
              timestamp: event.startTime ?? 0,
            });
          }

          // Fill events
          if (event.class === 'Locator' && event.method === 'fill') {
            actions.push({
              action: 'fill',
              title: event.title ?? 'fill',
              timestamp: event.startTime ?? 0,
            });
          }

          // Screencast frames — screenshots correlated by timestamp
          if (event.type === 'screencast-frame' && event.sha1 && event.timestamp) {
            screenshots.push({ sha1: event.sha1, timestamp: event.timestamp });
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  } catch (err) {
    console.warn(`  Warning: Failed to parse trace ${tracePath}: ${err}`);
  }

  // Sort all by timestamp
  actions.sort((a, b) => a.timestamp - b.timestamp);
  screenshots.sort((a, b) => a.timestamp - b.timestamp);

  return { navigations, actions, screenshots };
}

/**
 * For each key action, find the nearest screenshot taken AFTER that action.
 * Returns a map of action index → screenshot sha1.
 */
export function correlateScreenshots(
  actions: TraceActionEvent[],
  screenshots: TraceScreenshot[]
): Map<number, string> {
  const result = new Map<number, string>();
  if (screenshots.length === 0) return result;

  // Only correlate key moments: goto, waitFor, end
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.action !== 'goto' && action.action !== 'waitFor' && action.action !== 'end') {
      continue;
    }

    // Find nearest screenshot with timestamp >= action timestamp
    let best: TraceScreenshot | null = null;
    for (const ss of screenshots) {
      if (ss.timestamp >= action.timestamp) {
        best = ss;
        break;
      }
    }
    // If no screenshot after, use the last one
    if (!best && screenshots.length > 0) {
      best = screenshots[screenshots.length - 1];
    }
    if (best) {
      result.set(i, best.sha1);
    }
  }

  return result;
}

/**
 * Extract a screenshot image from a trace ZIP by sha1 hash.
 * Saves to outputDir and returns the file path.
 */
export async function extractScreenshotBySha1(
  tracePath: string,
  sha1: string,
  outputDir: string,
  filename: string
): Promise<string | null> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(tracePath);

    // Screenshots stored as resources/<sha1> or resources/<sha1>.jpeg
    for (const entry of zip.getEntries()) {
      if (entry.entryName.includes(sha1)) {
        const ext = entry.entryName.endsWith('.jpeg') ? '.jpeg' : '.png';
        const outPath = path.join(outputDir, `${filename}${ext}`);
        fs.writeFileSync(outPath, entry.getData());
        return outPath;
      }
    }
  } catch (err) {
    console.warn(`  Warning: Could not extract screenshot ${sha1}: ${err}`);
  }
  return null;
}
```

- [ ] **Step 2: Build scanner to verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map-scanner build`

- [ ] **Step 3: Commit**

```bash
git add packages/scanner/src/modes/trace-parser.ts
git commit -m "feat: add shared trace parser for navigation, actions, and screenshot correlation"
```

---

## Task 3: Refactor record.ts to use shared trace parser

**Files:**
- Modify: `packages/scanner/src/modes/record.ts`

- [ ] **Step 1: Replace inline parseTraceNavigation with shared trace-parser**

At the top of `record.ts`, add import:

```typescript
import { parseTrace } from './trace-parser.js';
```

Replace the call to the inline `parseTraceNavigation` function (around line 138):

```typescript
// Before:
const events = await parseTraceNavigation(trace.tracePath);

// After:
const { navigations } = await parseTrace(trace.tracePath);
const events = navigations.map(n => ({ url: n.url, timestamp: n.timestamp }));
```

Delete the inline `parseTraceNavigation` function (lines 245-280) and the inline `extractScreenshotsFromTrace` function (lines 282-320) — they're replaced by the shared module.

For screenshot extraction, replace the old `extractScreenshotsFromTrace` call with:

```typescript
// After trace parsing in the loop, extract the last screenshot for each page
const { screenshots: traceScreenshots } = await parseTrace(trace.tracePath);
if (traceScreenshots.length > 0) {
  const lastScreenshot = traceScreenshots[traceScreenshots.length - 1];
  // Find which page this trace visited
  for (const page of pages.values()) {
    if (!page.screenshot) {
      const extracted = await extractScreenshotBySha1(
        trace.tracePath, lastScreenshot.sha1, screenshotDirAbs, page.id
      );
      if (extracted) {
        page.screenshot = path.relative(process.cwd(), extracted);
      }
      break;
    }
  }
}
```

Add import for `extractScreenshotBySha1`:

```typescript
import { parseTrace, extractScreenshotBySha1 } from './trace-parser.js';
```

- [ ] **Step 2: Remove single-page flow guard for record-flows compatibility**

In `record.ts` around line 192, change:

```typescript
if (flowSteps.length >= 2) {
```

to:

```typescript
if (flowSteps.length >= 1) {
```

This allows single-page flows to be recorded.

- [ ] **Step 3: Build and verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map-scanner build`

- [ ] **Step 4: Commit**

```bash
git add packages/scanner/src/modes/record.ts
git commit -m "refactor: use shared trace-parser in record command, allow single-page flows"
```

---

## Task 4: Create record-flows command

**Files:**
- Create: `packages/scanner/src/modes/record-flows.ts`
- Modify: `packages/scanner/src/cli.ts`
- Modify: `packages/scanner/src/index.ts`

- [ ] **Step 1: Create record-flows.ts**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { glob } from 'glob';
import {
  normalizeRoute,
  isLoginPage,
  loadRoutePatterns,
  type RoutePattern,
} from './dedup.js';
import {
  parseTrace,
  correlateScreenshots,
  extractScreenshotBySha1,
} from './trace-parser.js';
import type { NavMapFlowStep, NavMapFlowGallery } from '../../../core/src/types.js';

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
  groups: {
    id: string;
    label: string;
    color?: string;
    routePrefix?: string;
  }[];
  flows?: {
    name: string;
    steps: string[];
    gallery?: NavMapFlowGallery;
    partial?: boolean;
  }[];
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

export async function recordFlows(
  options: RecordFlowsOptions
): Promise<NavMapGraph> {
  const {
    flowsDir,
    baseUrl,
    storageState,
    routesJson,
    screenshotDir,
    name,
    failOnTestErrors = false,
  } = options;

  const flowsDirAbs = path.resolve(flowsDir);
  const screenshotDirAbs = path.resolve(screenshotDir);
  fs.mkdirSync(screenshotDirAbs, { recursive: true });

  // Load route patterns if provided
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

  // Resolve cwd — follow symlinks to find the original project root
  let cwd = flowsDirAbs;
  try {
    const firstTestReal = fs.realpathSync(path.join(flowsDirAbs, testFiles[0]));
    // Walk up from the real path to find package.json
    let dir = path.dirname(firstTestReal);
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        cwd = dir;
        break;
      }
      dir = path.dirname(dir);
    }
  } catch {
    // Fallback to flows dir
  }
  console.log(`Working directory: ${cwd}`);

  // Generate temp Playwright config
  const reporterPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    'reporter.js'
  );

  const tempConfig = path.join(screenshotDirAbs, '_temp-playwright.config.ts');
  const configContent = `
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '${flowsDirAbs.replace(/\\/g, '/')}',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['${reporterPath.replace(/\\/g, '/')}', { outputDir: '${screenshotDirAbs.replace(/\\/g, '/')}' }]],
  timeout: 120_000,
  use: {
    baseURL: '${baseUrl}',
    ${storageState ? `storageState: '${path.resolve(storageState).replace(/\\/g, '/')}',` : ''}
    trace: 'on',
    screenshot: 'on',
  },
});
`;
  fs.writeFileSync(tempConfig, configContent);

  // Run tests
  console.log(`\nRunning Playwright tests...`);
  let testsFailed = false;
  try {
    execFileSync('npx', ['playwright', 'test', '--config', tempConfig], {
      stdio: 'inherit',
      cwd,
      timeout: 10 * 60 * 1000,
      killSignal: 'SIGTERM',
    });
  } catch {
    testsFailed = true;
    if (failOnTestErrors) {
      throw new Error('Tests failed and --fail-on-test-errors is set');
    }
    console.warn('\nSome tests failed — continuing with available traces.\n');
  }

  // Clean up temp config
  try { fs.unlinkSync(tempConfig); } catch { /* ignore */ }

  // Read reporter manifest
  const manifestPath = path.join(screenshotDirAbs, '.nav-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Reporter manifest not found at ${manifestPath}. Ensure Playwright ran correctly.`
    );
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`\nProcessing ${manifest.traces.length} trace(s)...`);

  // Parse traces and build flows
  const pages = new Map<string, NavMapGraph['nodes'][0]>();
  const edgeSet = new Map<string, { source: string; target: string; visitCount: number }>();
  const flows: NavMapGraph['flows'] = [];

  for (const trace of manifest.traces) {
    if (!fs.existsSync(trace.tracePath)) {
      console.warn(`  Trace not found: ${trace.tracePath}`);
      continue;
    }

    console.log(`  Parsing: ${trace.testName}`);
    const { navigations, actions, screenshots } = await parseTrace(trace.tracePath);

    // Add 'end' action
    const lastTs = actions.length > 0
      ? actions[actions.length - 1].timestamp + 1
      : 0;
    actions.push({ action: 'end', title: 'Test complete', timestamp: lastTs });

    // Correlate screenshots with key actions
    const ssMap = correlateScreenshots(actions, screenshots);

    // Track pages visited and build gallery
    const flowSteps: string[] = [];
    const gallery: NavMapFlowGallery = {};
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
        } catch { continue; }

        if (isLoginPage(action.url)) continue;

        const normalized = normalizeRoute(pathname, routePatterns);
        if (!normalized) continue;

        // Record page
        if (!pages.has(normalized.id)) {
          pages.set(normalized.id, {
            id: normalized.id,
            route: normalized.route,
            label: normalized.label,
            group: normalized.group,
          });
        }

        // Record edge
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
          const filename = `${trace.testName.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}-step-${String(stepCounter).padStart(2, '0')}`;
          const extracted = await extractScreenshotBySha1(
            trace.tracePath, sha1, screenshotDirAbs, filename
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

        // Update page screenshot to the latest key-moment capture
        if (screenshotPath && currentNodeId) {
          const page = pages.get(currentNodeId);
          if (page) page.screenshot = screenshotPath;
        }
      }
    }

    // Record flow (single-page flows are valid)
    if (flowSteps.length >= 1) {
      flows.push({
        name: trace.testName,
        steps: flowSteps,
        gallery: Object.keys(gallery).length > 0 ? gallery : undefined,
        partial: trace.status === 'failed' ? true : undefined,
      });
    }
  }

  console.log(`\nDiscovered ${pages.size} page(s), ${edgeSet.size} edge(s), ${flows.length} flow(s)`);

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

  // Assemble graph
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

  // Merge with existing graph if provided
  if (existingGraph) {
    graph = mergeGraphs(existingGraph, graph);
  }

  return graph;
}

function mergeGraphs(existing: NavMapGraph, recorded: NavMapGraph): NavMapGraph {
  const merged = { ...existing };

  // Merge pages: update screenshots, add new pages
  const existingNodeMap = new Map(existing.nodes.map(n => [n.id, n]));
  for (const node of recorded.nodes) {
    const existingNode = existingNodeMap.get(node.id);
    if (existingNode) {
      if (node.screenshot) existingNode.screenshot = node.screenshot;
    } else {
      merged.nodes.push(node);
    }
  }

  // Merge edges: add new, deduplicate
  const existingEdgeKeys = new Set(existing.edges.map(e => `${e.source}->${e.target}`));
  for (const edge of recorded.edges) {
    const key = `${edge.source}->${edge.target}`;
    if (!existingEdgeKeys.has(key)) {
      merged.edges.push(edge);
      existingEdgeKeys.add(key);
    }
  }

  // Merge flows: replace by name, add new
  const existingFlows = merged.flows ?? [];
  for (const flow of recorded.flows ?? []) {
    const idx = existingFlows.findIndex(f => f.name === flow.name);
    if (idx >= 0) {
      existingFlows[idx] = flow;
    } else {
      existingFlows.push(flow);
    }
  }
  merged.flows = existingFlows.length > 0 ? existingFlows : undefined;

  return merged;
}
```

- [ ] **Step 2: Add `record-flows` command to cli.ts**

In `packages/scanner/src/cli.ts`, add import:

```typescript
import { recordFlows } from './modes/record-flows.js';
```

Add the command before `program.parse()`:

```typescript
program
  .command('record-flows')
  .description('Run Playwright tests from a flows directory and record navigation with screenshots')
  .requiredOption('--flows-dir <dir>', 'Directory containing Playwright .spec.ts test files')
  .requiredOption('--base-url <url>', 'Base URL for the app under test')
  .option('--storage-state <path>', 'Path to auth storage state file')
  .option('--routes <path>', 'Path to existing nav-map.json to merge with')
  .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
  .option('-o, --output <path>', 'Output file path', 'nav-map.json')
  .option('-n, --name <name>', 'Project name for the graph')
  .option('--fail-on-test-errors', 'Exit non-zero if any tests fail')
  .action(async (opts) => {
    console.log('Recording flows from Playwright tests...\n');

    try {
      const graph = await recordFlows({
        flowsDir: opts.flowsDir,
        baseUrl: opts.baseUrl,
        storageState: opts.storageState,
        routesJson: opts.routes,
        screenshotDir: opts.screenshotDir,
        output: opts.output,
        name: opts.name,
        failOnTestErrors: opts.failOnTestErrors,
      });

      const outputPath = path.resolve(opts.output);
      fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
      console.log(`\nWrote ${outputPath}`);
      console.log(`  Nodes: ${graph.nodes.length}`);
      console.log(`  Edges: ${graph.edges.length}`);
      console.log(`  Groups: ${graph.groups.length}`);
      console.log(`  Flows: ${graph.flows?.length ?? 0}`);
    } catch (err) {
      console.error('Record-flows failed:', err);
      process.exit(1);
    }
  });
```

- [ ] **Step 3: Update index.ts exports**

```typescript
export { recordFlows } from './modes/record-flows.js';
export type { RecordFlowsOptions } from './modes/record-flows.js';
export { parseTrace, correlateScreenshots, extractScreenshotBySha1 } from './modes/trace-parser.js';
```

- [ ] **Step 4: Build both packages**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build && pnpm --filter @neonwatty/nav-map-scanner build`

- [ ] **Step 5: Verify CLI**

Run: `node packages/scanner/dist/cli.js record-flows --help`
Expected: Shows all options (--flows-dir, --base-url, --storage-state, --routes, etc.)

- [ ] **Step 6: Commit**

```bash
git add packages/scanner/src/modes/record-flows.ts packages/scanner/src/cli.ts packages/scanner/src/index.ts
git commit -m "feat: add record-flows command with trace parsing, galleries, and merge"
```

---

## Task 5: End-to-end test against bleep app

- [ ] **Step 1: Set up flows directory**

```bash
mkdir -p /tmp/bleep-flows
ln -sf /Users/jeremywatt/Desktop/bleep-that-shit/tests/live/studio-live.spec.ts /tmp/bleep-flows/
```

- [ ] **Step 2: Place auth state**

Ensure `/tmp/bleep-auth.json` exists from the previous auth export session.

- [ ] **Step 3: Run static scan first**

```bash
node packages/scanner/dist/cli.js scan /Users/jeremywatt/Desktop/bleep-that-shit -o /tmp/bleep-static.json
```

- [ ] **Step 4: Run record-flows**

```bash
node packages/scanner/dist/cli.js record-flows \
  --flows-dir /tmp/bleep-flows \
  --base-url https://bleepthat.sh \
  --storage-state /tmp/bleep-auth.json \
  --routes /tmp/bleep-static.json \
  --screenshot-dir /tmp/bleep-flow-screenshots \
  -o /tmp/bleep-with-flows.json \
  -n "Bleep That Sh*t!"
```

Expected: Output has 19+ nodes (from static scan merge), flows with gallery entries, screenshots captured.

- [ ] **Step 5: Verify output**

```bash
cat /tmp/bleep-with-flows.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'Nodes: {len(d[\"nodes\"])}')
print(f'Edges: {len(d[\"edges\"])}')
print(f'Flows: {len(d.get(\"flows\", []))}')
for f in d.get('flows', []):
    gallery_count = sum(len(v) for v in (f.get('gallery') or {}).values())
    print(f'  Flow: {f[\"name\"]} — {len(f[\"steps\"])} page(s), {gallery_count} gallery step(s)')
"
```

- [ ] **Step 6: Push**

```bash
git push origin main
```
