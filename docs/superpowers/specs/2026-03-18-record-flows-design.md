# Record Flows from Playwright Tests Design

## Problem

The scanner can discover pages and edges from static code analysis, but it can't capture what happens *within* a page — multi-step workflows like file upload, processing, and download that happen on a single URL. Existing E2E tests already exercise these workflows with real interactions, producing rich step-by-step journeys. Users should be able to point the scanner at a directory of standard Playwright tests, and get named flows with step-by-step screenshot galleries in their nav-map.

## Solution

A new `record-flows` command that runs standard Playwright test files from a user-provided directory, parses the trace artifacts for navigation events and in-page actions, captures screenshots at key moments, and merges the results with an existing nav-map.json.

## Design

### 1. The `record-flows` Command

```bash
npx nav-map record-flows \
  --flows-dir ./flows \
  --base-url https://bleepthat.sh \
  --storage-state auth.json \
  --routes nav-map.json \
  --screenshot-dir nav-screenshots \
  -o nav-map.json
```

The scanner:
1. Discovers all `*.spec.ts` files in `--flows-dir`
2. Generates a temporary Playwright config that sets `baseURL`, `storageState`, `trace: 'on'`, `screenshot: 'on'`, `workers: 1`, `retries: 0`
3. Sets `cwd` to the original project root (resolved from symlink targets) so that project-relative imports and `tsconfig` path aliases resolve correctly
4. Runs tests via `execFileSync('npx', ['playwright', 'test', '--config', tempConfig])` with `killSignal: 'SIGTERM'` for clean process termination on timeout
5. Uses the existing nav-map reporter to collect trace file paths
6. Parses traces for navigation events AND in-page actions
7. Captures screenshots at key moments
8. Each test file becomes a named flow with step-by-step screenshots
9. Merges with `--routes` if provided

The user's flow tests are standard Playwright tests — no special API, no nav-map-specific imports. If a test imports helpers from its original project (like auth bypass utilities), the user needs those available. Symlinked tests resolve to their original project directory automatically.

**`--screenshot-dir`** defaults to `nav-screenshots` (same as other commands).

### 2. Trace Parsing — Actions as Flow Steps

Two types of events extracted from trace ZIPs:

**Navigation events** (URL changes):
- `{ class: 'Frame', method: 'goto' }` — explicit page navigation
- Creates page nodes and edges in the graph

**Action events** (in-page interactions):
- `{ class: 'Locator', method: 'click' }` — button clicks
- `{ class: 'Locator', method: 'fill' }` — form inputs
- `{ class: 'Frame', method: 'waitForSelector' }` / any `waitFor*` — app reached a stable state

**Screenshot-to-action association via `screencast-frame` events:**

Playwright traces contain `{ type: 'screencast-frame', sha1: '...', timestamp: ... }` entries that link screenshot resource files (stored as `resources/<sha1>.jpeg` in the ZIP) to specific moments. The trace parser must:

1. Build an ordered timeline of action events from the `.trace` JSONL (each has a `startTime`)
2. Build an ordered timeline of `screencast-frame` entries (each has a `timestamp` and `sha1`)
3. For each key action (goto, waitFor*, test end), find the nearest screencast-frame with `timestamp >= action.startTime`
4. Extract that screenshot from the ZIP using the `sha1` to find the resource file

This is the core algorithm in `trace-parser.ts`. It produces screenshot associations that are accurate to within one screencast-frame interval (~100ms).

**Key moment capture:**
- After every `goto` (new page loaded)
- After every `waitFor*` call (app settled into a new state)
- At test end

### 3. Flow and Gallery Types

New types for the nav-map schema:

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
  steps: string[];           // page node IDs visited (for graph highlighting)
  gallery?: NavMapFlowGallery; // step-by-step screenshots per page
}
```

Gallery data lives on the **flow** object (not on node metadata). This keeps the data model clean — flows own their galleries, nodes are unaware of them. The NavMap component reads `flow.gallery[nodeId]` when rendering a flow's detail view.

**Single-page flows:** The existing `record.ts` drops flows with fewer than 2 unique page nodes. For `record-flows`, this guard is removed — a flow that stays on one page but has 12 interaction steps is valid and produces a gallery. The `steps` array contains the single page ID, and the `gallery` contains all the step screenshots.

### 4. Merge with Existing Graph

When `--routes nav-map.json` is provided:

**Pages:** If a recorded page matches an existing one (by route), its screenshot gets updated with the best one from the flow (last `waitFor` screenshot — the most complete state). New pages get added.

**Edges:** Navigation events that produce page-to-page transitions get added as new edges, deduplicated against existing ones.

**Flows:** Each test file becomes a new entry in `flows[]`. If a flow with the same name already exists, it gets replaced.

Typical workflow:
```bash
# 1. Static scan for route structure
npx nav-map scan ./my-app -o nav-map.json

