# Authenticated Scanning + E2E Recording Design

## Problem

The scanner currently captures screenshots in a logged-out state, so auth-gated pages (Studio, Project, Settings) show the login screen instead of their actual content. Additionally, the static code scanner only discovers links from `<Link>` elements and `router.push` calls — it misses navigation that happens through user interaction (button clicks, form submissions, redirects after async operations). Existing E2E tests already exercise these real user flows.

## Solution

Two new scanner commands:

1. **`auth`** — Interactive browser login that saves Playwright `storageState` (cookies + localStorage) for reuse
2. **`record`** — Runs an app's existing Playwright E2E tests against a production URL, captures navigation events via a custom Playwright reporter, takes screenshots, and assembles a deduplicated `nav-map.json`

## Design

### 1. `auth` Command — Interactive Login + Save

```bash
npx nav-map auth https://bleepthat.sh -o auth.json
```

Implementation:
- Launch Chromium in headed mode (`headless: false`)
- Navigate to the provided URL
- Inject a "Save & Close" button into the page via `page.exposeFunction()` that triggers the save — this is more reliable than detecting browser close or Ctrl+C
- Also register a `SIGINT` handler as fallback that calls `context.storageState()` before exit
- Save `context.storageState()` to the output path
- The saved file contains cookies and localStorage entries — standard Playwright format

Uses `-o` / `--output` flag (consistent with existing CLI conventions).

### 2. `record` Command — E2E Test Recording

```bash
npx nav-map record \
  --playwright-config ./playwright.live.config.ts \
  --storage-state auth.json \
  --routes routes.json \
  --screenshot-dir nav-screenshots \
  -o nav-map.json
```

**Architecture:** The scanner cannot inject `storageState` into or intercept `page` objects inside Playwright's test runner from the outside — the test runner owns those contexts. Instead, we use a **two-part approach**:

1. **Custom Playwright reporter** — The scanner ships `@neonwatty/nav-map-reporter`, a Playwright reporter that receives test lifecycle events. Tests write navigation data to a shared temp directory via trace files.

2. **Scanner orchestrates the run** — The scanner:
   - Writes the `storageState` file to disk at a known path
   - Spawns `npx playwright test --config <config> --reporter=@neonwatty/nav-map-reporter` as a child process
   - The reporter captures: test name, every URL navigated to (from `page.on('framenavigated')` via `use: { trace: 'on' }` config), and takes screenshots at each new page
   - After tests complete, the scanner reads the reporter's output (a JSONL file of navigation events) and assembles the graph

**App config requirement:** The user must ensure their Playwright config:
- References the `storageState` file path (e.g., `use: { storageState: 'auth.json' }`)
- Has `trace: 'on'` or `trace: 'on-first-retry'` enabled

The scanner does NOT modify test files. It requires a one-time Playwright config adjustment to reference the auth state and enable tracing.

**Reporter output format** (JSONL, written to `<screenshot-dir>/.nav-events.jsonl`):
```jsonl
{"type":"navigate","testName":"studio login","from":"/auth/login","to":"/studio","timestamp":1234567890}
{"type":"screenshot","route":"/studio","file":"nav-screenshots/studio.webp","timestamp":1234567891}
{"type":"navigate","testName":"studio login","from":"/studio","to":"/studio/proj_abc","timestamp":1234567892}
```

After all tests finish, the scanner reads this JSONL, deduplicates, and produces `nav-map.json`.

**Parallel test handling:** The reporter attributes each navigation event to its test worker ID. Edges are only recorded within the same worker's sequential navigation — concurrent workers don't produce cross-worker edges. This prevents mixing navigations from independent tests.

**Schema change:** `meta.generatedBy` gains a new value `'e2e-record'`. This requires updating the `NavMapGraph` type in `packages/core/src/types.ts` (canonical type definition) and the inline type in `packages/scanner/src/modes/crawl.ts`.

### 3. Route Deduplication

When multiple test visits produce URLs like `/studio/proj_abc123` and `/studio/proj_def456`, they must collapse into a single `/studio/[id]` node.

**Two-tier strategy:**

1. **Static route patterns (preferred)** — If `--routes routes.json` is provided (from a prior `nav-map scan`), the recorder matches observed URLs against known file-system route patterns. Exact match wins. This also inherits group assignments, shared nav data, and auth metadata from the static scan.

