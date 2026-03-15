# @neonwatty/nav-map

Interactive navigation map visualization for Next.js apps and websites. Scan your routes, take screenshots, and render an interactive directed graph with React Flow.

## Features

- **Route scanning** -- Next.js App Router, Pages Router, or live URL crawling
- **Interactive graph** -- React Flow + ELK.js hierarchical layout
- **Screenshot thumbnails** on every node
- **Node selection** with neighbor highlighting and dimming
- **Connection panel** showing incoming/outgoing edges
- **Walkthrough breadcrumb** with presentation mode
- **Search** (Cmd+K) with fuzzy matching
- **Keyboard navigation** -- arrow keys, Backspace, Escape, and more
- **Shared nav toggle** -- show or hide shared navigation links
- **Semantic zoom** -- detailed nodes at close zoom, compact nodes when zoomed out
- **Dark/light mode** -- auto-detects system preference
- **Analytics overlay** -- PostHog integration built-in
- **MiniMap, Controls, Legend**

## Quick Start

### 1. Scan your project

```bash
# Scan a Next.js project directory
npx @neonwatty/nav-map-scanner scan ./my-next-app -o nav-map.json

# Or crawl a live URL
npx @neonwatty/nav-map-scanner crawl https://mysite.com
```

### 2. Install the component

```bash
npm install @neonwatty/nav-map
```

### 3. Render the map

```tsx
import { NavMap } from '@neonwatty/nav-map';
import { useState, useEffect } from 'react';

function App() {
  const [graph, setGraph] = useState(null);

  useEffect(() => {
    fetch('/nav-map.json')
      .then((r) => r.json())
      .then(setGraph);
  }, []);

  return <NavMap graph={graph} screenshotBasePath="/screenshots" />;
}
```

## NavMap Props

| Prop | Type | Description |
| --- | --- | --- |
| `graph` | `NavMapGraph` | The graph data object |
| `graphUrl` | `string` | URL to fetch graph JSON from (alternative to passing `graph` directly) |
| `screenshotBasePath` | `string` | Base path for screenshot images |
| `analytics` | `AnalyticsAdapter` | Optional analytics adapter (e.g. PostHog) |
| `className` | `string` | CSS class for the container |
| `style` | `CSSProperties` | Inline styles for the container |

## Scanner CLI

```bash
nav-map scan <dir> [options]
nav-map crawl <url> [options]
```

### `scan` options

| Flag | Description | Default |
| --- | --- | --- |
| `-o, --output <path>` | Output file path | `nav-map.json` |
| `-s, --screenshots` | Capture screenshots | off |
| `--base-url <url>` | Base URL for screenshots | -- |
| `--screenshot-dir <dir>` | Screenshot output directory | `nav-screenshots` |
| `-n, --name <name>` | Project name | -- |
| `--no-shared-nav` | Skip shared nav detection | -- |

### `crawl` options

| Flag | Description | Default |
| --- | --- | --- |
| `-o, --output <path>` | Output file path | `nav-map.json` |
| `--screenshot-dir <dir>` | Screenshot output directory | -- |
| `-n, --name <name>` | Project name | -- |
| `--max-pages <n>` | Maximum pages to crawl | `50` |

## nav-map.json Schema

The scanner outputs a `NavMapGraph` object with the following top-level fields:

- **`nodes`** -- Array of route nodes. Each node has an `id` (the route path), a `label`, an optional `screenshot` filename, and optional `group` membership.
- **`edges`** -- Array of directed edges. Each edge has a `source` and `target` node ID representing a navigation link between two routes.
- **`groups`** -- Optional array of route groups (e.g. by layout or directory) used to visually cluster nodes.
- **`sharedNav`** -- Optional array of edges that represent shared navigation links (headers, footers, sidebars). These can be toggled on/off in the UI.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Down` / `Right` | Navigate to outgoing neighbor |
| `Up` / `Left` | Navigate to incoming neighbor |
| `Backspace` | Go back in path |
| `Escape` | Clear selection |
| `/` or `Cmd+K` | Open search |
| `0` | Reset view / fit to screen |
| `L` | Toggle layout direction |
| `N` | Toggle shared nav edges |
| `O` | Open selected route in browser |
| `?` | Show help |

## Analytics Integration

Nav-map ships with a built-in PostHog analytics adapter. Pass it via the `analytics` prop to overlay page view counts and other metrics on graph nodes.

```tsx
import { NavMap, PostHogAnalytics } from '@neonwatty/nav-map';

const analytics = new PostHogAnalytics({
  apiKey: 'phc_...',
  projectId: 12345,
});

function App() {
  return <NavMap graph={graph} analytics={analytics} />;
}
```

You can also implement a custom `AnalyticsAdapter` to integrate with any other analytics provider.

## Monorepo Structure

```
packages/
  core/       — @neonwatty/nav-map — React component library (React Flow graph, UI, hooks)
  scanner/    — @neonwatty/nav-map-scanner — CLI for scanning routes and crawling URLs
  demo/       — Demo Next.js app showcasing the component
```

## License

MIT
