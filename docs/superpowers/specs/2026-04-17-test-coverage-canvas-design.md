# Self-Hosted Nav-Map with Playwright Test Coverage

**Date:** 2026-04-17
**Status:** Draft

## Overview

Evolve nav-map from a library-only component into a self-hosted app that visualizes Playwright end-to-end test coverage on an interactive canvas. After running Playwright tests, a new CLI command ingests the JSON report and trace files, extracts routes visited, screenshots, and actions, then merges this with an existing nav-map graph from scan/crawl. The result is an enriched navigation map where nodes are colored by test coverage status and each test run can be replayed as a step-by-step flow with real screenshots.

Two presentation modes: `nav-map serve` for local interactive exploration, and `nav-map report` for static HTML export suitable as a CI artifact.

## Goals

- Zero changes to existing Playwright test code — reads what Playwright already produces
- Coverage heatmap on the canvas showing which routes are tested and which are gaps
- Drill-down from heatmap to individual test flows with real screenshots
- Works locally (dev tool) and in CI (static report)
- Validate end-to-end against mean-weasel/deckchecker's admin desktop workflows

## Non-Goals (for this iteration)

- Custom Playwright reporter plugin (future upgrade path if traces prove insufficient)
- Workflow markdown file ingestion (labeling/gap analysis — future follow-on)
- Test run history or trend tracking over time
- Visual regression / screenshot diffing between runs
- Real-time test streaming during execution

## Architecture

Three new pieces, all within the existing monorepo:

```
Playwright Test Run          nav-map scan/crawl
  (JSON report + traces)       (nav-map.json)
         │                          │
         ▼                          │
   nav-map ingest                   │
   (trace parser)                   │
         │                          │
         ▼                          ▼
              nav-map merge
              (base + test data)
                    │
                    ▼
            .nav-map/ directory
      (enriched JSON + screenshots)
                    │
            ┌───────┴───────┐
            ▼               ▼
      nav-map serve    nav-map report
      (local dev)      (static export)
```

### Monorepo placement

| Package | Changes |
|---------|---------|
| `packages/scanner` | New `ingest` command, `merge` logic, `report` command |
| `packages/app` (new) | Next.js shell for `serve`, reads `.nav-map/` from disk |
| `packages/core` | Coverage heatmap overlay, test details panel, flow view from traces |

## 1. Trace Ingestion (`nav-map ingest`)

### CLI interface

```bash
npx nav-map ingest <playwright-output-dir> [options]

Options:
  --output, -o <dir>    Output directory (default: .nav-map/)
  --base <path>         Base nav-map.json to merge with (optional)
  --base-url <url>      Base URL to strip from trace URLs (e.g., http://localhost:3000)
  --screenshots         Extract and optimize screenshots from traces (default: true)
  --no-screenshots      Skip screenshot extraction
```

When `--base` is provided, ingest runs merge automatically — no separate `merge` command needed for the common case.

### Data sources

**Playwright JSON report** (`report.json` or output from `--reporter=json`):
- Test suite hierarchy (describe blocks → specs → tests)
- Per-test: name, spec file path, status (passed/failed/skipped), duration, retry count
- Attachments: paths to screenshots, traces, videos

**Playwright trace ZIPs** (from `trace: 'on'` in Playwright config):
- `0-trace.trace` (NDJSON): browser-side events
  - `type: "before"` with `method: "goto"` → `params.url` for explicit navigations
  - `type: "before"` with `method: "click"`, `"fill"` etc. → user actions
  - `type: "frame-snapshot"` → `snapshot.frameUrl` for current URL at each snapshot
  - `type: "screencast-frame"` → periodic screenshots (`resources/page@*.jpeg`)
- `0-trace.network` (NDJSON): network requests (for future use)
- `resources/` directory: screenshots, screencast frames, DOM snapshots

### Trace parsing pipeline

1. Read JSON report to get test list and locate trace ZIP paths in attachments
2. For each trace ZIP:
   a. Unzip to temp directory
   b. Parse `0-trace.trace` line by line (NDJSON)
   c. Build a timeline of route transitions from `goto` events and `frame-snapshot` URLs
   d. Extract screencast frames nearest to each route transition as step screenshots
   e. Record actions (click, fill, navigation) with timestamps
   f. Optimize screenshots with sharp (resize to 320x200, convert to WebP)
3. Assemble into nav-map-compatible flow objects
4. Aggregate per-route coverage from all test runs

### Output: test-coverage.json

