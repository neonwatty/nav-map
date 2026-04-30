# @neonwatty/nav-map

Interactive navigation map visualization for Next.js apps and websites. Scan your routes, take screenshots, and render an interactive directed graph.

## Features

- **Hierarchy view** — top-down route tree with collapsible groups (default view)
- **Map view** — grouped layout with ELK.js hierarchical positioning
- **Flow view** — visualize user journeys step by step
- **Tree view** — explore reachable routes from any node
- **Search with preview** — Cmd+K with screenshot thumbnails and neighbor counts
- **Group focus** — double-click a group to isolate it
- **Gallery viewer** — browse flow step screenshots in a filmstrip
- **Edge modes** — smooth curves, obstacle-aware routing, or corridor bundling
- **Right-click context menu** — copy route, open in browser, open in editor
- **Ctrl+Z undo** — undo node drags and group collapses
- **Semantic zoom** — 3 tiers: overview (groups only), compact (labels), detail (screenshots)
- **Dark/light mode** — auto-detects system preference
- **87 unit tests** with CI

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

### Commands

| Command | Description |
| --- | --- |
| `scan <dir>` | Scan a Next.js project directory for routes |
| `crawl <url>` | Crawl a live URL and discover pages |
| `auth <url>` | Capture authentication state for protected pages |
| `record <dir>` | Record navigation with Playwright |
| `record-flows <dir>` | Record user flows from Playwright test specs |
| `generate` | Load `nav-map.config.json`, optionally log in, crawl, and write output |
| `check-config` | Validate `nav-map.config.json` without launching a browser |

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

### `generate` config

`generate` reads `nav-map.config.json` by default. These crawl interaction settings are equivalent to the `crawl` CLI flags:

```json
{
  "url": "https://myapp.com",
  "output": "nav-map.json",
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
npx @neonwatty/nav-map-scanner record-flows ./app \
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