# 2. Record flows to add screenshots + workflow galleries
npx nav-map record-flows \
  --flows-dir ./flows \
  --base-url https://myapp.com \
  --storage-state auth.json \
  --routes nav-map.json \
  -o nav-map.json
```

### 5. The Flows Directory

Contains standard Playwright test files:

```
flows/
├── bleep-workflow.spec.ts
├── studio-dashboard.spec.ts
└── signup-flow.spec.ts
```

Users can write from scratch or symlink existing tests:

```bash
mkdir flows
ln -s ../my-app/tests/live/workflow.spec.ts flows/
```

The generated temp config handles all nav-map-specific settings (trace, screenshots, reporter). The user doesn't maintain a Playwright config for nav-map.

### 6. Shared Infrastructure with `record` Command

The existing `record` command and the new `record-flows` share significant infrastructure: reporter manifest reading, trace ZIP parsing via `adm-zip`, screenshot extraction, route dedup. Rather than duplicate, extract shared pieces:

| Shared Module | Used By |
|---------------|---------|
| `trace-parser.ts` (new) | `record-flows`, replaces inline parsing in `record` |
| `reporter.ts` (existing) | Both commands |
| `dedup.ts` (existing) | Both commands |

The existing `record.ts` should be refactored to use `trace-parser.ts` instead of its inline parsing. This prevents divergence.

### 7. Files Changed

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/scanner/src/modes/record-flows.ts` | Create | Discover test files, generate temp config, run tests, merge results |
| `packages/scanner/src/modes/trace-parser.ts` | Create | Parse trace ZIPs for navigation + action events, screenshot association via screencast-frame correlation |
| `packages/scanner/src/modes/record.ts` | Modify | Refactor to use shared trace-parser instead of inline parsing |
| `packages/scanner/src/cli.ts` | Modify | Add `record-flows` command |
| `packages/scanner/src/index.ts` | Modify | Export new functions |
| `packages/core/src/types.ts` | Modify | Add `NavMapFlowStep`, `NavMapFlowGallery` types, update `NavMapFlow` |

No changes to NavMap React component. Gallery rendering in the UI is a follow-up.

### 8. Error Handling

- **Test failures:** When tests fail mid-flow, the trace contains a partial journey. The parser extracts what's available and marks the flow as `partial: true`. A warning is logged. Add `--fail-on-test-errors` flag that makes the command exit non-zero if any tests fail.
- **Timeout:** `execFileSync` uses `killSignal: 'SIGTERM'` to clean up the Playwright process tree on timeout (default 10 minutes).
- **Missing traces:** If a test produces no trace (e.g., setup-only test), it's silently skipped.
- **Symlink resolution:** Tests are resolved to their real path for `cwd` determination. If resolution fails, the flows directory itself is used as `cwd`.

### 9. Limitations

- Tests that use `tsconfig` path aliases need symlinks that preserve the project structure, or the tests need to be copied (not just symlinked) into a location where imports resolve
- Playwright must be installed in the project where tests run
- `workers: 1` means tests run sequentially (needed for deterministic flow ordering)
- Screencast-frame frequency depends on Playwright's internal capture rate (~100ms intervals)

## Verification

1. Create a `flows/` directory with a symlinked bleep workflow test
2. Run `npx nav-map record-flows --flows-dir ./flows --base-url https://bleepthat.sh --storage-state auth.json --routes nav-map.json -o nav-map.json`
3. Output JSON has flows with gallery data for the bleep page (single-page flow with 6+ step screenshots)
4. Screenshots directory contains step-by-step images
5. Existing pages from static scan preserved, bleep page screenshot updated
6. Works with any app — not bleep-specific
7. Test failure produces partial flow with warning, not crash
