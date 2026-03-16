# Auth Scanning + E2E Recording Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `auth` command (interactive login with storageState save) and `record` command (run E2E tests, parse traces, produce nav-map.json with authenticated screenshots).

**Architecture:** `auth` opens a headed Chromium browser for manual login and saves storageState. `record` spawns Playwright test runner with a custom reporter that collects trace file paths. After tests complete, the scanner parses trace ZIPs for navigation events + screenshots, deduplicates routes, and assembles the graph.

**Tech Stack:** Playwright (chromium, trace parsing), commander (CLI), adm-zip (trace ZIP parsing), Node.js (child_process, fs, path)

**Spec:** `docs/superpowers/specs/2026-03-16-auth-scanning-e2e-recording-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `packages/scanner/src/modes/auth.ts` | Interactive login + storageState save | Create |
| `packages/scanner/src/modes/dedup.ts` | Route normalization + heuristic dynamic segment detection + dedup | Create |
| `packages/scanner/src/reporter.ts` | Custom Playwright reporter — collects trace paths, writes manifest | Create |
| `packages/scanner/src/modes/record.ts` | Spawn test runner, parse traces, extract nav events + screenshots, assemble graph | Create |
| `packages/scanner/src/cli.ts` | Add `auth` and `record` commands | Modify |
| `packages/scanner/src/index.ts` | Export new functions | Modify |
| `packages/core/src/types.ts` | Add `'e2e-record'` to `generatedBy` union | Modify |

---

## Task 1: `auth` command — interactive login + storageState save

**Files:**
- Create: `packages/scanner/src/modes/auth.ts`
- Modify: `packages/scanner/src/cli.ts`

- [ ] **Step 1: Create auth.ts**

Create `packages/scanner/src/modes/auth.ts` with the `runAuth` function that:
- Launches Chromium in headed mode
- Navigates to the provided URL
- Injects a floating "Save Auth & Close" button via `page.exposeFunction()`
- Registers a SIGINT handler as fallback
- Waits for either signal, then saves `context.storageState()` to the output path

- [ ] **Step 2: Add `auth` command to cli.ts**

Add import for `runAuth` and a new commander command with:
- `.argument('<url>')` — URL to open
- `.option('-o, --output <path>', 'Output file', 'auth.json')`

- [ ] **Step 3: Build and commit**

Run: `pnpm --filter @neonwatty/nav-map-scanner build`
Commit: `feat: add auth command for interactive login with storageState save`

---

## Task 2: Route deduplication module

**Files:**
- Create: `packages/scanner/src/modes/dedup.ts`

- [ ] **Step 1: Create dedup.ts**

Create `packages/scanner/src/modes/dedup.ts` with:
- `normalizeRoute(pathname, routePatterns?)` — matches against static patterns first, then heuristic (UUID, numeric, opaque hash)
- `matchRoutePattern(pathname, patterns)` — segment-by-segment matching where `[param]` matches anything
- `isLoginPage(url)` — checks for `/auth/`, `/login`, `/signin` in pathname
- `loadRoutePatterns(path)` — reads a nav-map.json and extracts route patterns
- Helper functions: `routeToId`, `routeToLabel`

- [ ] **Step 2: Build and commit**

Run: `pnpm --filter @neonwatty/nav-map-scanner build`
Commit: `feat: add route deduplication with pattern matching and heuristics`

---

## Task 3: Custom Playwright reporter

**Files:**
- Create: `packages/scanner/src/reporter.ts`

- [ ] **Step 1: Create reporter.ts**

A Playwright reporter class (default export) that:
- In `onTestEnd`, looks for trace attachment in `result.attachments` and records `{ testName, testFile, workerId, tracePath, status }`
- In `onEnd`, writes the manifest to `<outputDir>/.nav-manifest.json`
- Accepts `{ outputDir }` in constructor options

- [ ] **Step 2: Build and commit**

Run: `pnpm --filter @neonwatty/nav-map-scanner build`
Commit: `feat: add custom Playwright reporter for trace collection`

---

## Task 4: `record` command — parse traces, build graph

**Files:**
- Create: `packages/scanner/src/modes/record.ts`
- Modify: `packages/scanner/src/cli.ts`
- Modify: `packages/scanner/src/index.ts`
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Add `adm-zip` dependency**

Run: `pnpm --filter @neonwatty/nav-map-scanner add adm-zip && pnpm --filter @neonwatty/nav-map-scanner add -D @types/adm-zip`

- [ ] **Step 2: Update `generatedBy` type**

In `packages/core/src/types.ts`, add `'e2e-record'` to the `generatedBy` union type.

- [ ] **Step 3: Create record.ts**

Create `packages/scanner/src/modes/record.ts` with `recordTests(options)` that:
1. Loads route patterns from `--routes` if provided
2. Resolves the reporter path from the package's dist directory
3. Spawns `npx playwright test --config <config> --reporter=<reporterPath>` using `execFileSync('npx', [...args])` (NOT `execSync` with string — avoid shell injection)
4. Reads the manifest from `<screenshotDir>/.nav-manifest.json`
5. For each trace ZIP, uses `adm-zip` to parse `.trace`/`.jsonl` files for navigation events (type `'navigation'`, method `'navigated'`, method `'goto'`)
6. Deduplicates routes using the dedup module
7. Detects login-page redirects and marks subsequent pages as auth-required
8. Builds edges from sequential navigation within each test (per-worker isolation)
9. Creates named flows from each test's navigation sequence
10. Extracts screenshots from trace ZIPs and assigns to pages
11. Auto-detects groups from route prefixes
12. Returns a `NavMapGraph` with `generatedBy: 'e2e-record'`

Important: Use `execFileSync('npx', ['playwright', 'test', ...])` instead of `execSync()` to avoid command injection.

- [ ] **Step 4: Add `record` command to cli.ts**

Add import for `recordTests` and a new commander command with options:
- `--playwright-config <path>` (default: 'playwright.config.ts')
- `--storage-state <path>`
- `--routes <path>`
- `--screenshot-dir <dir>` (default: 'nav-screenshots')
- `-o, --output <path>` (default: 'nav-map.json')
- `-n, --name <name>`

- [ ] **Step 5: Update index.ts exports**

Add exports for `runAuth`, `recordTests`, `normalizeRoute`, `isLoginPage`, `loadRoutePatterns`.

- [ ] **Step 6: Build both packages**

Run: `pnpm --filter @neonwatty/nav-map build && pnpm --filter @neonwatty/nav-map-scanner build`

- [ ] **Step 7: Commit and push**

Commit: `feat: add record command with trace parsing, dedup, and flow discovery`
Push to main.
