# Test Coverage Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright trace ingestion, graph merging, and a coverage heatmap overlay to nav-map, validated end-to-end against mean-weasel/deckchecker.

**Architecture:** New `nav-map ingest` CLI command in `packages/scanner` parses Playwright JSON reports + trace ZIPs, extracts routes/screenshots/actions, and merges with a base nav-map graph. The existing `NavMap` component in `packages/core` gains a coverage overlay (node coloring, summary panel, test details). The existing `serve` command is extended to serve the enriched data.

**Tech Stack:** TypeScript, Vitest, Commander (CLI), adm-zip (trace extraction), sharp (screenshot optimization), React + @xyflow/react (canvas)

---

## File Structure

### packages/scanner (new files)

| File | Responsibility |
|------|---------------|
| `src/modes/ingest.ts` | Main `ingest` function — orchestrates trace parsing and optional merge |
| `src/ingest/parseReport.ts` | Parse Playwright JSON report into structured test run metadata |
| `src/ingest/parseTrace.ts` | Parse a single trace ZIP — extract routes, actions, screencast frames |
| `src/ingest/extractScreenshots.ts` | Extract and optimize screenshots from trace resources using sharp |
| `src/ingest/routeMatcher.ts` | Match test-discovered routes to base graph nodes (exact + pattern) |
| `src/ingest/mergeGraph.ts` | Merge base NavMapGraph with test coverage data |
| `src/__tests__/parseReport.test.ts` | Tests for JSON report parsing |
| `src/__tests__/parseTrace.test.ts` | Tests for trace ZIP parsing |
| `src/__tests__/routeMatcher.test.ts` | Tests for route matching logic |
| `src/__tests__/mergeGraph.test.ts` | Tests for graph merge logic |
| `src/__tests__/fixtures/` | Test fixtures (sample JSON report, minimal trace ZIP) |

### packages/core (modified files)

| File | Change |
|------|--------|
| `src/types.ts` | Add `'test-transition'` to edge type union, add `'merged'` to generatedBy, add `CoverageData` interface |
| `src/utils/validateGraph.ts` | Accept new edge type and generatedBy values |
| `src/hooks/useNavMap.ts` | Add `showCoverage` / `setShowCoverage` to context |
| `src/components/nodes/PageNode.tsx` | Render coverage badge when overlay is active |
| `src/components/nodes/CompactNode.tsx` | Render coverage badge when overlay is active |
| `src/components/panels/NavMapToolbar.tsx` | Add coverage toggle button |
| `src/components/panels/CoverageSummary.tsx` | New panel showing coverage stats |
| `src/components/NavMap.tsx` | Wire coverage state, pass to toolbar, render summary panel |
| `src/index.ts` | Export new types and CoverageSummary |

---

## Task 1: Extend NavMapGraph Types

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Add coverage types and extend unions**

In `packages/core/src/types.ts`, add the `CoverageData` interface and extend the existing unions:

```typescript
// Add after NavMapFlowGallery interface (line 42)

export interface CoverageTestRef {
  id: string;
  name: string;
  specFile: string;
  status: 'passed' | 'failed' | 'skipped';
}

export interface CoverageData {
  status: 'covered' | 'failing' | 'uncovered';
  testCount: number;
  passCount: number;
  failCount: number;
  tests: CoverageTestRef[];
  lastRun: string;
}
```

Update the `NavMapEdge.type` union (currently line 16):
```typescript
type: 'link' | 'redirect' | 'router-push' | 'shared-nav' | 'test-transition';
```

Update the `NavMapGraph.meta.generatedBy` (currently line 60):
```typescript
generatedBy: 'repo-scan' | 'url-crawl' | 'manual' | 'e2e-record' | 'merged';
```

- [ ] **Step 2: Run typecheck**

Run: `cd packages/core && pnpm typecheck`
Expected: PASS (new types are additive, nothing consumes them yet)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): add CoverageData types and extend edge/generatedBy unions"
```

---

## Task 2: Update Graph Validation

**Files:**
- Modify: `packages/core/src/utils/validateGraph.ts`
- Test: `packages/core/src/utils/validateGraph.test.ts`

- [ ] **Step 1: Write test for new edge type acceptance**

In `packages/core/src/utils/validateGraph.test.ts`, add a test case (append to the existing test file):

```typescript
import { describe, it, expect } from 'vitest';
import { validateGraph } from './validateGraph';