```typescript
{
  testRuns: [
    {
      id: string;                    // hash of spec file + test name
      name: string;                  // test title
      specFile: string;              // relative path to .spec.ts
      status: "passed" | "failed" | "skipped";
      duration: number;              // milliseconds
      routesVisited: string[];       // ordered list of route paths
      flow: {
        name: string;
        steps: string[];             // node IDs (route-based)
        gallery: {
          [nodeId: string]: [{
            action: "goto" | "click" | "fill" | "waitFor" | "end";
            title: string;
            screenshot?: string;     // relative path to extracted screenshot
            timestamp?: number;
          }]
        }
      }
    }
  ],
  routeCoverage: {
    [route: string]: {
      status: "covered" | "failing" | "uncovered";
      // "covered" = at least one test touches this route and all are passing
      // "failing" = at least one test touches this route but some are failing
      // "uncovered" = no test touches this route
      testCount: number;
      passCount: number;
      failCount: number;
      tests: Array<{ id: string; name: string; specFile: string; status: string }>;
      lastRun: string;               // ISO timestamp
    }
  }
}
```

## 2. Graph Merge

### Merge algorithm

**Input:** base `NavMapGraph` + `test-coverage.json`

**Step 1 — Node matching:**
For each route in `routeCoverage`, find the matching node in the base graph:
- Normalize: strip `--base-url`, remove trailing slashes, lowercase
- Exact match first: `/settings/billing` → node with `route: "/settings/billing"`
- Pattern match second: `/events/abc123` → node with `route: "/events/[id]"` (strip the last segment if no exact match, check for `[param]` patterns in the base graph)
- Unmatched test routes become new nodes with `metadata.discoveredBy: "test"`

**Step 2 — Coverage annotation:**
Add `coverage` field to each `NavMapNode.metadata`:
```typescript
metadata: {
  coverage: {
    status: "covered" | "failing" | "uncovered";
    testCount: number;
    passCount: number;
    failCount: number;
    tests: Array<{ id: string; name: string; specFile: string; status: string }>;
    lastRun: string;
  },
  discoveredBy?: "test";  // for nodes not in base graph
}
```

**Step 3 — Edge inference:**
For each test run's route sequence, add edges for transitions not already in the base graph:
- Edge type: `"test-transition"`
- Deduplicate: if the same source→target edge exists from the scanner, don't add a duplicate

**Step 4 — Flow population:**
Each test run becomes an entry in the graph's `flows` array, using the existing `NavMapFlow` format:
```typescript
{
  name: "Admin: Billing settings flow",  // from test title
  steps: ["settings", "settings-billing"],  // node IDs
  gallery: { ... },                         // screenshots from trace
  partial: false
}
```

**Step 5 — Mark uncovered:**
Any base graph node not matched by any test gets `coverage.status: "uncovered"`.

### Output

A single enriched `nav-map.json` combining:
- All original nodes, edges, groups from the base graph
- Coverage metadata on every node
- New nodes discovered by tests
- New edges inferred from test transitions
- Flows populated from test trace data
- Screenshots in a `screenshots/` subdirectory alongside the JSON

Written to `.nav-map/nav-map.json` + `.nav-map/screenshots/`.

### Schema extensions to NavMapGraph

The `meta.generatedBy` field gains a new value:
```typescript
generatedBy: 'repo-scan' | 'url-crawl' | 'manual' | 'e2e-record' | 'merged';
```

The `NavMapEdge.type` field gains a new value:
```typescript
type: 'link' | 'redirect' | 'router-push' | 'shared-nav' | 'test-transition';
```

No new top-level fields on `NavMapGraph` — coverage data lives in `node.metadata` and test flows live in the existing `flows` array. This keeps the schema backward-compatible: components that don't know about coverage simply ignore it.

## 3. Self-Hosted App

### packages/app (new package)

Minimal Next.js app with a single page that renders the `NavMap` component.

**`nav-map serve`** (local dev mode):
```bash
npx nav-map serve [dir]        # default: .nav-map/
  --port, -p <number>          # default: 3333
```
- Starts a Next.js dev server
- API route reads `nav-map.json` from the specified directory
- Serves screenshots from the same directory as static files
- File-watching: re-reads JSON on each request (or uses fs.watch for push updates)

**`nav-map report`** (CI static export):
```bash
npx nav-map report [dir]       # default: .nav-map/
  --output, -o <dir>           # default: .nav-map/report/
```
- Runs `next build && next export` with the data baked in
- Produces a static directory: `index.html` + assets + screenshots
- Self-contained — open in a browser, no server needed
- Suitable as a CI artifact (upload to GitHub Actions, S3, GitHub Pages)

### CI integration example

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: npx playwright test --reporter=json --trace=on

- name: Generate nav-map report
  run: |
    npx nav-map ingest ./test-results --base nav-map.json --output .nav-map/
    npx nav-map report .nav-map/ --output .nav-map/report/

- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: nav-map-coverage
    path: .nav-map/report/
```

## 4. Canvas Extensions (packages/core)

### Coverage heatmap overlay

Coverage is an **overlay**, not a separate view mode. It can be toggled on/off over any existing view (hierarchy, map, tree).

**Node coloring:**
- Green border/badge: all tests passing
- Red border/badge: uncovered (no tests touch this route)
- Yellow/amber border/badge: some tests failing
- Gray: no test data loaded (coverage overlay is off or no coverage data in the graph)

Implementation: the existing `PageNode` and `CompactNode` components read `node.data.metadata.coverage` and render a colored border or small status badge. The group coloring remains unchanged — coverage is a secondary visual layer.

**Coverage summary panel:**
- Small panel (similar to the existing legend panel) showing:
  - Routes covered: X / Y (percentage)
  - Tests: N total, N passed, N failed
  - Toggle to show/hide coverage overlay
- Positioned in the toolbar area alongside existing controls

### Node click → test details

When a node with coverage data is clicked:
- Existing node detail panel (or a new section in it) shows:
  - List of tests that touch this route
  - Per test: name, spec file, status (pass/fail icon), duration
  - Click a test entry → jump to flow view for that test run

### Flow view from test traces

The existing flow animator and `GalleryViewer` component already support the `NavMapFlow` format with step galleries. Test flows use the same format, so they render without changes to the flow view infrastructure.

The only addition: a label or badge on flow entries in the `FlowSelector` indicating these flows came from test runs (vs. manually recorded flows).

## 5. Validation Plan (deckchecker)

Concrete steps to validate the full pipeline against mean-weasel/deckchecker:

### Step 1 — Generate test data
- Clone deckchecker
- Set `trace: 'on'` in `e2e/desktop/playwright.config.ts`
- Add `reporter: [['json', { outputFile: 'results.json' }]]` (or append to existing reporter config)
- Run admin desktop tests: `npx playwright test --project=desktop --grep "admin"`
- Collect: `results.json` + `test-results/` directory with trace ZIPs

### Step 2 — Generate base graph
- Run `npx nav-map scan ./deckchecker` to produce `nav-map.json`
- Alternatively `npx nav-map crawl` against a running instance with `--storage-state` for auth

### Step 3 — Run the pipeline
- `npx nav-map ingest ./test-results --base nav-map.json --output .nav-map/`
- Inspect the merged JSON manually:
  - Admin-accessible routes → `coverage.status: "covered"`
  - Speaker/planner-only routes → `coverage.status: "uncovered"` (good — shows the gap)
  - Any routes not in the base graph → `metadata.discoveredBy: "test"`

### Step 4 — Visual verification
- `npx nav-map serve .nav-map/`
- Open in browser, verify:
  - Heatmap colors match expected coverage (admin routes green, others red)
  - Click a covered node → test details appear with correct test names
  - Select a test flow → gallery shows real screenshots from the trace
  - Uncovered nodes are visibly marked as gaps

### Step 5 — Edge cases
- Dynamic route matching: deckchecker has routes like `/events/[id]` — verify pattern matching works
- Auth-gated routes: routes the scanner couldn't reach but tests visited → appear as new nodes
- Failed test visualization: intentionally fail a test and verify it shows yellow/amber

### Success criteria
- The heatmap accurately reflects which routes are exercised by admin tests
- At least one flow can be replayed with screenshots extracted from a real trace
- Routes not tested are visibly identified as coverage gaps
- The pipeline runs end-to-end without manual intervention

## Implementation order

1. **Trace parser** — the core new capability, highest risk, validate early
2. **Graph merge** — depends on trace parser output
3. **Schema extensions + coverage overlay in core** — can be developed in parallel with 1-2 using mock data
4. **App shell (serve)** — thin wrapper, low risk
5. **Validation against deckchecker** — integration test of the full pipeline
6. **Static report export** — last, builds on everything above

## Dependencies

- `adm-zip` (already in scanner) — for unzipping trace archives
- `sharp` (already in scanner) — for screenshot optimization
- No new external dependencies anticipated

## Open questions

- **Screencast frame selection:** When multiple screencast frames exist near a route transition, which one to pick? Closest-in-time after the navigation completes is the likely answer, but needs experimentation with real trace data.
- **Dynamic route matching heuristics:** The simple "strip last segment, check for `[param]`" approach may need refinement. Validate against deckchecker's actual route structure.
- **App shell packaging:** Should `packages/app` be published to npm (so `npx nav-map serve` works globally), or is it only used locally within the monorepo? Leaning toward published, but TBD.
