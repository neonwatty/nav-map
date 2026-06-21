# @neonwatty/nav-map

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-7289da?style=flat&logo=discord&logoColor=white)](https://discord.gg/7xsxU4ZG6A)

Interactive navigation map visualization for Next.js apps and websites. Scan your routes, take screenshots, and render an interactive directed graph.

## Features

- **Hierarchy view** — top-down route tree with collapsible groups (default view)
- **Map view** — grouped layout with ELK.js hierarchical positioning
- **Flow view** — visualize user journeys step by step
- **Tree view** — explore reachable routes from any node
- **Search with preview** — Cmd+K with screenshot thumbnails and neighbor counts
- **Group focus** — double-click a group to isolate it
- **Gallery viewer** — browse flow step screenshots in a filmstrip
- **Workflow overview** — summarize sections, personas, auth states, redirects, health, and evidence from project manifests
- **Edge modes** — smooth curves, obstacle-aware routing, or corridor bundling
- **Right-click context menu** — copy route, open in browser, open in editor
- **Ctrl+Z undo** — undo node drags and group collapses
- **Semantic zoom** — 3 tiers: overview (groups only), compact (labels), detail (screenshots)
- **Dark/light mode** — auto-detects system preference
- **Unit tests** with CI

## Quick Start

### 1. Scan your project

```bash
# Scan a Next.js project directory
npx @neonwatty/nav-map-scanner scan ./my-next-app -o public/nav-map.json

# Or crawl a live URL
npx @neonwatty/nav-map-scanner crawl https://mysite.com -o public/nav-map.json
```

> **Note:** First run downloads Playwright's Chromium browser (~200-400 MB). Subsequent runs use the cached browser.

### 2. Install the component

```bash
npm install @neonwatty/nav-map
```

### 3. Configure Next.js

Add the package to `transpilePackages` in your `next.config.ts`:

```ts
// next.config.ts
const nextConfig = {
  transpilePackages: ['@neonwatty/nav-map'],
};
export default nextConfig;
```

### 4. Render the map

The component requires client-side rendering. Use `dynamic` import with `ssr: false`:

```tsx
// app/navmap/page.tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { NavMapGraph } from '@neonwatty/nav-map';

const NavMap = dynamic(
  () => import('@neonwatty/nav-map').then(mod => ({ default: mod.NavMap })),
  { ssr: false }
);

export default function NavMapPage() {
  const [graph, setGraph] = useState<NavMapGraph | null>(null);

  useEffect(() => {
    fetch('/nav-map.json')
      .then(r => r.json())
      .then(setGraph);
  }, []);

  if (!graph) return <div>Loading...</div>;

  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <NavMap graph={graph} screenshotBasePath="/screenshots" />
    </main>
  );
}
```

> **Important:** The container element must have an explicit width and height. The component renders at `width: 100%; height: 100%` of its parent. If the parent has no height (common in App Router layouts), the graph will be invisible.

## Minimal Example JSON

You can create `nav-map.json` manually without using the scanner:

```json
{
  "version": "1.0",
  "meta": {
    "name": "My App",
    "generatedAt": "2024-01-01T00:00:00Z",
    "generatedBy": "manual"
  },
  "nodes": [
    { "id": "home", "route": "/", "label": "Home", "group": "marketing" },
    { "id": "about", "route": "/about", "label": "About", "group": "marketing" },
    { "id": "login", "route": "/auth/login", "label": "Login", "group": "auth" },
    { "id": "dashboard", "route": "/dashboard", "label": "Dashboard", "group": "app" }
  ],
  "edges": [
    { "id": "e1", "source": "home", "target": "about", "label": "nav", "type": "link" },
    { "id": "e2", "source": "home", "target": "login", "label": "sign in", "type": "link" },
    { "id": "e3", "source": "login", "target": "dashboard", "label": "submit", "type": "redirect" }
  ],
  "groups": [
    { "id": "marketing", "label": "Marketing" },
    { "id": "auth", "label": "Auth" },
    { "id": "app", "label": "App" }
  ]
}
```

Edge types: `link`, `redirect`, `router-push`, `shared-nav`

## Workflow Atlas Manifests

For product-level maps, keep app-specific workflow knowledge in a project manifest and convert it to the standard `NavMapGraph` shape. This keeps `nav-map` generic while allowing each app to define personas, signed-in/signed-out states, human-readable actions, redirects, health, screenshots, and future inspection hints.

```json
{
  "version": "workflow-atlas/1.0",
  "name": "My App Workflow Atlas",
  "baseUrl": "http://localhost:3000",
  "layout": {
    "defaultViewMode": "map",
    "defaultTreeRootId": "home",
    "sectionOrder": ["public", "app"]
  },
  "personas": [
    { "id": "signed-out", "label": "Signed out visitor" },
    { "id": "signed-in", "label": "Signed in user" }
  ],
  "sections": [
    { "id": "public", "label": "Public Funnel", "routePrefix": "/" },
    { "id": "app", "label": "Signed-in App", "routePrefix": "/app" }
  ],
  "nodes": [
    {
      "id": "home",
      "route": "/",
      "label": "Home",
      "section": "public",
      "purpose": "Explain the product and start signup.",
      "personas": ["signed-out"],
      "authRequirement": "public",
      "health": "healthy",
      "inspect": { "selector": "main" }
    },
    {
      "id": "dashboard",
      "route": "/app",
      "label": "Dashboard",
      "section": "app",
      "purpose": "Primary signed-in workspace.",
      "personas": ["signed-in"],
      "authRequirement": "signed-in",
      "expectedRedirects": [
        { "when": "signed-out", "to": "/signin", "reason": "Requires a session" }
      ]
    }
  ],
  "edges": [
    {
      "source": "home",
      "target": "dashboard",
      "action": "Complete signup",
      "type": "redirect",
      "personas": ["signed-in"]
    }
  ],
  "surfaces": [
    {
      "id": "dashboard-concept",
      "label": "Dashboard Concept",
      "type": "generated-image",
      "section": "app",
      "purpose": "Explore the signed-in workspace before implementation.",
      "screenshot": "screenshots/prototypes/dashboard-concept.png",
      "sourceHints": ["docs/prototypes/dashboard.md"]
    }
  ],
  "flows": [{ "name": "Activation", "steps": ["home", "dashboard"] }]
}
```

Use `layout` when a project manifest knows the most readable first view. `defaultViewMode`
can be `hierarchy`, `map`, `flow`, or `tree`; `defaultTreeRootId` keeps Tree view from
opening without a root; and `sectionOrder` makes the atlas read in product-story order instead
of incidental route or JSON order.

Generate graph JSON from a manifest:

```bash
npx @neonwatty/nav-map-scanner workflow ./workflow.nav-map.json \
  -o public/nav-map.json
```

Capture deterministic Playwright screenshots at the same time:

```bash
npx @neonwatty/nav-map-scanner workflow ./workflow.nav-map.json \
  --base-url http://localhost:3000 \
  --screenshot-dir public/screenshots/workflow \
  -o public/nav-map.json
```

For protected routes, capture screenshots with a manifest auth-state id. The storage-state file is
loaded by Playwright but its contents are never needed in logs or prompts:

```bash
npx @neonwatty/nav-map-scanner workflow ./workflow.nav-map.json \
  --base-url http://localhost:3000 \
  --auth-state speaker \
  --screenshot-dir public/screenshots/speaker \
  -o public/nav-map.json
```

The screenshot paths are written relative to the graph output directory, so a Next.js app can usually render with `screenshotBasePath=""` when both files live under `public/`.

Use `surfaces` for prototype or design artifacts that should appear in the workflow graph but are
not live routes. Surface nodes support screenshots, generated images, HTML mockups, video or
keyframe references, components, and concept screens:

```json
{
  "surfaces": [
    {
      "id": "checkout-wireframe",
      "label": "Checkout Wireframe",
      "type": "html-mockup",
      "section": "prototype",
      "purpose": "Show the intended checkout review step before the route exists.",
      "screenshot": "screenshots/prototypes/checkout-wireframe.png",
      "sourceHints": ["mockups/checkout.html"]
    }
  ],
  "edges": [{ "source": "checkout-wireframe", "target": "checkout", "action": "Implemented by" }],
  "flows": [{ "name": "Prototype handoff", "steps": ["checkout-wireframe", "checkout"] }]
}
```

Converted surface nodes use stable synthetic routes like `prototype://checkout-wireframe` and
carry `metadata.kind: "prototype-surface"` plus `metadata.surfaceType`. They can be referenced by
edges and flows like route nodes, but `nav-map workflow --base-url ... --screenshot-dir ...` only
navigates live `nodes` for Playwright screenshot capture. Surface screenshots are treated as
existing visual evidence from the manifest.

### Preview Modes

Artifact kind describes what a workflow node represents, such as an app route, HTML mockup,
component reference, or generated concept. The global `Preview: Saved | Target` control is a
preview-source preference, not an app/mockup/prototype mode switch. It separates four concepts that
matter during manual QA:

- `Artifact`: the node's source type, such as App, Mockup, or Prototype.
- `Current Preview`: what the card or details panel is showing now, such as Saved Screenshot,
  Static Reference, Live Iframe, Checking Target, or Saved Fallback.
- `Live Target`: whether a URL is configured, blocked, or intentionally static.
- `Target Preflight`: a lightweight browser check for the configured URL, separate from route or
  workflow audit health.

Target preview mode is best-effort. When `Target` is selected, nav-map runs a browser-side
preflight for the current flow, or for the whole graph when no flow is focused. The toolbar shows a
compact target summary, and each node keeps a small preflight label so reviewers can tell the
difference between targets that are ready, unverified external, still checking, offline,
intentionally static, blocked, or missing a target. Nodes without verified live rendering keep
saved screenshot/static fallbacks visible, so reviewers can still inspect prototype intent, blocked
auth states, external-service gaps, and artifacts that are not safe or meaningful to execute inside
the preview pane.

The selected-node details panel also exposes a local **Live Target** editor for dogfooding:

- App nodes can override the graph app base URL, for example `http://localhost:3000`.
- Mockup, prototype, and other surface nodes can override their direct live URL.
- Overrides are stored in browser local storage per graph and are not written back to manifests.
- The panel shows the resolved live URL and whether it came from the manifest, graph base URL, or a
  local override.
- When Target mode is active, nav-map probes scoped live targets from the browser and labels them
  `Ready`, `Unverified External`, `Checking`, `Offline`, `Static Reference`, `Blocked`, or
  `No Target`. Offline, unavailable, and unverified targets replace the iframe with a visible
  message telling the reviewer what to fix or verify, while preserving the saved screenshot
  fallback.
- App-route live iframes allow same-origin browser APIs so real app routes that use storage or
  client-side routers can run; mockup and prototype iframes keep a stricter sandbox.
- Browser-side readiness is practical reachability, not a full audit: cross-origin `no-cors`
  checks cannot always prove the exact HTTP status or whether the route rendered meaningful app
  content. Use scanner/probe receipts or manual browser walkthroughs when you need stronger proof.

When dogfooding preview behavior, record receipts for commands run, local URLs checked, routes
tested, screenshots captured, auth state id if one was used, failures, warnings, and known
limitations. Do not inspect or print Playwright auth storage, cookies, tokens, environment values,
or secrets.

### Demo Smoke

The demo smoke is the local browser receipt for manual-QA regressions across the bundled PRcard,
Deckchecker, Bleep, and Seatify local dogfood datasets:

```bash
pnpm dev
pnpm smoke:demo
```

By default the smoke looks for the demo on `http://localhost:3000` and then
`http://localhost:3001`. Set `DEMO_SMOKE_URL=http://localhost:<port>` or pass
`--url http://localhost:<port>` when a different local server is under review.

The smoke uses an 858px viewport and verifies that all dataset URLs render, the `Saved`/`Target`
preview controls are usable, PRcard app/prototype/mockup node details remain distinct,
Deckchecker and Bleep app nodes expose non-ready target states without requiring external service
availability, Seatify local nodes expose app-mode screenshots, protected-route redirect context,
and app target readiness labels, Target node details expose per-node readiness labels, PRcard
details show artifact-specific actions such as `Open app`, disabled static-prototype `Open target`,
and `Open mockup`, Search can select a node, Audit can focus an issue, PRcard explains unavailable
animation before flow mode, PRcard flow animation starts and stops, and invalid dataset keys show
an explicit warning. It prints a JSON receipt with
routes, checks, warnings, and failures. Keep it local-only: if external app targets are offline,
unavailable, or unverified, the smoke should assert those labels instead of depending on live
third-party services.

For Seatify dogfooding, run Seatify separately and opt into the local reachability assertion:

```bash
cd /Users/neonwatty/Desktop/seatify
npm run dev -- -p 3002

cd /Users/neonwatty/Desktop/nav-map-fresh
SEATIFY_LOCAL_EXPECT_REACHABLE=1 pnpm smoke:demo --url http://localhost:<nav-map-demo-port>
```

You can also convert manifests in code without the React component entry:

```ts
import { workflowManifestToGraph } from '@neonwatty/nav-map/workflow';

const graph = workflowManifestToGraph(manifest);
```

Graphs with workflow metadata render a compact overview in the map chrome. It is derived from
generic graph fields only: node `metadata.section`, `metadata.personas`,
`metadata.authRequirement`, `metadata.expectedRedirects`, `metadata.health`, `metadata.inspect`,
`metadata.sourceHints`, node screenshots, redirect edges, and flow galleries. This gives users and
agents a first-glance inventory of product lanes, auth states, redirects, and evidence before a
node is selected. Plain route maps without workflow or evidence signals do not show this overview.

Overview chips are interactive filters. Click a section, persona, auth, health, or evidence chip to
focus the graph on matching routes and workflow edges; matching nodes and edges remain emphasized
while non-matching graph elements are dimmed. Click another chip to change the focus, click the
active chip again to clear it, or press `Escape` to clear workflow filters from anywhere in the map.

The demo app includes `packages/demo/public/prcard.workflow.json` and a generated `prcard.nav-map.json` fixture. It models PRcard public funnel, auth, quick setup, creator/card studio, published-card, redirect, API, and retired-route workflows without adding PRcard logic to nav-map core.

The manifest `inspect` field is intentionally small today. It is reserved for future live inspection and agent explorer modes where a browser/Codex agent can walk routes, compare observed redirects and screenshots to the manifest, flag UX or health issues, and propose manifest updates.

### Agent CLI Loop

Use workflow manifests as compact, deterministic context for agents before they inspect an app:

```bash
nav-map context deckchecker-speaker.workflow.json --auth-state speaker --focus speaker --format markdown
nav-map context deckchecker-speaker.workflow.json --auth-state speaker --focus speaker --format json --contract
nav-map auth-state capture deckchecker-speaker.workflow.json --state speaker --base-url http://localhost:3000 --headed --out .nav-map/auth/deckchecker-speaker.storage.json
nav-map auth-state verify deckchecker-speaker.workflow.json --state speaker --base-url http://localhost:3000 --contract
nav-map probe deckchecker-speaker.workflow.json --base-url http://localhost:3000 --auth-state speaker --flow "Speaker deck workflow" --contract
nav-map crawl http://localhost:3000/my/events --workflow-manifest deckchecker-speaker.workflow.json --auth-state speaker --max-pages 10
nav-map workflow deckchecker-speaker.workflow.json --base-url http://localhost:3000 --auth-state speaker --screenshot-dir public/screenshots/speaker -o public/nav-map.json
nav-map workflow deckchecker-speaker.workflow.json --inspect --format json --contract -o .nav-map/workflow.inspect.json
nav-map diff deckchecker-speaker.workflow.json --probe .nav-map/probe-runs/latest.json --format json
```

Filter context before handing it to an agent with comma-separated values for sections, personas,
auth states, health states, and evidence kinds:

```bash
nav-map context packages/demo/public/deckchecker-speaker.workflow.json \
  --section speaker,boundary \
  --persona speaker \
  --auth speaker \
  --evidence screenshot,redirect \
  --format markdown

nav-map context packages/demo/public/prcard.workflow.json \
  --section studio,published \
  --persona signed-in-with-github,public-viewer \
  --auth signed-in-with-github,public \
  --health healthy,warning \
  --evidence screenshot,inspect \
  --format json \
  --contract
```

Auth state files can impersonate users. Keep `.nav-map/auth/` gitignored and never paste storage-state contents into logs, prompts, issues, or commits. Commands that accept `--workflow-manifest` and `--auth-state` resolve the storage-state path from the manifest and pass it to Playwright without needing the storage file contents in agent context.
Context and contract output intentionally include auth-state ids and summaries, not raw
storage-state JSON, cookies, bearer tokens, OAuth secrets, private keys, or env values.

Use `--contract` when an agent needs a stable envelope rather than raw command data. Contract
JSON includes `schemaVersion`, `kind`, `summary`, `data`, `artifacts`, and `nextActions`.

## NavMap Props

All props are optional.

| Prop | Type | Description |
| --- | --- | --- |
| `graph` | `NavMapGraph` | The graph data object |
| `graphUrl` | `string` | URL to fetch graph JSON (alternative to `graph` prop) |
| `screenshotBasePath` | `string` | Base path for screenshot images (default: `''`) |
| `analytics` | `AnalyticsAdapter` | Optional analytics adapter (e.g. PostHog) |
| `className` | `string` | CSS class for the container |
| `style` | `CSSProperties` | Inline styles for the container |

When both `graph` and `graphUrl` are provided, `graph` takes priority.

## Scanner CLI

```bash
npx @neonwatty/nav-map-scanner <command> [options]
```

Agent-oriented screenshot/mockup/app QA loop:

```bash
node packages/scanner/bin/nav-map.js workflow packages/demo/public/prcard.workflow.json --inspect --contract
node packages/scanner/bin/nav-map.js context packages/demo/public/prcard.workflow.json --format json --contract
node packages/scanner/bin/nav-map.js auth-state verify packages/demo/public/deckchecker-speaker.workflow.json --state speaker --base-url http://localhost:3000 --contract
node packages/scanner/bin/nav-map.js probe packages/demo/public/prcard.workflow.json --base-url http://localhost:3000 --contract
node packages/scanner/bin/nav-map.js diff packages/demo/public/prcard.workflow.json --probe .nav-map/probe-runs/latest.json --format json
node packages/scanner/bin/nav-map.js workflow packages/demo/public/prcard.workflow.json --base-url http://localhost:3000 --screenshot-dir public/screenshots/workflow -o public/nav-map.json
```

Use `workflow --inspect` and `context --contract` first so agents see app routes and
prototype/mockup surfaces before touching a browser. The UI `Target` preview is a lightweight
reachability preflight; use `probe` and `diff` receipts for route/workflow audit evidence.
`workflow --inspect` writes `workflow.inspect.json` by default unless `-o/--output` is provided;
normal workflow generation writes `nav-map.json` by default. `diff --format json` writes
`.nav-map/probe-runs/latest.diff.json` by default and validates that the probe receipt matches
the manifest name and route node ids before writing.
Workflow screenshot generation navigates app route nodes only. Prototype, mockup, component, and
concept surfaces stay as manifest artifacts and are reported as skipped live captures in the
generation receipt. Auth state is referenced by id only; do not inspect or print storage-state
contents.

### Commands

| Command | Description |
| --- | --- |
| `scan <dir>` | Scan a Next.js project directory for routes |
| `crawl <url>` | Crawl a live URL and discover pages |
| `auth <url>` | Capture authentication state for protected pages |
| `auth-state` | Capture or verify workflow auth states |
| `record <dir>` | Record navigation with Playwright |
| `record-flows` | Record user flows from Playwright test specs |
| `generate` | Load `nav-map.config.json`, optionally log in, crawl, and write output |
| `check-config` | Validate `nav-map.config.json` without launching a browser |
| `diagnostics <file>` | Inspect crawl diagnostics from `nav-map.json` or diagnostics JSON |
| `context <manifest>` | Render agent-consumable context from a workflow manifest |
| `probe <manifest>` | Probe workflow routes and write verification receipts |
| `diff <manifest>` | Render expected-vs-observed probe findings |
| `workflow <manifest>` | Generate `nav-map.json` from a project workflow manifest, optionally with screenshots |

### `scan` options

| Flag | Description | Default |
| --- | --- | --- |
| `-o, --output <path>` | Output file path | `nav-map.json` |
| `-s, --screenshots` | Capture screenshots (requires `--base-url`) | off |
| `--base-url <url>` | Base URL for screenshots | — |
| `--screenshot-dir <dir>` | Screenshot output directory | `nav-screenshots` |
| `-n, --name <name>` | Project name | — |
| `--no-shared-nav` | Skip shared nav detection | — |

### `crawl` options

| Flag | Description | Default |
| --- | --- | --- |
| `-o, --output <path>` | Output file path | `nav-map.json` |
| `--screenshot-dir <dir>` | Screenshot output directory | — |
| `-n, --name <name>` | Project name | — |
| `--max-pages <n>` | Maximum pages to crawl | `50` |
| `--no-interactions` | Skip click-based navigation discovery | off |
| `--max-interactions <n>` | Maximum click candidates to try per page | `20` |
| `--include-interaction <pattern...>` | Only click interactions matching these labels | — |
| `--exclude-interaction <pattern...>` | Skip interactions matching these labels | — |
| `--diagnostics-output <path>` | Write crawl diagnostics JSON sidecar | — |
| `--fail-on-diagnostics` | Exit non-zero if crawl diagnostics contain failures or page-limit truncation | off |

`crawl` and `generate` include crawl diagnostics in `graph.meta.diagnostics.crawl`, including attempted page count, successful page count, failed page loads, screenshot failures, and whether the page limit was reached. Use `--diagnostics-output <path>` to also write those diagnostics as a machine-readable JSON sidecar for CI artifacts.

### `generate` config

`generate` reads `nav-map.config.json` by default. These crawl interaction settings are equivalent to the `crawl` CLI flags:

```json
{
  "url": "https://myapp.com",
  "output": "nav-map.json",
  "diagnosticsOutput": ".nav-map/diagnostics.json",
  "failOnDiagnostics": true,
  "interactions": true,
  "maxInteractionsPerPage": 20,
  "includeInteraction": ["settings", "profile"],
  "excludeInteraction": ["delete", "logout"]
}
```

Validate config without launching Playwright:

```bash
npx @neonwatty/nav-map-scanner check-config -c nav-map.config.json
```

Use `--fail-on-diagnostics` with `crawl` in CI when partial crawls should fail the job. For `generate`, set `"failOnDiagnostics": true` in config or pass `--fail-on-diagnostics`; pair it with `diagnosticsOutput` or `--diagnostics-output .nav-map/diagnostics.json` when CI should also archive crawl failure details.

Inspect archived diagnostics in CI logs or locally:

```bash
npx @neonwatty/nav-map-scanner diagnostics .nav-map/diagnostics.json
npx @neonwatty/nav-map-scanner diagnostics .nav-map/diagnostics.json --summary
npx @neonwatty/nav-map-scanner diagnostics public/nav-map.json --json
```

### `auth` — Capture auth state

```bash
# Opens a browser for you to log in, saves session state
npx @neonwatty/nav-map-scanner auth https://myapp.com -o auth.json

# Then use it with scan for authenticated screenshots
npx @neonwatty/nav-map-scanner scan ./app --screenshots --base-url https://myapp.com --storage-state auth.json
```

### `record-flows` — Record user flows

```bash
# Record flows from Playwright test specs
npx @neonwatty/nav-map-scanner record-flows \
  --flows-dir ./tests/flows \
  --base-url http://localhost:3000
```

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Cmd+K` or `/` | Search with preview |
| `Down` / `Right` | Navigate to outgoing neighbor |
| `Up` / `Left` | Navigate to incoming neighbor |
| `Backspace` | Go back in path |
| `Escape` | Close panel / exit focus / clear selection |
| `0` | Reset view |
| `F` | Toggle focus mode (dims unconnected nodes) |
| `N` | Toggle shared nav edges |
| `R` | Toggle redirect edges |
| `A` | Toggle ambient animations |
| `T` | Toggle ghost trails |
| `E` | Toggle edge rendering mode |
| `Cmd+Z` | Undo (node drag, group collapse) |
| `?` | Show help |

## Bundle Size

The component has three main runtime dependencies:

| Package | Approximate Size |
| --- | --- |
| `@xyflow/react` | ~300 KB min+gz |
| `elkjs` | ~200 KB (bundled variant, runs on main thread) |
| `html2canvas` | ~150 KB |

Total: ~500-700 KB minified. Layout computation runs synchronously on the main thread, which is fine for typical Next.js apps (tens to low hundreds of routes).

## Analytics Integration

```tsx
import { NavMap, PostHogAnalytics } from '@neonwatty/nav-map';

const analytics = new PostHogAnalytics({
  apiKey: 'phc_...',
  projectId: 12345,
});

<NavMap graph={graph} analytics={analytics} />
```

You can also implement a custom `AnalyticsAdapter` for any other analytics provider.

## Monorepo Structure

```
packages/
  core/       — @neonwatty/nav-map — React component library
  scanner/    — @neonwatty/nav-map-scanner — CLI for scanning and crawling
  demo/       — Demo Next.js app
landing/      — Static landing page with video demos
```

## License

MIT