2. **Heuristic fallback** — If no route patterns are provided, only high-confidence patterns are collapsed:
   - UUID segments: matches `/[0-9a-f]{8}-[0-9a-f]{4}-...` → `[id]`
   - Numeric IDs: matches `/^\d+$/` → `[id]`
   - Opaque hashes: matches `/^[a-z0-9]{20,}$/` (20+ hex/alphanumeric chars) → `[id]`
   - All other segments are treated as static. No "slug-like" guessing — if it doesn't match a known pattern, it stays literal. False negatives (two nodes instead of one) are better than false positives (collapsing distinct pages).

**Dedup rules for `Map<normalizedRoute, PageRecord>`:**
- **Screenshot**: keep the first fully-loaded capture. Detect login-page captures by checking if the final URL path contains `/auth/` or `/login` — if so, mark the node as `metadata.authRequired: true` and skip the screenshot (prefer a later authenticated capture).
- **Edges**: accumulate unique source→target pairs, track visit count as a confidence metric
- **Metadata**: merge across visits — auth requirement, page title, test context

### 4. Full Workflow

```bash
# 1. Log in interactively, save credentials
npx nav-map auth https://bleepthat.sh -o auth.json

# 2. (Optional) Static scan for route patterns + groups
npx nav-map scan ./bleep-that-shit -o routes.json

# 3. Ensure Playwright config references auth state:
#    use: { storageState: 'auth.json' }

# 4. Record from E2E tests against production
npx nav-map record \
  --playwright-config ./playwright.live.config.ts \
  --storage-state auth.json \
  --routes routes.json \
  --screenshot-dir nav-screenshots \
  -o nav-map.json
```

If `--routes` is provided, the recorder inherits group assignments, shared nav detection, and auth metadata from the static scan. If omitted, groups are auto-detected from route prefixes.

### 5. Files Changed

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/scanner/src/cli.ts` | Modify | Add `auth` and `record` commands with CLI options |
| `packages/scanner/src/modes/auth.ts` | Create | Interactive login flow, storageState save, SIGINT handling |
| `packages/scanner/src/modes/record.ts` | Create | Spawn Playwright test runner, read reporter output, assemble graph |
| `packages/scanner/src/modes/dedup.ts` | Create | Route normalization, heuristic dynamic segment detection, dedup |
| `packages/scanner/src/reporter.ts` | Create | Custom Playwright reporter — captures navigation events + screenshots, writes JSONL |
| `packages/scanner/src/index.ts` | Modify | Export new `runAuth` and `recordTests` functions |
| `packages/scanner/src/output/schema.ts` | Modify | Accept `'e2e-record'` as valid `generatedBy` value |
| `packages/core/src/types.ts` | Modify | Add `'e2e-record'` to `NavMapGraph.meta.generatedBy` union |

### 6. Bleep App Specifics

The bleep app's existing test infrastructure aligns well:
- `playwright.live.config.ts` targets production/preview with `workers: 1` (serial execution)
- Live auth setup already logs in via UI and saves storageState — same pattern as our `auth` command
- 16 distinct routes exercised across E2E tests, including authenticated studio pages
- The `record` command would capture Studio dashboard, Project view, and Settings with real data

### 7. Limitations

- **Session expiry**: For long test suites, auth tokens may expire mid-run. The scanner detects login-page redirects and warns the user, but does not auto-refresh. Recommendation: run `auth` immediately before `record`.
- **Config requirement**: The app's Playwright config must reference the `storageState` file and have tracing enabled. This is a one-time setup.
- **No test file modification**: Tests run unmodified. Only the Playwright config needs the reporter and auth state additions.

## Verification

1. `npx nav-map auth https://bleepthat.sh -o auth.json` → opens browser, user logs in, clicks "Save & Close", `auth.json` created
2. `npx nav-map record --playwright-config ./playwright.live.config.ts --storage-state auth.json -o nav-map.json` → runs live tests, reporter captures navigation events, produces nav-map.json
3. Output JSON has ≥16 nodes with authenticated screenshots for studio pages
4. Route dedup: `/studio/proj_abc` and `/studio/proj_def` collapse to single `/studio/[id]` node
5. Parallel-safe: edges are attributed per-worker, no cross-worker contamination
6. The output renders correctly in the `<NavMap>` component