describe('validateGraph with coverage data', () => {
  const baseGraph = {
    version: '1.0',
    meta: { name: 'test', generatedAt: '2026-01-01', generatedBy: 'merged' },
    nodes: [
      { id: 'home', route: '/', label: 'Home', group: 'marketing' },
      { id: 'about', route: '/about', label: 'About', group: 'marketing' },
    ],
    edges: [
      { id: 'e1', source: 'home', target: 'about', type: 'test-transition' },
    ],
    groups: [{ id: 'marketing', label: 'Marketing' }],
  };

  it('accepts generatedBy "merged"', () => {
    const result = validateGraph(baseGraph);
    expect(result.valid).toBe(true);
  });

  it('accepts edge type "test-transition"', () => {
    const result = validateGraph(baseGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts nodes with coverage metadata', () => {
    const graph = {
      ...baseGraph,
      nodes: [
        {
          ...baseGraph.nodes[0],
          metadata: {
            coverage: {
              status: 'covered',
              testCount: 2,
              passCount: 2,
              failCount: 0,
              tests: [],
              lastRun: '2026-01-01T00:00:00Z',
            },
          },
        },
        baseGraph.nodes[1],
      ],
    };
    const result = validateGraph(graph);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- --run src/utils/validateGraph.test.ts`
Expected: PASS — the current validator doesn't restrict `meta.generatedBy` values or edge types, so these should already pass. If any fail, proceed to step 3. If all pass, skip step 3.

- [ ] **Step 3: Fix any validation restrictions (if needed)**

If the validator rejects new values, update `validateGraph.ts` to accept them. The current code doesn't validate `generatedBy` or `edge.type` values, so this step is likely a no-op.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/utils/validateGraph.test.ts packages/core/src/utils/validateGraph.ts
git commit -m "test(core): add validation tests for coverage data types"
```

---

## Task 3: Playwright JSON Report Parser

**Files:**
- Create: `packages/scanner/src/ingest/parseReport.ts`
- Create: `packages/scanner/src/__tests__/parseReport.test.ts`
- Create: `packages/scanner/src/__tests__/fixtures/sample-report.json`

- [ ] **Step 1: Create sample report fixture**

Create `packages/scanner/src/__tests__/fixtures/sample-report.json` — a minimal Playwright JSON report with 2 tests (1 passed, 1 failed), each with a trace attachment:

```json
{
  "config": {
    "rootDir": "/project",
    "projects": [
      { "name": "desktop", "testDir": "tests" }
    ]
  },
  "suites": [
    {
      "title": "core-admin.spec.ts",
      "file": "tests/core-admin.spec.ts",
      "line": 1,
      "column": 1,
      "specs": [
        {
          "title": "Admin dashboard loads",
          "ok": true,
          "id": "abc123",
          "file": "tests/core-admin.spec.ts",
          "line": 5,
          "column": 3,
          "tests": [
            {
              "timeout": 30000,
              "expectedStatus": "passed",
              "projectName": "desktop",
              "status": "expected",
              "results": [
                {
                  "status": "passed",
                  "duration": 4500,
                  "startTime": "2026-04-17T10:00:00.000Z",
                  "retry": 0,
                  "attachments": [
                    {
                      "name": "trace",
                      "contentType": "application/zip",
                      "path": "/project/test-results/core-admin-dashboard/trace.zip"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "title": "User management table",
          "ok": false,
          "id": "def456",
          "file": "tests/core-admin.spec.ts",
          "line": 20,
          "column": 3,
          "tests": [
            {
              "timeout": 30000,
              "expectedStatus": "passed",
              "projectName": "desktop",
              "status": "unexpected",
              "results": [
                {
                  "status": "failed",
                  "duration": 8200,
                  "startTime": "2026-04-17T10:01:00.000Z",
                  "retry": 0,
                  "attachments": [
                    {
                      "name": "trace",
                      "contentType": "application/zip",
                      "path": "/project/test-results/core-admin-users/trace.zip"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      "suites": []
    }
  ],
  "stats": {
    "startTime": "2026-04-17T10:00:00.000Z",
    "duration": 13000,
    "expected": 1,
    "unexpected": 1,
    "skipped": 0,
    "flaky": 0
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/scanner/src/__tests__/parseReport.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseReport, type TestRunMeta } from '../ingest/parseReport.js';
import sampleReport from './fixtures/sample-report.json';

describe('parseReport', () => {
  it('extracts test runs from a Playwright JSON report', () => {
    const runs = parseReport(sampleReport);
    expect(runs).toHaveLength(2);
  });

  it('extracts name, specFile, status, and duration for each run', () => {
    const runs = parseReport(sampleReport);
    const first = runs[0];
    expect(first.name).toBe('Admin dashboard loads');
    expect(first.specFile).toBe('tests/core-admin.spec.ts');
    expect(first.status).toBe('passed');
    expect(first.duration).toBe(4500);
  });

  it('extracts trace path from attachments', () => {
    const runs = parseReport(sampleReport);
    expect(runs[0].tracePath).toBe(
      '/project/test-results/core-admin-dashboard/trace.zip'
    );
  });

  it('marks failed tests correctly', () => {
    const runs = parseReport(sampleReport);
    const failed = runs.find(r => r.name === 'User management table');
    expect(failed?.status).toBe('failed');
  });

  it('generates a deterministic id from specFile + name', () => {
    const runs = parseReport(sampleReport);
    expect(runs[0].id).toBeTruthy();
    expect(runs[0].id).not.toBe(runs[1].id);

    // Same input should produce same id
    const runs2 = parseReport(sampleReport);
    expect(runs[0].id).toBe(runs2[0].id);
  });

  it('returns empty array for report with no suites', () => {
    const empty = { config: {}, suites: [], stats: {} };
    expect(parseReport(empty)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/parseReport.test.ts`
Expected: FAIL — `parseReport` doesn't exist yet.

- [ ] **Step 4: Implement parseReport**

Create `packages/scanner/src/ingest/parseReport.ts`:

```typescript
import { createHash } from 'node:crypto';

export interface TestRunMeta {
  id: string;
  name: string;
  specFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  startTime: string;
  tracePath: string | null;
}

interface ReportSpec {
  title: string;
  file: string;
  tests?: Array<{
    status: string;
    results?: Array<{
      status: string;
      duration: number;
      startTime: string;
      attachments?: Array<{
        name: string;
        contentType: string;
        path?: string;
      }>;
    }>;
  }>;
}

interface ReportSuite {
  title: string;
  file: string;
  specs?: ReportSpec[];
  suites?: ReportSuite[];
}

function makeId(specFile: string, name: string): string {
  return createHash('sha256').update(`${specFile}::${name}`).digest('hex').slice(0, 12);
}

function normalizeStatus(
  resultStatus: string
): 'passed' | 'failed' | 'skipped' {
  if (resultStatus === 'passed') return 'passed';
  if (resultStatus === 'skipped') return 'skipped';
  return 'failed';
}

function extractFromSuite(suite: ReportSuite): TestRunMeta[] {
  const runs: TestRunMeta[] = [];

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const result = test.results?.[0];
      if (!result) continue;

      const traceAttachment = result.attachments?.find(
        a => a.name === 'trace' && a.contentType === 'application/zip'
      );

      runs.push({
        id: makeId(spec.file, spec.title),
        name: spec.title,
        specFile: spec.file,
        status: normalizeStatus(result.status),
        duration: result.duration,
        startTime: result.startTime,
        tracePath: traceAttachment?.path ?? null,
      });
    }
  }

  for (const child of suite.suites ?? []) {
    runs.push(...extractFromSuite(child));
  }

  return runs;
}

export function parseReport(report: Record<string, unknown>): TestRunMeta[] {
  const suites = report.suites as ReportSuite[] | undefined;
  if (!Array.isArray(suites)) return [];

  const runs: TestRunMeta[] = [];
  for (const suite of suites) {
    runs.push(...extractFromSuite(suite));
  }
  return runs;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/parseReport.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/scanner/src/ingest/parseReport.ts packages/scanner/src/__tests__/parseReport.test.ts packages/scanner/src/__tests__/fixtures/sample-report.json
git commit -m "feat(scanner): add Playwright JSON report parser"
```

---

## Task 4: Trace ZIP Parser

**Files:**
- Create: `packages/scanner/src/ingest/parseTrace.ts`
- Create: `packages/scanner/src/__tests__/parseTrace.test.ts`
- Create: `packages/scanner/src/__tests__/fixtures/build-trace-fixture.ts` (helper script)

This is the most complex piece — parsing NDJSON from inside trace ZIPs to extract route transitions, actions, and screenshot references.

- [ ] **Step 1: Create a trace fixture builder**

Create `packages/scanner/src/__tests__/fixtures/build-trace-fixture.ts`. This builds a minimal in-memory ZIP matching the Playwright trace format:

```typescript
import AdmZip from 'adm-zip';

/**
 * Build a minimal Playwright trace ZIP in memory for testing.
 * Contains 0-trace.trace (NDJSON) with goto events and screencast frames,
 * plus stub resource files for screenshots.
 */
export function buildTraceFixture(options: {
  navigations: Array<{ url: string; timestamp: number }>;
  actions?: Array<{ method: string; params?: Record<string, unknown>; timestamp: number }>;
}): Buffer {
  const zip = new AdmZip();
  const lines: string[] = [];

  // Context options event (always first)
  lines.push(
    JSON.stringify({
      type: 'context-options',
      version: 8,
      origin: 'library',
      browserName: 'chromium',
      wallTime: Date.now(),
      monotonicTime: 0,
    })
  );

  let callIdx = 0;

  for (const nav of options.navigations) {
    const callId = `call@${callIdx++}`;
    lines.push(
      JSON.stringify({
        type: 'before',
        callId,
        startTime: nav.timestamp,
        class: 'Frame',
        method: 'goto',
        params: { url: nav.url },
        pageId: 'page@1',
      })
    );
    lines.push(
      JSON.stringify({
        type: 'after',
        callId,
        endTime: nav.timestamp + 500,
      })
    );
    // Screencast frame near this navigation
    const screenshotName = `page@1-${nav.timestamp + 600}.jpeg`;
    lines.push(
      JSON.stringify({
        type: 'screencast-frame',
        pageId: 'page@1',
        sha1: screenshotName,
        width: 1280,
        height: 800,
        timestamp: nav.timestamp + 600,
      })
    );
    // Add a stub screenshot resource
    zip.addFile(`resources/${screenshotName}`, Buffer.from('fake-jpeg'));
  }

  for (const action of options.actions ?? []) {
    const callId = `call@${callIdx++}`;
    lines.push(
      JSON.stringify({
        type: 'before',
        callId,
        startTime: action.timestamp,
        class: 'Locator',
        method: action.method,
        params: action.params ?? {},
        pageId: 'page@1',
      })
    );
    lines.push(
      JSON.stringify({
        type: 'after',
        callId,
        endTime: action.timestamp + 100,
      })
    );
  }

  zip.addFile('0-trace.trace', Buffer.from(lines.join('\n') + '\n'));
  return zip.toBuffer();
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/scanner/src/__tests__/parseTrace.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseTrace, type TraceResult } from '../ingest/parseTrace.js';
import { buildTraceFixture } from './fixtures/build-trace-fixture.js';

describe('parseTrace', () => {
  const traceBuffer = buildTraceFixture({
    navigations: [
      { url: 'http://localhost:3000/dashboard', timestamp: 1000 },
      { url: 'http://localhost:3000/settings', timestamp: 5000 },
      { url: 'http://localhost:3000/settings/billing', timestamp: 9000 },
    ],
    actions: [
      { method: 'click', params: { selector: 'text=Settings' }, timestamp: 4500 },
      { method: 'click', params: { selector: 'text=Billing' }, timestamp: 8500 },
    ],
  });

  it('extracts route transitions from goto events', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    expect(result.routes).toEqual(['/dashboard', '/settings', '/settings/billing']);
  });

  it('strips base URL from routes', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    for (const route of result.routes) {
      expect(route).not.toContain('http://localhost:3000');
      expect(route).toMatch(/^\//);
    }
  });

  it('extracts actions with timestamps', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    expect(result.actions.length).toBeGreaterThanOrEqual(5); // 3 gotos + 2 clicks
    const clicks = result.actions.filter(a => a.method === 'click');
    expect(clicks).toHaveLength(2);
  });

  it('extracts screencast frame references', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    expect(result.screenshots).toHaveLength(3);
    for (const s of result.screenshots) {
      expect(s.sha1).toMatch(/^page@/);
      expect(s.timestamp).toBeGreaterThan(0);
    }
  });

  it('returns empty routes for trace with no navigations', () => {
    const emptyTrace = buildTraceFixture({ navigations: [] });
    const result = parseTrace(emptyTrace, 'http://localhost:3000');
    expect(result.routes).toEqual([]);
  });

  it('handles missing base URL by keeping full paths', () => {
    const result = parseTrace(traceBuffer, '');
    expect(result.routes[0]).toBe('http://localhost:3000/dashboard');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/parseTrace.test.ts`
Expected: FAIL — `parseTrace` doesn't exist yet.

- [ ] **Step 4: Implement parseTrace**

Create `packages/scanner/src/ingest/parseTrace.ts`:

```typescript
import AdmZip from 'adm-zip';

export interface TraceAction {
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
  route?: string;
}

export interface TraceScreenshot {
  sha1: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface TraceResult {
  routes: string[];
  actions: TraceAction[];
  screenshots: TraceScreenshot[];
  resourceBuffers: Map<string, Buffer>;
}

interface TraceEvent {
  type: string;
  callId?: string;
  startTime?: number;
  endTime?: number;
  class?: string;
  method?: string;
  params?: Record<string, unknown>;
  pageId?: string;
  sha1?: string;
  width?: number;
  height?: number;
  timestamp?: number;
}

function stripBaseUrl(url: string, baseUrl: string): string {
  if (!baseUrl) return url;
  if (url.startsWith(baseUrl)) {
    const path = url.slice(baseUrl.length);
    return path.startsWith('/') ? path : `/${path}`;
  }
  return url;
}

export function parseTrace(traceBuffer: Buffer, baseUrl: string): TraceResult {
  const zip = new AdmZip(traceBuffer);
  const traceEntry = zip.getEntry('0-trace.trace');

  if (!traceEntry) {
    return { routes: [], actions: [], screenshots: [], resourceBuffers: new Map() };
  }

  const content = traceEntry.getData().toString('utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const routes: string[] = [];
  const actions: TraceAction[] = [];
  const screenshots: TraceScreenshot[] = [];
  let currentRoute: string | undefined;

  for (const line of lines) {
    let event: TraceEvent;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.type === 'before' && event.method === 'goto' && event.params?.url) {
      const route = stripBaseUrl(event.params.url as string, baseUrl);
      routes.push(route);
      currentRoute = route;
      actions.push({
        method: 'goto',
        params: { url: event.params.url },
        timestamp: event.startTime ?? 0,
        route,
      });
    } else if (event.type === 'before' && event.method && event.method !== 'goto') {
      actions.push({
        method: event.method,
        params: event.params ?? {},
        timestamp: event.startTime ?? 0,
        route: currentRoute,
      });
    } else if (event.type === 'screencast-frame') {
      screenshots.push({
        sha1: event.sha1 ?? '',
        timestamp: event.timestamp ?? 0,
        width: event.width ?? 0,
        height: event.height ?? 0,
      });
    }
  }

  // Extract resource buffers for screenshots
  const resourceBuffers = new Map<string, Buffer>();
  for (const s of screenshots) {
    const entry = zip.getEntry(`resources/${s.sha1}`);
    if (entry) {
      resourceBuffers.set(s.sha1, entry.getData());
    }
  }

  return { routes, actions, screenshots, resourceBuffers };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/parseTrace.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/scanner/src/ingest/parseTrace.ts packages/scanner/src/__tests__/parseTrace.test.ts packages/scanner/src/__tests__/fixtures/build-trace-fixture.ts
git commit -m "feat(scanner): add Playwright trace ZIP parser"
```

---

## Task 5: Screenshot Extraction

**Files:**
- Create: `packages/scanner/src/ingest/extractScreenshots.ts`
- Create: `packages/scanner/src/__tests__/extractScreenshots.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/scanner/src/__tests__/extractScreenshots.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { selectScreenshotForRoute } from '../ingest/extractScreenshots.js';
import type { TraceScreenshot } from '../ingest/parseTrace.js';

describe('selectScreenshotForRoute', () => {
  const screenshots: TraceScreenshot[] = [
    { sha1: 'frame-1000.jpeg', timestamp: 1000, width: 1280, height: 800 },
    { sha1: 'frame-1600.jpeg', timestamp: 1600, width: 1280, height: 800 },
    { sha1: 'frame-5000.jpeg', timestamp: 5000, width: 1280, height: 800 },
    { sha1: 'frame-5600.jpeg', timestamp: 5600, width: 1280, height: 800 },
    { sha1: 'frame-9600.jpeg', timestamp: 9600, width: 1280, height: 800 },
  ];

  it('selects the closest screenshot after a navigation timestamp', () => {
    const result = selectScreenshotForRoute(1000, screenshots);
    expect(result?.sha1).toBe('frame-1600.jpeg');
  });

  it('selects within a time window (default 2000ms)', () => {
    const result = selectScreenshotForRoute(1000, screenshots, 500);
    expect(result?.sha1).toBe('frame-1000.jpeg');
  });

  it('returns null if no screenshot within window', () => {
    const result = selectScreenshotForRoute(20000, screenshots);
    expect(result).toBeNull();
  });

  it('prefers screenshots after the navigation over before', () => {
    const result = selectScreenshotForRoute(5000, screenshots);
    expect(result?.sha1).toBe('frame-5600.jpeg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/extractScreenshots.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement screenshot selection**

Create `packages/scanner/src/ingest/extractScreenshots.ts`:

```typescript
import type { TraceScreenshot } from './parseTrace.js';

/**
 * Select the best screencast frame for a navigation event.
 * Prefers frames captured shortly after the navigation completes.
 *
 * @param navigationTimestamp - Monotonic timestamp of the goto event
 * @param screenshots - All screencast frames from the trace
 * @param windowMs - Maximum time gap to consider (default 2000ms)
 */
export function selectScreenshotForRoute(
  navigationTimestamp: number,
  screenshots: TraceScreenshot[],
  windowMs = 2000
): TraceScreenshot | null {
  // Find screenshots within the window after navigation
  const afterNav = screenshots.filter(
    s => s.timestamp >= navigationTimestamp && s.timestamp <= navigationTimestamp + windowMs
  );

  if (afterNav.length > 0) {
    // Pick the closest one after navigation
    afterNav.sort((a, b) => a.timestamp - b.timestamp);
    return afterNav[0];
  }

  // Fallback: closest screenshot before navigation within window
  const beforeNav = screenshots.filter(
    s => s.timestamp < navigationTimestamp && s.timestamp >= navigationTimestamp - windowMs
  );

  if (beforeNav.length > 0) {
    beforeNav.sort((a, b) => b.timestamp - a.timestamp);
    return beforeNav[0];
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/extractScreenshots.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/scanner/src/ingest/extractScreenshots.ts packages/scanner/src/__tests__/extractScreenshots.test.ts
git commit -m "feat(scanner): add screenshot selection for route transitions"
```

---

## Task 6: Route Matcher

**Files:**
- Create: `packages/scanner/src/ingest/routeMatcher.ts`
- Create: `packages/scanner/src/__tests__/routeMatcher.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/scanner/src/__tests__/routeMatcher.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { matchRoute, type RouteMatchResult } from '../ingest/routeMatcher.js';
import type { NavMapNode } from '@neonwatty/nav-map';

describe('matchRoute', () => {
  const baseNodes: NavMapNode[] = [
    { id: 'home', route: '/', label: 'Home', group: 'marketing' },
    { id: 'dashboard', route: '/dashboard', label: 'Dashboard', group: 'app' },
    { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
    { id: 'settings-billing', route: '/settings/billing', label: 'Billing', group: 'app' },
    { id: 'event-detail', route: '/events/[id]', label: 'Event Detail', group: 'events' },
    { id: 'event-edit', route: '/events/[id]/edit', label: 'Edit Event', group: 'events' },
  ];

  it('exact match for static routes', () => {
    const result = matchRoute('/dashboard', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('dashboard');
  });

  it('matches with trailing slash normalization', () => {
    const result = matchRoute('/dashboard/', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('dashboard');
  });

  it('pattern match for dynamic routes', () => {
    const result = matchRoute('/events/abc123', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('event-detail');
  });

  it('pattern match for nested dynamic routes', () => {
    const result = matchRoute('/events/abc123/edit', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('event-edit');
  });

  it('returns unmatched for unknown routes', () => {
    const result = matchRoute('/totally-unknown', baseNodes);
    expect(result.matched).toBe(false);
    expect(result.nodeId).toBeNull();
  });

  it('case insensitive matching', () => {
    const result = matchRoute('/Dashboard', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('dashboard');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/routeMatcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement route matcher**

Create `packages/scanner/src/ingest/routeMatcher.ts`:

```typescript
export interface RouteMatchResult {
  matched: boolean;
  nodeId: string | null;
}

interface NodeLike {
  id: string;
  route: string;
}

function normalize(route: string): string {
  let r = route.toLowerCase();
  // Remove trailing slash (but keep root /)
  if (r.length > 1 && r.endsWith('/')) {
    r = r.slice(0, -1);
  }
  return r;
}

/**
 * Convert a Next.js-style route pattern like /events/[id]/edit
 * into a regex that matches /events/anything/edit
 */
function routeToRegex(routePattern: string): RegExp {
  const escaped = routePattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex chars
    .replace(/\\\[\\*\\\]/g, '.*') // [...] catch-all
    .replace(/\\\[[^\]]+\\\]/g, '[^/]+'); // [param] → one segment
  return new RegExp(`^${escaped}$`, 'i');
}

export function matchRoute(route: string, nodes: NodeLike[]): RouteMatchResult {
  const normalizedRoute = normalize(route);

  // Pass 1: exact match
  for (const node of nodes) {
    if (normalize(node.route) === normalizedRoute) {
      return { matched: true, nodeId: node.id };
    }
  }

  // Pass 2: pattern match (dynamic routes with [param])
  for (const node of nodes) {
    if (!node.route.includes('[')) continue;
    const regex = routeToRegex(normalize(node.route));
    if (regex.test(normalizedRoute)) {
      return { matched: true, nodeId: node.id };
    }
  }

  return { matched: false, nodeId: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/routeMatcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/scanner/src/ingest/routeMatcher.ts packages/scanner/src/__tests__/routeMatcher.test.ts
git commit -m "feat(scanner): add route matcher for test-to-graph node correlation"
```

---

## Task 7: Graph Merge

**Files:**
- Create: `packages/scanner/src/ingest/mergeGraph.ts`
- Create: `packages/scanner/src/__tests__/mergeGraph.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/scanner/src/__tests__/mergeGraph.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mergeGraph } from '../ingest/mergeGraph.js';
import type { NavMapGraph } from '@neonwatty/nav-map';

describe('mergeGraph', () => {
  const baseGraph: NavMapGraph = {
    version: '1.0',
    meta: {
      name: 'test-app',
      generatedAt: '2026-04-17T00:00:00Z',
      generatedBy: 'repo-scan',
    },
    nodes: [
      { id: 'home', route: '/', label: 'Home', group: 'marketing' },
      { id: 'dashboard', route: '/dashboard', label: 'Dashboard', group: 'app' },
      { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
      { id: 'about', route: '/about', label: 'About', group: 'marketing' },
    ],
    edges: [
      { id: 'e1', source: 'home', target: 'dashboard', type: 'link' },
    ],
    groups: [
      { id: 'marketing', label: 'Marketing' },
      { id: 'app', label: 'App' },
    ],
  };

  const testCoverage = {
    testRuns: [
      {
        id: 'run1',
        name: 'Dashboard test',
        specFile: 'tests/admin.spec.ts',
        status: 'passed' as const,
        duration: 3000,
        startTime: '2026-04-17T10:00:00Z',
        routesVisited: ['/', '/dashboard', '/settings'],
        flow: {
          name: 'Dashboard test',
          steps: ['home', 'dashboard', 'settings'],
          gallery: {},
        },
      },
    ],
    routeCoverage: {
      '/': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [{ id: 'run1', name: 'Dashboard test', specFile: 'tests/admin.spec.ts', status: 'passed' }],
        lastRun: '2026-04-17T10:00:00Z',
      },
      '/dashboard': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [{ id: 'run1', name: 'Dashboard test', specFile: 'tests/admin.spec.ts', status: 'passed' }],
        lastRun: '2026-04-17T10:00:00Z',
      },
      '/settings': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [{ id: 'run1', name: 'Dashboard test', specFile: 'tests/admin.spec.ts', status: 'passed' }],
        lastRun: '2026-04-17T10:00:00Z',
      },
      '/profile': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [{ id: 'run1', name: 'Dashboard test', specFile: 'tests/admin.spec.ts', status: 'passed' }],
        lastRun: '2026-04-17T10:00:00Z',
      },
    },
  };

  it('annotates matched nodes with coverage data', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const dashboard = merged.nodes.find(n => n.id === 'dashboard');
    expect(dashboard?.metadata?.coverage).toBeDefined();
    expect((dashboard?.metadata?.coverage as { status: string }).status).toBe('covered');
  });

  it('marks unmatched base nodes as uncovered', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const about = merged.nodes.find(n => n.id === 'about');
    expect((about?.metadata?.coverage as { status: string }).status).toBe('uncovered');
  });

  it('adds new nodes for test-discovered routes', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const profile = merged.nodes.find(n => n.route === '/profile');
    expect(profile).toBeDefined();
    expect(profile?.metadata?.discoveredBy).toBe('test');
  });

  it('adds test-transition edges for route sequences', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const testEdges = merged.edges.filter(e => e.type === 'test-transition');
    // dashboard → settings is a new transition not in base graph
    const dashToSettings = testEdges.find(
      e => e.source === 'dashboard' && e.target === 'settings'
    );
    expect(dashToSettings).toBeDefined();
  });

  it('does not duplicate edges already in base graph', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const homeToDb = merged.edges.filter(
      e => e.source === 'home' && e.target === 'dashboard'
    );
    // Should have the original link edge, not a duplicate test-transition
    expect(homeToDb).toHaveLength(1);
    expect(homeToDb[0].type).toBe('link');
  });

  it('populates flows from test runs', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    expect(merged.flows).toHaveLength(1);
    expect(merged.flows?.[0].name).toBe('Dashboard test');
  });

  it('sets meta.generatedBy to merged', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    expect(merged.meta.generatedBy).toBe('merged');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/mergeGraph.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement mergeGraph**

Create `packages/scanner/src/ingest/mergeGraph.ts`:

```typescript
import type { NavMapGraph, NavMapNode, NavMapEdge, NavMapFlow, CoverageData, CoverageTestRef } from '@neonwatty/nav-map';
import { matchRoute } from './routeMatcher.js';

export interface TestRunCoverage {
  id: string;
  name: string;
  specFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  startTime: string;
  routesVisited: string[];
  flow: {
    name: string;
    steps: string[];
    gallery: Record<string, Array<{ action: string; title: string; screenshot?: string; timestamp?: number }>>;
  };
}

export interface RouteCoverageEntry {
  testCount: number;
  passCount: number;
  failCount: number;
  tests: CoverageTestRef[];
  lastRun: string;
}

export interface TestCoverageData {
  testRuns: TestRunCoverage[];
  routeCoverage: Record<string, RouteCoverageEntry>;
}

function makeCoverageStatus(entry: RouteCoverageEntry): CoverageData['status'] {
  if (entry.failCount > 0) return 'failing';
  return 'covered';
}

function routeToId(route: string): string {
  return route
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[[\]]/g, '')
    || 'home';
}

export function mergeGraph(
  base: NavMapGraph,
  coverage: TestCoverageData
): NavMapGraph {
  const nodes: NavMapNode[] = base.nodes.map(n => ({ ...n, metadata: { ...n.metadata } }));
  const edges: NavMapEdge[] = [...base.edges];
  const flows: NavMapFlow[] = [...(base.flows ?? [])];

  // Build edge lookup for dedup
  const edgeSet = new Set(edges.map(e => `${e.source}→${e.target}`));

  // Build node-by-route lookup
  const nodeByRoute = new Map<string, NavMapNode>();
  for (const node of nodes) {
    nodeByRoute.set(node.route.toLowerCase(), node);
  }

  // Step 1 + 2: Match routes and annotate coverage
  for (const [route, entry] of Object.entries(coverage.routeCoverage)) {
    const match = matchRoute(route, nodes);

    if (match.matched && match.nodeId) {
      const node = nodes.find(n => n.id === match.nodeId)!;
      node.metadata = {
        ...node.metadata,
        coverage: {
          status: makeCoverageStatus(entry),
          testCount: entry.testCount,
          passCount: entry.passCount,
          failCount: entry.failCount,
          tests: entry.tests,
          lastRun: entry.lastRun,
        } satisfies CoverageData,
      };
    } else {
      // Step 3: New node from test discovery
      const newId = routeToId(route);
      const groupId = route.split('/').filter(Boolean)[0] ?? 'root';
      nodes.push({
        id: newId,
        route,
        label: route.split('/').pop() || route,
        group: groupId,
        metadata: {
          discoveredBy: 'test',
          coverage: {
            status: makeCoverageStatus(entry),
            testCount: entry.testCount,
            passCount: entry.passCount,
            failCount: entry.failCount,
            tests: entry.tests,
            lastRun: entry.lastRun,
          } satisfies CoverageData,
        },
      });
    }
  }

  // Step 4: Mark uncovered nodes
  for (const node of nodes) {
    if (!node.metadata?.coverage) {
      node.metadata = {
        ...node.metadata,
        coverage: {
          status: 'uncovered',
          testCount: 0,
          passCount: 0,
          failCount: 0,
          tests: [],
          lastRun: '',
        } satisfies CoverageData,
      };
    }
  }

  // Step 5: Infer edges from test run route sequences
  for (const run of coverage.testRuns) {
    const resolvedIds: string[] = [];
    for (const route of run.routesVisited) {
      const match = matchRoute(route, nodes);
      if (match.matched && match.nodeId) {
        resolvedIds.push(match.nodeId);
      } else {
        resolvedIds.push(routeToId(route));
      }
    }

    for (let i = 0; i < resolvedIds.length - 1; i++) {
      const source = resolvedIds[i];
      const target = resolvedIds[i + 1];
      if (source === target) continue;
      const edgeKey = `${source}→${target}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `test-${source}-${target}`,
          source,
          target,
          type: 'test-transition',
          label: `Test: ${run.name}`,
        });
      }
    }
  }

  // Step 6: Populate flows
  for (const run of coverage.testRuns) {
    flows.push({
      name: run.flow.name,
      steps: run.flow.steps,
      gallery: run.flow.gallery as NavMapFlow['gallery'],
    });
  }

  // Ensure new groups exist for test-discovered nodes
  const existingGroups = new Set(base.groups.map(g => g.id));
  const groups = [...base.groups];
  for (const node of nodes) {
    if (!existingGroups.has(node.group)) {
      existingGroups.add(node.group);
      groups.push({
        id: node.group,
        label: node.group.charAt(0).toUpperCase() + node.group.slice(1),
      });
    }
  }

  return {
    version: '1.0',
    meta: {
      ...base.meta,
      generatedBy: 'merged',
      generatedAt: new Date().toISOString(),
    },
    nodes,
    edges,
    groups,
    sharedNav: base.sharedNav,
    flows,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/scanner && pnpm test -- --run src/__tests__/mergeGraph.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/scanner/src/ingest/mergeGraph.ts packages/scanner/src/__tests__/mergeGraph.test.ts
git commit -m "feat(scanner): add graph merge — base graph + test coverage data"
```

---

## Task 8: Ingest CLI Command

**Files:**
- Create: `packages/scanner/src/modes/ingest.ts`
- Modify: `packages/scanner/src/cli.ts`

- [ ] **Step 1: Implement the ingest orchestrator**

Create `packages/scanner/src/modes/ingest.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import { parseReport, type TestRunMeta } from '../ingest/parseReport.js';
import { parseTrace } from '../ingest/parseTrace.js';
import { selectScreenshotForRoute } from '../ingest/extractScreenshots.js';
import { mergeGraph, type TestCoverageData, type RouteCoverageEntry } from '../ingest/mergeGraph.js';
import type { NavMapGraph, NavMapFlowGallery, NavMapFlowStep, CoverageTestRef } from '@neonwatty/nav-map';

export interface IngestOptions {
  reportDir: string;
  output: string;
  baseGraphPath?: string;
  baseUrl?: string;
  screenshots?: boolean;
}

export interface IngestResult {
  outputPath: string;
  testCount: number;
  routesCovered: number;
  routesUncovered: number;
}

async function optimizeScreenshot(buffer: Buffer, outputPath: string): Promise<void> {
  try {
    const sharp = (await import('sharp')).default;
    await sharp(buffer).resize(320, 200, { fit: 'cover' }).webp({ quality: 80 }).toFile(outputPath);
  } catch {
    // Fallback: write raw buffer if sharp fails (e.g., stub data in tests)
    fs.writeFileSync(outputPath, buffer);
  }
}

export async function runIngest(options: IngestOptions): Promise<IngestResult> {
  const { reportDir, output, baseGraphPath, baseUrl = '', screenshots = true } = options;
  const resolvedDir = path.resolve(reportDir);
  const outputDir = path.resolve(output);

  // Find the JSON report
  const reportPath = findReport(resolvedDir);
  if (!reportPath) {
    throw new Error(`No Playwright JSON report found in ${resolvedDir}. Expected report.json or a .json file.`);
  }

  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const testRuns = parseReport(reportData);

  console.log(`Found ${testRuns.length} test runs`);

  // Create output directories
  fs.mkdirSync(outputDir, { recursive: true });
  const screenshotDir = path.join(outputDir, 'screenshots');
  if (screenshots) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Parse traces and build coverage data
  const routeCoverage: Record<string, RouteCoverageEntry> = {};
  const processedRuns: TestCoverageData['testRuns'] = [];

  for (const run of testRuns) {
    if (!run.tracePath || !fs.existsSync(run.tracePath)) {
      console.warn(`  Skipping ${run.name}: no trace file at ${run.tracePath}`);
      continue;
    }

    console.log(`  Processing: ${run.name} (${run.status})`);
    const traceBuffer = fs.readFileSync(run.tracePath);
    const trace = parseTrace(traceBuffer, baseUrl);

    // Build flow gallery with screenshots
    const gallery: NavMapFlowGallery = {};
    const flowSteps: string[] = [];

    for (let i = 0; i < trace.routes.length; i++) {
      const route = trace.routes[i];
      const nodeId = route.replace(/^\//, '').replace(/\//g, '-') || 'home';
      flowSteps.push(nodeId);

      const gotoAction = trace.actions.find(
        a => a.method === 'goto' && a.route === route
      );
      const navTimestamp = gotoAction?.timestamp ?? 0;

      const steps: NavMapFlowStep[] = [
        {
          action: 'goto',
          title: `Navigate to ${route}`,
          timestamp: navTimestamp,
        },
      ];

      // Find and save screenshot for this route
      if (screenshots && navTimestamp > 0) {
        const frame = selectScreenshotForRoute(navTimestamp, trace.screenshots);
        if (frame && trace.resourceBuffers.has(frame.sha1)) {
          const filename = `${run.id}-${nodeId}.webp`;
          await optimizeScreenshot(
            trace.resourceBuffers.get(frame.sha1)!,
            path.join(screenshotDir, filename)
          );
          steps[0].screenshot = `screenshots/${filename}`;
        }
      }

      gallery[nodeId] = steps;
    }

    // Aggregate route coverage
    const testRef: CoverageTestRef = {
      id: run.id,
      name: run.name,
      specFile: run.specFile,
      status: run.status,
    };

    for (const route of trace.routes) {
      if (!routeCoverage[route]) {
        routeCoverage[route] = {
          testCount: 0,
          passCount: 0,
          failCount: 0,
          tests: [],
          lastRun: run.startTime,
        };
      }
      const entry = routeCoverage[route];
      entry.testCount++;
      if (run.status === 'passed') entry.passCount++;
      if (run.status === 'failed') entry.failCount++;
      entry.tests.push(testRef);
      if (run.startTime > entry.lastRun) entry.lastRun = run.startTime;
    }

    processedRuns.push({
      id: run.id,
      name: run.name,
      specFile: run.specFile,
      status: run.status,
      duration: run.duration,
      startTime: run.startTime,
      routesVisited: trace.routes,
      flow: { name: run.name, steps: flowSteps, gallery },
    });
  }

  const coverageData: TestCoverageData = { testRuns: processedRuns, routeCoverage };

  // Merge with base graph if provided, otherwise create minimal graph from test data
  let resultGraph: NavMapGraph;

  if (baseGraphPath) {
    const baseGraph: NavMapGraph = JSON.parse(fs.readFileSync(path.resolve(baseGraphPath), 'utf-8'));
    resultGraph = mergeGraph(baseGraph, coverageData);
  } else {
    // No base graph — build from test data alone
    const minimalBase: NavMapGraph = {
      version: '1.0',
      meta: {
        name: 'test-coverage',
        generatedAt: new Date().toISOString(),
        generatedBy: 'e2e-record',
      },
      nodes: [],
      edges: [],
      groups: [],
    };
    resultGraph = mergeGraph(minimalBase, coverageData);
  }

  // Write output
  const outputPath = path.join(outputDir, 'nav-map.json');
  fs.writeFileSync(outputPath, JSON.stringify(resultGraph, null, 2));

  const coveredCount = Object.keys(routeCoverage).length;
  const uncoveredCount = resultGraph.nodes.filter(
    n => (n.metadata?.coverage as { status: string } | undefined)?.status === 'uncovered'
  ).length;

  return {
    outputPath,
    testCount: processedRuns.length,
    routesCovered: coveredCount,
    routesUncovered: uncoveredCount,
  };
}

function findReport(dir: string): string | null {
  // Check common locations
  const candidates = [
    path.join(dir, 'report.json'),
    path.join(dir, 'results.json'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Look for any .json file in the directory
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (files.length === 1) return path.join(dir, files[0]);

  return null;
}
```

- [ ] **Step 2: Wire ingest command into CLI**

Add to `packages/scanner/src/cli.ts`, before `program.parse()` (line 229):

```typescript
import { runIngest } from './modes/ingest.js';
```

Add at the top with other imports. Then add the command before `program.parse()`:

```typescript
program
  .command('ingest')
  .description('Ingest Playwright test results and merge with a nav-map graph')
  .argument('<dir>', 'Path to Playwright output directory (contains report JSON + trace ZIPs)')
  .option('-o, --output <dir>', 'Output directory', '.nav-map')
  .option('--base <path>', 'Base nav-map.json to merge with')
  .option('--base-url <url>', 'Base URL to strip from trace URLs (e.g., http://localhost:3000)')
  .option('--no-screenshots', 'Skip screenshot extraction from traces')
  .action(async (dir: string, opts) => {
    console.log('Ingesting Playwright test results...\n');

    try {
      const result = await runIngest({
        reportDir: dir,
        output: opts.output,
        baseGraphPath: opts.base,
        baseUrl: opts.baseUrl,
        screenshots: opts.screenshots !== false,
      });

      console.log(`\nWrote ${result.outputPath}`);
      console.log(`  Tests processed: ${result.testCount}`);
      console.log(`  Routes covered: ${result.routesCovered}`);
      console.log(`  Routes uncovered: ${result.routesUncovered}`);
    } catch (err) {
      console.error('Ingest failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });
```

- [ ] **Step 3: Run build to verify no compile errors**

Run: `cd packages/scanner && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/scanner/src/modes/ingest.ts packages/scanner/src/cli.ts
git commit -m "feat(scanner): add nav-map ingest CLI command"
```

---

## Task 9: Coverage Overlay in Core — Context and Types

**Files:**
- Modify: `packages/core/src/hooks/useNavMap.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add showCoverage to context**

In `packages/core/src/hooks/useNavMap.ts`, add to the `NavMapContextValue` interface:

```typescript
export interface NavMapContextValue {
  graph: NavMapGraph | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  isDark: boolean;
  screenshotBasePath: string;
  getGroupColors: (groupId: string) => GroupColors;
  focusedGroupId: string | null;
  edgeMode: EdgeMode;
  showCoverage: boolean;
}
```

Update `defaultContext`:

```typescript
const defaultContext: NavMapContextValue = {
  graph: null,
  selectedNodeId: null,
  setSelectedNodeId: () => {},
  isDark: true,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#1e1e2a', border: '#888', text: '#aaa' }),
  focusedGroupId: null,
  edgeMode: 'smooth',
  showCoverage: false,
};
```

Note: `showCoverage` state will be managed in `NavMap.tsx` (like `focusedGroupId` and `edgeMode`), not in `useNavMapState`. The context just passes it through.

- [ ] **Step 2: Export CoverageData type from index**

Add to `packages/core/src/index.ts` in the Types section:

```typescript
export type {
  NavMapGraph,
  NavMapNode,
  NavMapEdge,
  NavMapGroup,
  NavMapSharedNav,
  NavMapAnalytics,
  GroupColors,
  GroupColorMap,
  NavMapFlow,
  NavMapFlowStep,
  NavMapFlowGallery,
  ViewMode,
  EdgeMode,
  NavMapTheme,
  CoverageData,
  CoverageTestRef,
} from './types';
```

- [ ] **Step 3: Run typecheck**

Run: `cd packages/core && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/hooks/useNavMap.ts packages/core/src/index.ts
git commit -m "feat(core): add showCoverage to NavMap context and export coverage types"
```

---

## Task 10: Coverage Badge on Nodes

**Files:**
- Modify: `packages/core/src/components/nodes/PageNode.tsx`
- Modify: `packages/core/src/components/nodes/CompactNode.tsx`

- [ ] **Step 1: Add coverage badge to PageNode**

In `packages/core/src/components/nodes/PageNode.tsx`, add to the component (after line 10, alongside the existing context destructure):

```typescript
const { isDark, getGroupColors, screenshotBasePath, showCoverage } = useNavMapContext();
```

Then add a helper function inside the component (before the return):

```typescript
const coverageStatus = showCoverage
  ? (nodeData.metadata?.coverage as { status?: string } | undefined)?.status
  : undefined;

const coverageBorderColor = coverageStatus === 'covered'
  ? '#22c55e'
  : coverageStatus === 'failing'
    ? '#eab308'
    : coverageStatus === 'uncovered'
      ? '#ef4444'
      : undefined;
```

Update the container `div`'s border style to use coverage color when active:

```typescript
border: `2px solid ${coverageBorderColor ?? (selected ? colors.border : isDark ? '#2a2a3a' : '#d0d0d8')}`,
```

Add a coverage badge in the label area, after the auth badge (after line 111):

```typescript
{coverageStatus && (
  <span
    style={{
      fontSize: 8,
      padding: '1px 5px',
      borderRadius: 3,
      background: coverageStatus === 'covered'
        ? (isDark ? '#0a2a10' : '#dcfce7')
        : coverageStatus === 'failing'
          ? (isDark ? '#2a2a0a' : '#fef9c3')
          : (isDark ? '#2a0a0a' : '#fee2e2'),
      color: coverageStatus === 'covered'
        ? '#22c55e'
        : coverageStatus === 'failing'
          ? '#eab308'
          : '#ef4444',
    }}
    title={`Coverage: ${coverageStatus}`}
  >
    {coverageStatus === 'covered' ? '✓' : coverageStatus === 'failing' ? '!' : '✗'}
  </span>
)}
```

- [ ] **Step 2: Add coverage badge to CompactNode**

Apply the same pattern to `packages/core/src/components/nodes/CompactNode.tsx`:

Update the context destructure:
```typescript
const { isDark, getGroupColors, showCoverage } = useNavMapContext();
```

Add the same coverage variables before the return:
```typescript
const coverageStatus = showCoverage
  ? (nodeData.metadata?.coverage as { status?: string } | undefined)?.status
  : undefined;

const coverageBorderColor = coverageStatus === 'covered'
  ? '#22c55e'
  : coverageStatus === 'failing'
    ? '#eab308'
    : coverageStatus === 'uncovered'
      ? '#ef4444'
      : undefined;
```

Update the border:
```typescript
border: `2px solid ${coverageBorderColor ?? (selected ? colors.border : isDark ? '#2a2a3a' : '#d0d0d8')}`,
```

Add the same coverage badge after the auth badge in the label area.

- [ ] **Step 3: Run typecheck**

Run: `cd packages/core && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Run existing tests to ensure no regressions**

Run: `cd packages/core && pnpm test`
Expected: PASS (coverage badge doesn't render when showCoverage is false in default context)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/nodes/PageNode.tsx packages/core/src/components/nodes/CompactNode.tsx
git commit -m "feat(core): add coverage badge to PageNode and CompactNode"
```

---

## Task 11: Coverage Summary Panel

**Files:**
- Create: `packages/core/src/components/panels/CoverageSummary.tsx`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create the CoverageSummary panel**

Create `packages/core/src/components/panels/CoverageSummary.tsx`:

```typescript
import { useNavMapContext } from '../../hooks/useNavMap';
import type { CoverageData } from '../../types';

export function CoverageSummary() {
  const { graph, isDark, showCoverage } = useNavMapContext();

  if (!showCoverage || !graph) return null;

  const nodes = graph.nodes;
  let covered = 0;
  let failing = 0;
  let uncovered = 0;
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const node of nodes) {
    const cov = node.metadata?.coverage as CoverageData | undefined;
    if (!cov) {
      uncovered++;
      continue;
    }
    if (cov.status === 'covered') covered++;
    else if (cov.status === 'failing') failing++;
    else uncovered++;
    totalTests += cov.testCount;
    passedTests += cov.passCount;
    failedTests += cov.failCount;
  }

  const total = covered + failing + uncovered;
  const coveredPercent = total > 0 ? Math.round(((covered + failing) / total) * 100) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        background: isDark ? '#14141e' : '#fff',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        color: isDark ? '#888' : '#666',
        zIndex: 15,
        minWidth: 180,
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isDark ? '#aaa' : '#444',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Test Coverage
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
        <span>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>{covered}</span> covered
        </span>
        {failing > 0 && (
          <span>
            <span style={{ color: '#eab308', fontWeight: 600 }}>{failing}</span> failing
          </span>
        )}
        <span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{uncovered}</span> uncovered
        </span>
      </div>

      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: isDark ? '#1e1e2e' : '#f0f0f4',
          overflow: 'hidden',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${coveredPercent}%`,
            background: failing > 0
              ? 'linear-gradient(90deg, #22c55e, #eab308)'
              : '#22c55e',
            borderRadius: 2,
            transition: 'width 0.3s',
          }}
        />
      </div>

      <div style={{ fontSize: 11, opacity: 0.8 }}>
        {coveredPercent}% routes covered · {totalTests} tests ({passedTests} passed, {failedTests} failed)
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export from index**

Add to `packages/core/src/index.ts` in the Components section:

```typescript
export { CoverageSummary } from './components/panels/CoverageSummary';
```

- [ ] **Step 3: Run typecheck**

Run: `cd packages/core && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/panels/CoverageSummary.tsx packages/core/src/index.ts
git commit -m "feat(core): add CoverageSummary panel with coverage stats and progress bar"
```

---

## Task 12: Wire Coverage into NavMap and Toolbar

**Files:**
- Modify: `packages/core/src/components/NavMap.tsx`
- Modify: `packages/core/src/components/panels/NavMapToolbar.tsx`

- [ ] **Step 1: Add coverage toggle to toolbar**

In `packages/core/src/components/panels/NavMapToolbar.tsx`:

Add props:
```typescript
interface NavMapToolbarProps {
  // ... existing props ...
  showCoverage: boolean;
  hasCoverageData: boolean;
  onToggleCoverage: () => void;
}
```

Add the coverage toggle button in the toolbar, right before the Search button (around line 197):

```typescript
{hasCoverageData && (
  <button
    onClick={onToggleCoverage}
    style={btnStyle(isDark, showCoverage)}
    title="Toggle test coverage overlay (C)"
  >
    Coverage
  </button>
)}
```

Update the function signature to destructure the new props.

- [ ] **Step 2: Wire coverage state in NavMap.tsx**

In `packages/core/src/components/NavMap.tsx`:

Add import:
```typescript
import { CoverageSummary } from './panels/CoverageSummary';
```

In the `NavMapInner` function, add state (alongside other useState calls):
```typescript
const [showCoverage, setShowCoverage] = useState(false);
```

Add a computed flag for whether coverage data exists:
```typescript
const hasCoverageData = useMemo(
  () => graph?.nodes.some(n => n.metadata?.coverage) ?? false,
  [graph]
);
```

Update the `NavMapContext.Provider` value to include `showCoverage`:
```typescript
<NavMapContext.Provider
  value={{
    ...navMapState,
    focusedGroupId,
    edgeMode,
    showCoverage,
  }}
>
```

Pass to toolbar:
```typescript
<NavMapToolbar
  // ... existing props ...
  showCoverage={showCoverage}
  hasCoverageData={hasCoverageData}
  onToggleCoverage={() => setShowCoverage(prev => !prev)}
/>
```

Render the summary panel (alongside other overlays):
```typescript
<CoverageSummary />
```

- [ ] **Step 3: Run typecheck and tests**

Run: `cd packages/core && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/NavMap.tsx packages/core/src/components/panels/NavMapToolbar.tsx
git commit -m "feat(core): wire coverage toggle into toolbar and NavMap component"
```

---

## Task 13: Update Scanner Exports and Build

**Files:**
- Modify: `packages/scanner/src/index.ts`
- Modify: `packages/scanner/tsup.config.ts` (if needed)

- [ ] **Step 1: Export ingest functions**

Check what `packages/scanner/src/index.ts` currently exports, then add:

```typescript
export { runIngest, type IngestOptions, type IngestResult } from './modes/ingest.js';
export { parseReport, type TestRunMeta } from './ingest/parseReport.js';
export { parseTrace, type TraceResult, type TraceAction, type TraceScreenshot } from './ingest/parseTrace.js';
export { matchRoute, type RouteMatchResult } from './ingest/routeMatcher.js';
export { mergeGraph, type TestCoverageData, type TestRunCoverage, type RouteCoverageEntry } from './ingest/mergeGraph.js';
export { selectScreenshotForRoute } from './ingest/extractScreenshots.js';
```

- [ ] **Step 2: Build both packages**

Run: `cd /Users/neonwatty/Desktop/nav-map && pnpm -r build`
Expected: PASS — both `packages/core` and `packages/scanner` build cleanly.

- [ ] **Step 3: Run all tests**

Run: `cd /Users/neonwatty/Desktop/nav-map && pnpm -r test`
Expected: PASS — all existing + new tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/scanner/src/index.ts
git commit -m "feat(scanner): export ingest pipeline functions"
```

---

## Task 14: Validation Against Deckchecker

This task validates the full pipeline end-to-end using real data from the deckchecker project. It requires the deckchecker repo to be available and its test environment to be running.

**This task is manual / semi-automated** — it requires a running deckchecker instance and interactive verification.

- [ ] **Step 1: Clone deckchecker and configure traces**

```bash
cd /tmp
gh repo clone mean-weasel/deckchecker deckchecker-test
cd deckchecker-test
```

Edit `e2e/desktop/playwright.config.ts`:
- Set `trace: 'on'` (instead of `'on-first-retry'` or `'off'`)
- Add `['json', { outputFile: '../results.json' }]` to the reporter array

- [ ] **Step 2: Generate base nav-map from deckchecker**

```bash
cd /Users/neonwatty/Desktop/nav-map
npx tsx packages/scanner/src/cli.ts scan /tmp/deckchecker-test -o /tmp/deckchecker-test/nav-map.json
```

Verify: `cat /tmp/deckchecker-test/nav-map.json | jq '.nodes | length'` should be > 0.

- [ ] **Step 3: Run admin desktop tests**

```bash
cd /tmp/deckchecker-test/e2e/desktop
npx playwright test --grep "admin" --reporter=json --trace=on
```

Note: This requires deckchecker's dev server running. Adjust base URL as needed.

- [ ] **Step 4: Run ingest pipeline**

```bash
cd /Users/neonwatty/Desktop/nav-map
npx tsx packages/scanner/src/cli.ts ingest /tmp/deckchecker-test/e2e/desktop/test-results \
  --base /tmp/deckchecker-test/nav-map.json \
  --base-url http://localhost:3000 \
  --output /tmp/deckchecker-test/.nav-map
```

Expected output: summary of tests processed, routes covered, routes uncovered.

- [ ] **Step 5: Serve and visually verify**

```bash
npx tsx packages/scanner/src/cli.ts serve /tmp/deckchecker-test/.nav-map/nav-map.json \
  --screenshot-dir /tmp/deckchecker-test/.nav-map/screenshots
```

Open http://localhost:3333 and verify:
- Admin-accessed routes show green coverage
- Unaccessible routes (speaker/planner-only) show red uncovered
- Click a covered node → metadata shows test names
- Switch to flow view → test flows appear with screenshots

- [ ] **Step 6: Document results**

Note any issues found:
- Dynamic route matching mismatches
- Missing screenshots
- Incorrect coverage status
- Routes that should match but don't

These become bug fixes in subsequent iterations.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(scanner): address issues found during deckchecker validation"
```

---

## Summary

| Task | Package | What it builds |
|------|---------|---------------|
| 1 | core | CoverageData types, extended unions |
| 2 | core | Validation tests for new types |
| 3 | scanner | JSON report parser |
| 4 | scanner | Trace ZIP parser |
| 5 | scanner | Screenshot selection from traces |
| 6 | scanner | Route matcher (test routes → graph nodes) |
| 7 | scanner | Graph merge (base + coverage → enriched) |
| 8 | scanner | `nav-map ingest` CLI command |
| 9 | core | showCoverage in context + export types |
| 10 | core | Coverage badge on PageNode/CompactNode |
| 11 | core | CoverageSummary panel |
| 12 | core | Wire coverage into NavMap + toolbar |
| 13 | scanner | Export ingest functions + build validation |
| 14 | both | End-to-end validation against deckchecker |

Tasks 1-8 are sequential (each builds on the previous). Tasks 9-12 can be developed in parallel with tasks 3-8 using mock coverage data. Task 13 is a final integration check. Task 14 is the validation milestone.
