# SEO & Organic Traffic Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `navmap.neonwatty.com` — a Next.js marketing/docs/gallery site that drives organic traffic to nav-map through programmatic content and technical SEO.

**Architecture:** New `packages/site` Next.js app in the monorepo. Docs generated at build time from source code via ts-morph. Gallery pages generated from scanner JSON committed to the repo. Landing page migrated from static HTML. All pages statically generated for Core Web Vitals.

**Tech Stack:** Next.js 16, React 19, ts-morph (doc generation), Vercel (hosting)

**Spec:** `docs/superpowers/specs/2026-03-30-seo-organic-traffic-design.md`

---

## Required Fixes (Apply During Implementation)

The following corrections were identified in plan review and MUST be applied:

### 1. Nested URL structure (CRITICAL)

The spec requires nested URLs: `/docs/cli/scan`, `/docs/views/hierarchy`, etc. The plan's flat `[slug]` route produces `/docs/cli-scan` instead. **Fix:** Use nested route structure:
- `app/docs/[slug]/page.tsx` — for top-level docs (getting-started, component-api, keyboard-shortcuts, analytics)
- `app/docs/cli/[slug]/page.tsx` — for CLI docs (scan, crawl, record, record-flows, generate, serve, auth)
- `app/docs/views/[slug]/page.tsx` — for view mode docs (hierarchy, flow, map, tree)

Update the doc generation script slug format: use `cli/scan` instead of `cli-scan`, `views/hierarchy` instead of `views-hierarchy`. The JSON files should be written to nested directories: `src/data/docs/cli/scan.json`, etc.

### 2. Split generate-docs.ts (CRITICAL)

The script exceeds the 300-line max-lines rule. Split into:
- `scripts/generate-docs/types.ts` — shared DocPage, DocSection, PropRow interfaces + writeDocPage utility
- `scripts/generate-docs/component-api.ts` — generateComponentApi (uses ts-morph)
- `scripts/generate-docs/cli-pages.ts` — generateCliPages
- `scripts/generate-docs/view-pages.ts` — generateViewModePages
- `scripts/generate-docs/static-pages.ts` — generateGettingStarted, generateKeyboardShortcuts, generateAnalytics
- `scripts/generate-docs/index.ts` — main entry that imports and runs all generators

Update `prebuild` script to: `tsx scripts/generate-docs/index.ts`

### 3. ESLint coverage for site package (CRITICAL)

Add to `eslint.config.mjs` a React-specific override for `packages/site/**/*.{ts,tsx}` matching the existing `packages/core/src/**` pattern. Also add `no-console: 'off'` for `packages/site/scripts/**/*.ts`.

### 4. Canonical URLs on every page (CRITICAL)

Add `alternates: { canonical: '...' }` to every page's metadata export. For dynamic pages, compute the canonical URL from the slug:
```tsx
alternates: { canonical: `https://navmap.neonwatty.com/docs/${slug}` }
```

### 5. Per-page-type OG images (IMPORTANT)

Create additional OG image routes:
- `app/docs/[slug]/opengraph-image.tsx` — branded template with page title
- `app/docs/cli/[slug]/opengraph-image.tsx` — same
- `app/docs/views/[slug]/opengraph-image.tsx` — same
- `app/gallery/[slug]/opengraph-image.tsx` — uses the hierarchy PNG with app name overlaid

### 6. Gallery data.json schema additions (IMPORTANT)

Add to the gallery `GalleryData` interface and each `data.json`:
- `stars: number` — GitHub star count at time of scan
- `frameworkVersion: string` — Next.js version detected
- `screenshots: string[]` — array of screenshot filenames for thumbnail section

Update the gallery detail page to render these fields.

### 7. Internal cross-linking (IMPORTANT)

- Doc pages should include a "See it in action" section linking to relevant gallery entries
- Gallery pages should link to relevant docs (e.g., "Generated with `nav-map scan`" → `/docs/cli/scan`)
- Getting Started doc should show gallery examples as proof of what the tool produces

### 8. Type-safe gallery graph (IMPORTANT)

Import `NavMapGraph` from `@neonwatty/nav-map` in the gallery data interface. Type `graph` as `NavMapGraph` instead of `Record<string, unknown>`. Remove the `as never` cast.

### 9. NavMapEmbed hydration fix (MINOR)

Initialize `isMobile` as `null` (not `false`). Render a loading skeleton when `null`. This prevents the desktop component from briefly loading on mobile before the useEffect fires.

---

## Chunk 1: Project Scaffolding & Landing Page Migration

### Task 1: Scaffold packages/site Next.js app

**Files:**
- Create: `packages/site/package.json`
- Create: `packages/site/tsconfig.json`
- Create: `packages/site/next.config.ts`
- Create: `packages/site/app/layout.tsx`
- Create: `packages/site/app/globals.css`
- Create: `packages/site/app/page.tsx`
- Modify: `knip.json` (add site workspace)
- Modify: Root `package.json` (add site scripts)

- [ ] **Step 1: Create packages/site/package.json**

```json
{
  "name": "site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "prebuild": "tsx scripts/generate-docs.ts",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint app/ components/ scripts/"
  },
  "dependencies": {
    "@neonwatty/nav-map": "workspace:*",
    "next": "^16.1.7",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@types/react": "^19.1.0",
    "ts-morph": "^27.0.2",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create packages/site/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true
  },
  "include": [
    "app/**/*.ts", "app/**/*.tsx",
    "components/**/*.ts", "components/**/*.tsx",
    "scripts/**/*.ts", "src/**/*.ts",
    "next-env.d.ts", ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create packages/site/next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@neonwatty/nav-map'],
};

export default nextConfig;
```

- [ ] **Step 4: Create packages/site/app/globals.css**

Migrate the CSS custom properties and base styles from `landing/index.html` (lines 18-200). Extract only the `:root` variables, base resets, and typography — component-specific styles go into CSS modules.

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

:root {
  --bg-deep: #06060c;
  --bg-surface: #0c0c16;
  --bg-elevated: #12121e;
  --border: #1a1a2e;
  --border-hover: #2a2a4a;
  --text-primary: #e0e0ec;
  --text-secondary: #8888a8;
  --text-muted: #555570;
  --accent-blue: #5b9bf5;
  --accent-green: #4eca6a;
  --accent-purple: #b07ce8;
  --accent-orange: #f0a050;
  --font-display: 'Outfit', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-display);
  background: var(--bg-deep);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent-blue); text-decoration: none; }
a:hover { text-decoration: underline; }
```

- [ ] **Step 5: Create packages/site/app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://navmap.neonwatty.com'),
  title: {
    default: 'nav-map — Interactive Navigation Map Visualization',
    template: '%s | nav-map',
  },
  description:
    "Visualize your Next.js app's navigation architecture with interactive graphs, flow animations, and group focus modes.",
  openGraph: {
    type: 'website',
    siteName: 'nav-map',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://navmap.neonwatty.com' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create a minimal packages/site/app/page.tsx placeholder**

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>nav-map</h1>
      <p>Interactive navigation map visualization for Next.js apps.</p>
    </main>
  );
}
```

- [ ] **Step 7: Add site workspace to knip.json**

Add to the `"workspaces"` object in `knip.json`:

```json
"packages/site": {
  "entry": ["app/**/{layout,page}.tsx", "scripts/**/*.ts"],
  "project": ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "scripts/**/*.ts"],
  "ignoreDependencies": ["@neonwatty/nav-map", "tsx"]
}
```

- [ ] **Step 8: Add site scripts to root package.json**

Add to root `package.json` `"scripts"`:

```json
"dev:site": "pnpm --filter site dev",
"build:site": "pnpm --filter @neonwatty/nav-map build && pnpm --filter site build"
```

- [ ] **Step 9: Install dependencies and verify**

Run: `cd packages/site && pnpm install`
Run: `pnpm dev:site`
Expected: Next.js dev server starts on port 3001, placeholder page renders.

- [ ] **Step 10: Commit**

```bash
git add packages/site/ knip.json package.json
git commit -m "feat(site): scaffold next.js marketing site package"
```

---

### Task 2: Migrate landing page to Next.js

**Files:**
- Modify: `packages/site/app/page.tsx`
- Create: `packages/site/app/page.module.css`
- Create: `packages/site/components/CopyInstall.tsx`
- Create: `packages/site/components/FeatureCard.tsx`
- Create: `packages/site/components/ScrollReveal.tsx`
- Copy: `landing/videos/*` → `packages/site/public/videos/`
- Copy: `landing/og-image.png` → `packages/site/public/og-image.png`

The landing page at `landing/index.html` is 672 lines of inline HTML+CSS+JS. Migrate it into React components while preserving the exact visual design.

- [ ] **Step 1: Copy static assets**

```bash
mkdir -p packages/site/public/videos
cp landing/videos/* packages/site/public/videos/
cp landing/og-image.png packages/site/public/og-image.png
```

- [ ] **Step 2: Create CopyInstall component**

File: `packages/site/components/CopyInstall.tsx`

Client component for the "npm install" hero command with click-to-copy. Extract the copy-to-clipboard logic from `landing/index.html` (lines 640-670).

```tsx
'use client';

import { useState } from 'react';

export function CopyInstall() {
  const [copied, setCopied] = useState(false);
  const command = 'npm install @neonwatty/nav-map';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="install-command" title="Click to copy">
      <code>$ {command}</code>
      <span className="copy-hint">{copied ? 'Copied!' : 'Click to copy'}</span>
    </button>
  );
}
```

- [ ] **Step 3: Create FeatureCard component**

File: `packages/site/components/FeatureCard.tsx`

```tsx
interface FeatureCardProps {
  title: string;
  description: string;
  videoSrc: string;
  gradient: string;
}

export function FeatureCard({ title, description, videoSrc, gradient }: FeatureCardProps) {
  return (
    <div className="feature-card">
      <div className="feature-video" style={{ borderColor: gradient }}>
        <video autoPlay loop muted playsInline>
          <source src={videoSrc} type="video/webm" />
        </video>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
```

- [ ] **Step 4: Create ScrollReveal wrapper**

File: `packages/site/components/ScrollReveal.tsx`

```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function ScrollReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="scroll-reveal">
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Migrate full page layout**

Rewrite `packages/site/app/page.tsx` to compose the landing page from the components above. Migrate the full HTML structure from `landing/index.html`, converting to JSX. Include:
- Hero section with gradient title, CopyInstall, links (GitHub, npm, Live Demo)
- Features section with 6 FeatureCards wrapped in ScrollReveal
- Capabilities grid (6 cards: undo, zoom, search, keyboard, dark/light, export)
- Quick start code section
- Footer with social links

- [ ] **Step 6: Migrate CSS to page.module.css**

Extract all component-specific CSS from `landing/index.html` (lines 18-500) into `packages/site/app/page.module.css`. Convert class names to CSS module format. Keep the base styles in `globals.css`.

- [ ] **Step 7: Verify visual parity**

Run: `pnpm dev:site`
Open http://localhost:3001 and compare side-by-side with `landing/index.html` opened directly in a browser. The visual design should be identical.

- [ ] **Step 8: Commit**

```bash
git add packages/site/
git commit -m "feat(site): migrate landing page to next.js components"
```

---

### Task 3: Add JSON-LD structured data and SEO metadata to landing page

**Files:**
- Create: `packages/site/components/JsonLd.tsx`
- Modify: `packages/site/app/page.tsx` (add JSON-LD)
- Create: `packages/site/app/opengraph-image.tsx` (OG image route)
- Create: `packages/site/app/robots.ts`
- Create: `packages/site/app/sitemap.ts`

- [ ] **Step 1: Create JSON-LD component**

File: `packages/site/components/JsonLd.tsx`

Note: `dangerouslySetInnerHTML` is safe here — the JSON is generated at build time from our own data, never from user input.

```tsx
interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 2: Add SoftwareApplication JSON-LD to landing page**

Add to `packages/site/app/page.tsx`:

```tsx
import { JsonLd } from '../components/JsonLd';

// Inside the page component, at the top of the return:
<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'nav-map',
    description: 'Interactive navigation map visualization for Next.js apps and websites',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: 'https://navmap.neonwatty.com',
    codeRepository: 'https://github.com/neonwatty/nav-map',
    sameAs: [
      'https://www.npmjs.com/package/@neonwatty/nav-map',
      'https://github.com/neonwatty/nav-map',
      'https://neonwatty.com',
    ],
  }}
/>
```

- [ ] **Step 3: Create robots.ts**

File: `packages/site/app/robots.ts`

```typescript
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://navmap.neonwatty.com/sitemap.xml',
  };
}
```

- [ ] **Step 4: Create sitemap.ts**

File: `packages/site/app/sitemap.ts`

Start with a static sitemap; we'll expand it as docs and gallery pages are added.

```typescript
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://navmap.neonwatty.com';
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
  ];
}
```

- [ ] **Step 5: Create OG image route**

File: `packages/site/app/opengraph-image.tsx`

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'nav-map — Interactive Navigation Map Visualization';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#06060c',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, color: '#e0e0ec' }}>
          nav-map
        </div>
        <div style={{ fontSize: 28, color: '#8888a8', marginTop: 16, maxWidth: 700, textAlign: 'center' }}>
          Interactive navigation map visualization for Next.js apps
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 6: Verify SEO output**

Run: `pnpm dev:site`
Check:
- http://localhost:3001/robots.txt — valid robots file
- http://localhost:3001/sitemap.xml — valid XML sitemap
- View source at http://localhost:3001 — JSON-LD script tag present
- Meta tags in `<head>` include title, description, og:*, twitter:*

- [ ] **Step 7: Commit**

```bash
git add packages/site/
git commit -m "feat(site): add json-ld, robots.txt, sitemap, og image"
```

---

## Chunk 2: Documentation Generation Pipeline

### Task 4: Build the doc generation script

**Files:**
- Create: `packages/site/scripts/generate-docs.ts`
- Create: `packages/site/src/data/docs/` (output directory)

This is the core build-time script that reads source code and outputs JSON data files for the docs pages.

- [ ] **Step 1: Create the doc generation script**

File: `packages/site/scripts/generate-docs.ts`

```typescript
import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const OUT_DIR = path.resolve(import.meta.dirname, '../src/data/docs');

interface DocPage {
  slug: string;
  title: string;
  description: string;
  sections: DocSection[];
  keywords: string[];
}

interface DocSection {
  heading: string;
  content: string;
  codeExample?: string;
  propsTable?: PropRow[];
}

interface PropRow {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeDocPage(page: DocPage) {
  const filePath = path.join(OUT_DIR, `${page.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(page, null, 2));
  console.log(`  Generated: ${page.slug}.json`);
}

function generateComponentApi(): DocPage {
  const project = new Project({
    tsConfigFilePath: path.join(ROOT, 'packages/core/tsconfig.json'),
  });
  const typesFile = project.getSourceFileOrThrow('src/types.ts');
  const navMapFile = project.getSourceFileOrThrow(
    'src/components/NavMap.tsx'
  );

  const propsInterface = navMapFile.getInterfaceOrThrow('NavMapProps');
  const props: PropRow[] = propsInterface.getProperties().map(prop => ({
    name: prop.getName(),
    type: prop.getType().getText(prop),
    required: !prop.hasQuestionToken(),
    description:
      prop.getJsDocs().map(d => d.getDescription().trim()).join(' ') || '',
  }));

  const typeNames = [
    'NavMapGraph', 'NavMapNode', 'NavMapEdge', 'NavMapGroup',
    'NavMapFlow', 'NavMapFlowStep', 'ViewMode', 'EdgeMode', 'NavMapTheme',
  ];
  const typeSections: DocSection[] = typeNames
    .map(name => {
      const iface =
        typesFile.getInterface(name) || typesFile.getTypeAlias(name);
      if (!iface) return null;
      return {
        heading: name,
        content:
          iface.getJsDocs().map(d => d.getDescription().trim()).join(' ')
          || `The ${name} type.`,
        codeExample: iface.getText(),
      };
    })
    .filter((s): s is DocSection => s !== null);

  return {
    slug: 'component-api',
    title: 'NavMap Component API',
    description:
      'Complete API reference for the NavMap React component — props, types, and configuration.',
    keywords: [
      'nav-map API', 'NavMap props',
      'react navigation component', 'NavMapGraph type',
    ],
    sections: [
      { heading: 'NavMapProps', content: 'The NavMap component accepts:', propsTable: props },
      ...typeSections,
    ],
  };
}

function generateCliPage(
  command: string, title: string, description: string, keywords: string[],
  options: { flag: string; description: string; default?: string }[],
  usage: string,
): DocPage {
  return {
    slug: `cli-${command}`,
    title, description, keywords,
    sections: [
      { heading: 'Usage', content: '', codeExample: usage },
      {
        heading: 'Options', content: '',
        propsTable: options.map(o => ({
          name: o.flag, type: 'string', required: false,
          default: o.default, description: o.description,
        })),
      },
    ],
  };
}

function generateCliPages(): DocPage[] {
  return [
    generateCliPage('scan', 'CLI: scan',
      'Scan a Next.js project directory to generate a navigation map.',
      ['nextjs route scanner', 'nav-map scan CLI', 'generate navigation map'],
      [
        { flag: '-o, --output <path>', description: 'Output file path', default: 'nav-map.json' },
        { flag: '-s, --screenshots', description: 'Capture screenshots of each page', default: 'false' },
        { flag: '--base-url <url>', description: 'Base URL for screenshots' },
        { flag: '--screenshot-dir <dir>', description: 'Directory for screenshots', default: 'nav-screenshots' },
        { flag: '-n, --name <name>', description: 'Project name for the graph' },
        { flag: '--no-shared-nav', description: 'Skip shared nav detection' },
      ],
      'npx @neonwatty/nav-map-scanner scan <dir>',
    ),
    generateCliPage('crawl', 'CLI: crawl',
      'Crawl a live URL to discover pages and generate a navigation map.',
      ['crawl nextjs app', 'URL crawler navigation map', 'discover app routes'],
      [
        { flag: '-o, --output <path>', description: 'Output file path', default: 'nav-map.json' },
        { flag: '--screenshot-dir <dir>', description: 'Directory for screenshots', default: 'nav-screenshots' },
        { flag: '-n, --name <name>', description: 'Project name for the graph' },
        { flag: '--max-pages <n>', description: 'Maximum pages to crawl', default: '50' },
      ],
      'npx @neonwatty/nav-map-scanner crawl <url>',
    ),
    generateCliPage('record', 'CLI: record',
      'Record navigation from E2E test runs against a live app.',
      ['record nextjs e2e navigation', 'playwright navigation recording'],
      [
        { flag: '--playwright-config <path>', description: 'Path to Playwright config', default: 'playwright.config.ts' },
        { flag: '--storage-state <path>', description: 'Path to auth storage state file' },
        { flag: '--routes <path>', description: 'Path to routes.json from a prior scan' },
        { flag: '--screenshot-dir <dir>', description: 'Directory for screenshots', default: 'nav-screenshots' },
        { flag: '-o, --output <path>', description: 'Output file path', default: 'nav-map.json' },
        { flag: '-n, --name <name>', description: 'Project name for the graph' },
      ],
      'npx @neonwatty/nav-map-scanner record',
    ),
    generateCliPage('record-flows', 'CLI: record-flows',
      'Run Playwright tests from a flows directory and record navigation with screenshots.',
      ['record nextjs user flows', 'playwright flow recording', 'user journey capture'],
      [
        { flag: '--flows-dir <dir>', description: 'Directory containing Playwright .spec.ts files' },
        { flag: '--base-url <url>', description: 'Base URL for the app under test' },
        { flag: '--storage-state <path>', description: 'Path to auth storage state file' },
        { flag: '--routes <path>', description: 'Path to existing nav-map.json to merge with' },
        { flag: '--screenshot-dir <dir>', description: 'Directory for screenshots', default: 'nav-screenshots' },
        { flag: '-o, --output <path>', description: 'Output file path', default: 'nav-map.json' },
        { flag: '-n, --name <name>', description: 'Project name for the graph' },
        { flag: '--fail-on-test-errors', description: 'Exit non-zero if any tests fail' },
      ],
      'npx @neonwatty/nav-map-scanner record-flows --flows-dir <dir> --base-url <url>',
    ),
    generateCliPage('generate', 'CLI: generate',
      'Load nav-map.config.json, auto-login if configured, crawl, and output nav-map.json.',
      ['generate nav-map from config', 'auto-login crawl', 'config-driven scanner'],
      [
        { flag: '-c, --config <path>', description: 'Path to config file', default: 'nav-map.config.json' },
        { flag: '--headed', description: 'Run browser in headed mode (useful for debugging login)' },
      ],
      'npx @neonwatty/nav-map-scanner generate',
    ),
    generateCliPage('serve', 'CLI: serve',
      'Start a local viewer for a nav-map.json file.',
      ['nav-map local viewer', 'serve nav-map visualization', 'preview navigation map'],
      [
        { flag: '-p, --port <port>', description: 'Port number', default: '3333' },
        { flag: '--screenshot-dir <dir>', description: 'Directory containing screenshots' },
      ],
      'npx @neonwatty/nav-map-scanner serve [file]',
    ),
    generateCliPage('auth', 'CLI: auth',
      'Log in to a website interactively and save auth state.',
      ['nextjs auth page screenshots', 'save login state', 'authenticated scanning'],
      [
        { flag: '-o, --output <path>', description: 'Output file for auth state', default: 'auth.json' },
      ],
      'npx @neonwatty/nav-map-scanner auth <url>',
    ),
  ];
}

function generateKeyboardShortcuts(): DocPage {
  const shortcuts = [
    { key: '↓ →', label: 'Navigate outgoing' },
    { key: '↑ ←', label: 'Navigate incoming' },
    { key: 'Backspace', label: 'Back in path' },
    { key: 'Esc', label: 'Clear selection' },
    { key: '/ or ⌘K', label: 'Search pages' },
    { key: '0', label: 'Reset view' },
    { key: 'L', label: 'Toggle layout' },
    { key: 'F', label: 'Toggle focus mode' },
    { key: 'N', label: 'Toggle shared nav' },
    { key: 'O', label: 'Open page in browser' },
    { key: '?', label: 'This help' },
  ];

  return {
    slug: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Complete keyboard shortcut reference for the nav-map visualization.',
    keywords: ['nav-map keyboard shortcuts', 'navigation hotkeys'],
    sections: [{
      heading: 'Shortcuts', content: 'nav-map supports full keyboard navigation:',
      propsTable: shortcuts.map(s => ({
        name: s.key, type: 'shortcut', required: false, description: s.label,
      })),
    }],
  };
}

function generateViewModePages(): DocPage[] {
  return [
    {
      slug: 'views-hierarchy', title: 'Hierarchy View',
      description: 'Top-down route tree with collapsible groups — the default nav-map view.',
      keywords: ['nextjs route hierarchy', 'route tree visualization', 'collapsible navigation groups'],
      sections: [{
        heading: 'Overview',
        content: 'Hierarchy View renders your routes as a top-down tree organized by route groups. Groups can be collapsed to focus on specific sections. This is the default view. Double-click a group to enter focus mode.',
      }],
    },
    {
      slug: 'views-flow', title: 'Flow View',
      description: 'Step-by-step user journey visualization with animated transitions.',
      keywords: ['nextjs user flow visualization', 'user journey graph', 'flow animation'],
      sections: [{
        heading: 'Overview',
        content: 'Flow View shows recorded user journeys as animated step-by-step paths. Each flow represents a real user interaction captured from E2E tests. Use the flow selector to switch between flows, and the walkthrough bar to step through each action with screenshots.',
      }],
    },
    {
      slug: 'views-map', title: 'Map View',
      description: 'ELK.js hierarchical positioning with grouped layout for complex apps.',
      keywords: ['nextjs app navigation map', 'elk graph layout', 'grouped route visualization'],
      sections: [{
        heading: 'Overview',
        content: 'Map View uses the ELK.js layout engine to position nodes hierarchically with grouped containers. Best for complex apps where hierarchy view becomes too deep. Nodes are arranged to minimize edge crossings.',
      }],
    },
    {
      slug: 'views-tree', title: 'Tree View',
      description: 'Explore reachable routes from any selected node in a focused tree.',
      keywords: ['nextjs route tree explorer', 'reachable routes graph'],
      sections: [{
        heading: 'Overview',
        content: 'Tree View lets you select any node and see all routes reachable from it. Useful for understanding navigation scope from a specific page. Select a different root node to explore a different subtree.',
      }],
    },
  ];
}

function generateGettingStarted(): DocPage {
  return {
    slug: 'getting-started', title: 'Getting Started',
    description: 'Quick start guide for adding nav-map to your Next.js app in 3 steps.',
    keywords: ['nav-map setup', 'install nav-map', 'nextjs visualization setup'],
    sections: [
      {
        heading: 'Install', content: 'Add nav-map to your Next.js project:',
        codeExample: 'npm install @neonwatty/nav-map',
      },
      {
        heading: 'Generate your navigation map',
        content: 'Run the scanner against your project directory:',
        codeExample: 'npx @neonwatty/nav-map-scanner scan . -o public/nav-map.json -s --base-url http://localhost:3000',
      },
      {
        heading: 'Add the component',
        content: 'Create a page to render the visualization:',
        codeExample: `// app/navmap/page.tsx
'use client';

import dynamic from 'next/dynamic';
import type { NavMapGraph } from '@neonwatty/nav-map';

const NavMap = dynamic(
  () => import('@neonwatty/nav-map').then(mod => ({ default: mod.NavMap })),
  { ssr: false }
);

export default function NavMapPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <NavMap graphUrl="/nav-map.json" screenshotBasePath="" />
    </div>
  );
}`,
      },
    ],
  };
}

function generateAnalytics(): DocPage {
  return {
    slug: 'analytics', title: 'Analytics Integration',
    description: 'Overlay page view and transition data on your nav-map using the analytics adapter interface.',
    keywords: ['nextjs navigation analytics', 'page view visualization', 'posthog nav-map'],
    sections: [
      {
        heading: 'AnalyticsAdapter Interface',
        content: 'nav-map accepts any analytics provider through the AnalyticsAdapter interface:',
        codeExample: `interface AnalyticsAdapter {
  fetchPageViews(period: { start: string; end: string }): Promise<Record<string, number>>;
  fetchTransitions(period: { start: string; end: string }): Promise<Record<string, number>>;
}`,
      },
      {
        heading: 'PostHog Example',
        content: 'nav-map ships with a built-in PostHog adapter:',
        codeExample: `import { PostHogAnalytics } from '@neonwatty/nav-map';

const analytics = new PostHogAnalytics({
  apiKey: process.env.POSTHOG_API_KEY!,
  projectId: process.env.POSTHOG_PROJECT_ID!,
});

<NavMap graph={graph} analytics={analytics} />`,
      },
      {
        heading: 'Custom Adapter',
        content: 'Implement the interface for any analytics provider:',
        codeExample: `class MyAnalytics implements AnalyticsAdapter {
  async fetchPageViews(period) {
    const data = await fetch('/api/analytics/pageviews?start=' + period.start);
    return data.json();
  }
  async fetchTransitions(period) {
    const data = await fetch('/api/analytics/transitions?start=' + period.start);
    return data.json();
  }
}`,
      },
    ],
  };
}

function main() {
  console.log('Generating docs...');
  ensureOutDir();

  const pages: DocPage[] = [
    generateGettingStarted(),
    generateComponentApi(),
    ...generateCliPages(),
    generateKeyboardShortcuts(),
    ...generateViewModePages(),
    generateAnalytics(),
  ];

  for (const page of pages) {
    writeDocPage(page);
  }

  console.log(`\nGenerated ${pages.length} doc pages.`);
}

main();
```

- [ ] **Step 2: Run the generation script**

Run: `cd packages/site && npx tsx scripts/generate-docs.ts`
Expected: 15 JSON files created in `packages/site/src/data/docs/`

- [ ] **Step 3: Verify generated JSON**

Spot-check `packages/site/src/data/docs/component-api.json` — it should contain NavMapProps with all props extracted from source.

- [ ] **Step 4: Commit**

```bash
git add packages/site/scripts/ packages/site/src/data/docs/
git commit -m "feat(site): add build-time doc generation from source code"
```

---

### Task 5: Create docs page routes

**Files:**
- Create: `packages/site/app/docs/page.tsx` (docs index)
- Create: `packages/site/app/docs/[slug]/page.tsx` (individual doc pages)
- Create: `packages/site/components/DocsLayout.tsx`
- Create: `packages/site/components/PropsTable.tsx`
- Create: `packages/site/components/CodeBlock.tsx`
- Modify: `packages/site/app/sitemap.ts` (add doc pages)

- [ ] **Step 1: Create PropsTable component**

File: `packages/site/components/PropsTable.tsx`

```tsx
interface PropRow {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <table className="props-table">
      <thead>
        <tr>
          <th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.name}>
            <td><code>{row.name}</code></td>
            <td><code>{row.type}</code></td>
            <td>{row.required ? 'Yes' : 'No'}</td>
            <td>{row.default ? <code>{row.default}</code> : '—'}</td>
            <td>{row.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Create CodeBlock component**

File: `packages/site/components/CodeBlock.tsx`

```tsx
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="code-block">
      <code>{code}</code>
    </pre>
  );
}
```

- [ ] **Step 3: Create DocsLayout component**

File: `packages/site/components/DocsLayout.tsx`

Sidebar navigation listing all doc pages grouped by category.

```tsx
import Link from 'next/link';
import * as fs from 'fs';
import * as path from 'path';

interface DocMeta { slug: string; title: string }

function getDocList(): DocMeta[] {
  const dataDir = path.join(process.cwd(), 'src/data/docs');
  return fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8'));
      return { slug: data.slug, title: data.title };
    });
}

export function DocsLayout({
  children, currentSlug,
}: {
  children: React.ReactNode; currentSlug?: string;
}) {
  const docs = getDocList();
  const groups = {
    'Getting Started': docs.filter(d => d.slug === 'getting-started'),
    'Component': docs.filter(d =>
      ['component-api', 'keyboard-shortcuts', 'analytics'].includes(d.slug)),
    'CLI Commands': docs.filter(d => d.slug.startsWith('cli-')),
    'View Modes': docs.filter(d => d.slug.startsWith('views-')),
  };

  return (
    <div className="docs-layout">
      <nav className="docs-sidebar">
        <Link href="/" className="docs-logo">nav-map</Link>
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="docs-nav-group">
            <h3>{group}</h3>
            <ul>
              {items.map(doc => (
                <li key={doc.slug} className={doc.slug === currentSlug ? 'active' : ''}>
                  <Link href={`/docs/${doc.slug}`}>{doc.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <main className="docs-content">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create docs index page**

File: `packages/site/app/docs/page.tsx`

```tsx
import type { Metadata } from 'next';
import { DocsLayout } from '../../components/DocsLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'nav-map documentation — component API, CLI commands, view modes, and integration guides.',
};

export default function DocsIndex() {
  return (
    <DocsLayout>
      <h1>Documentation</h1>
      <p>Everything you need to visualize your Next.js app&apos;s navigation.</p>
      <div className="docs-quicklinks">
        <Link href="/docs/getting-started">Getting Started →</Link>
        <Link href="/docs/component-api">Component API →</Link>
        <Link href="/docs/cli-scan">CLI Reference →</Link>
      </div>
    </DocsLayout>
  );
}
```

- [ ] **Step 5: Create dynamic doc page route**

File: `packages/site/app/docs/[slug]/page.tsx`

```tsx
import * as fs from 'fs';
import * as path from 'path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsLayout } from '../../../components/DocsLayout';
import { PropsTable } from '../../../components/PropsTable';
import { CodeBlock } from '../../../components/CodeBlock';
import { JsonLd } from '../../../components/JsonLd';

interface DocPageData {
  slug: string;
  title: string;
  description: string;
  sections: {
    heading: string;
    content: string;
    codeExample?: string;
    propsTable?: {
      name: string; type: string; required: boolean;
      default?: string; description: string;
    }[];
  }[];
  keywords: string[];
}

function getDocData(slug: string): DocPageData | null {
  const filePath = path.join(process.cwd(), 'src/data/docs', `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function getAllSlugs(): string[] {
  const dataDir = path.join(process.cwd(), 'src/data/docs');
  return fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocData(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.description, keywords: doc.keywords };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocData(slug);
  if (!doc) notFound();

  return (
    <DocsLayout currentSlug={slug}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: doc.title,
          description: doc.description,
          url: `https://navmap.neonwatty.com/docs/${slug}`,
        }}
      />
      <h1>{doc.title}</h1>
      {doc.sections.map((section, i) => (
        <section key={i}>
          <h2>{section.heading}</h2>
          {section.content && <p>{section.content}</p>}
          {section.propsTable && <PropsTable rows={section.propsTable} />}
          {section.codeExample && <CodeBlock code={section.codeExample} />}
        </section>
      ))}
    </DocsLayout>
  );
}
```

- [ ] **Step 6: Update sitemap.ts to include doc pages**

Replace `packages/site/app/sitemap.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://navmap.neonwatty.com';
  const docSlugs = fs
    .readdirSync(path.join(process.cwd(), 'src/data/docs'))
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ...docSlugs.map(slug => ({
      url: `${baseUrl}/docs/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
```

- [ ] **Step 7: Verify docs pages render**

Run: `cd packages/site && npx tsx scripts/generate-docs.ts && pnpm dev`
Check:
- http://localhost:3001/docs — index with links
- http://localhost:3001/docs/component-api — props table renders
- http://localhost:3001/docs/cli-scan — CLI options render
- http://localhost:3001/docs/getting-started — quick start renders
- http://localhost:3001/sitemap.xml — all doc pages listed

- [ ] **Step 8: Commit**

```bash
git add packages/site/app/docs/ packages/site/components/ packages/site/app/sitemap.ts
git commit -m "feat(site): add docs pages with auto-generated content from source"
```

---

## Chunk 3: Gallery System

### Task 6: Create gallery data structure and seed first entry

**Files:**
- Create: `packages/site/public/gallery/bleep/data.json`
- Create: `packages/site/public/gallery/bleep/hierarchy.png`

Start with the Bleep app — we already have its nav-map JSON in `packages/demo`.

- [ ] **Step 1: Create gallery directory and prepare Bleep data**

```bash
mkdir -p packages/site/public/gallery/bleep
```

Read `packages/demo/public/bleep-app.nav-map.json`, wrap it with gallery metadata, and write to `packages/site/public/gallery/bleep/data.json`:

```json
{
  "appName": "Bleep",
  "appSlug": "bleep",
  "description": "Audio processing web app — clean explicit content from audio and video files.",
  "githubUrl": "https://github.com/neonwatty/bleep-that-shit",
  "liveUrl": "https://bleepthat.sh",
  "framework": "nextjs-app",
  "stats": {
    "routes": 0,
    "edges": 0,
    "groups": 0
  },
  "graph": {}
}
```

The implementer must read the actual bleep-app.nav-map.json, populate `stats` with node/edge/group counts, and embed the full graph object in `graph`.

- [ ] **Step 2: Copy or generate a hierarchy PNG**

```bash
cp packages/demo/public/screenshots/bleep-home.png packages/site/public/gallery/bleep/hierarchy.png 2>/dev/null || echo "Create placeholder"
```

A proper automated screenshot pipeline can be added later.

- [ ] **Step 3: Commit**

```bash
git add packages/site/public/gallery/
git commit -m "feat(site): add bleep as first gallery entry"
```

---

### Task 7: Create gallery page routes

**Files:**
- Create: `packages/site/app/gallery/page.tsx` (gallery index)
- Create: `packages/site/app/gallery/[slug]/page.tsx` (individual gallery pages)
- Create: `packages/site/components/GalleryCard.tsx`
- Create: `packages/site/components/NavMapEmbed.tsx`
- Create: `packages/site/app/not-found.tsx`
- Modify: `packages/site/app/sitemap.ts` (add gallery pages)

- [ ] **Step 1: Create GalleryCard component**

File: `packages/site/components/GalleryCard.tsx`

```tsx
import Link from 'next/link';
import Image from 'next/image';

interface GalleryCardProps {
  slug: string;
  appName: string;
  description: string;
  stats: { routes: number; edges: number; groups: number };
}

export function GalleryCard({ slug, appName, description, stats }: GalleryCardProps) {
  return (
    <Link href={`/gallery/${slug}`} className="gallery-card">
      <div className="gallery-card-preview">
        <Image
          src={`/gallery/${slug}/hierarchy.png`}
          alt={`${appName} navigation map`}
          width={400} height={300}
          style={{ objectFit: 'cover' }}
        />
      </div>
      <h3>{appName}</h3>
      <p>{description}</p>
      <div className="gallery-card-stats">
        <span>{stats.routes} routes</span>
        <span>{stats.edges} links</span>
        <span>{stats.groups} groups</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create NavMapEmbed component**

File: `packages/site/components/NavMapEmbed.tsx`

Client component with interactive visualization on desktop, static PNG on mobile.

```tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { NavMapGraph } from '@neonwatty/nav-map';

const NavMap = dynamic(
  () => import('@neonwatty/nav-map').then(mod => ({ default: mod.NavMap })),
  { ssr: false, loading: () => <div className="navmap-loading">Loading visualization...</div> }
);

interface NavMapEmbedProps {
  graph: NavMapGraph;
  fallbackImage: string;
  appName: string;
}

export function NavMapEmbed({ graph, fallbackImage, appName }: NavMapEmbedProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  if (isMobile) {
    return (
      <div className="navmap-mobile-fallback">
        <img src={fallbackImage} alt={`${appName} navigation map`} />
        <p>Interactive visualization available on desktop.</p>
      </div>
    );
  }

  return (
    <div className="navmap-embed" style={{ width: '100%', height: '600px' }}>
      <NavMap graph={graph} screenshotBasePath="" defaultViewMode="hierarchy" defaultEdgeMode="smooth" />
    </div>
  );
}
```

- [ ] **Step 3: Create gallery index page**

File: `packages/site/app/gallery/page.tsx`

```tsx
import * as fs from 'fs';
import * as path from 'path';
import type { Metadata } from 'next';
import { GalleryCard } from '../../components/GalleryCard';
import { JsonLd } from '../../components/JsonLd';

export const metadata: Metadata = {
  title: 'Gallery — Open Source App Architectures',
  description: 'Explore interactive navigation maps of popular open-source Next.js applications.',
};

interface GalleryEntry {
  appName: string; appSlug: string; description: string;
  stats: { routes: number; edges: number; groups: number };
}

function getGalleryEntries(): GalleryEntry[] {
  const galleryDir = path.join(process.cwd(), 'public/gallery');
  if (!fs.existsSync(galleryDir)) return [];
  return fs.readdirSync(galleryDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const data = JSON.parse(
        fs.readFileSync(path.join(galleryDir, d.name, 'data.json'), 'utf-8')
      );
      return { appName: data.appName, appSlug: data.appSlug, description: data.description, stats: data.stats };
    });
}

export default function GalleryIndex() {
  const entries = getGalleryEntries();
  return (
    <main className="gallery-page">
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: 'nav-map Gallery',
        description: 'Interactive navigation maps of popular open-source Next.js apps.',
        url: 'https://navmap.neonwatty.com/gallery',
      }} />
      <h1>Gallery</h1>
      <p>Explore the architecture of popular open-source Next.js apps — visualized with nav-map.</p>
      <div className="gallery-grid">
        {entries.map(entry => (
          <GalleryCard key={entry.appSlug} slug={entry.appSlug} {...entry} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create individual gallery page route**

File: `packages/site/app/gallery/[slug]/page.tsx`

```tsx
import * as fs from 'fs';
import * as path from 'path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NavMapEmbed } from '../../../components/NavMapEmbed';
import { JsonLd } from '../../../components/JsonLd';
import Link from 'next/link';

interface GalleryData {
  appName: string; appSlug: string; description: string;
  githubUrl: string; liveUrl?: string; framework: string;
  stats: { routes: number; edges: number; groups: number };
  graph: Record<string, unknown>;
}

function getGalleryData(slug: string): GalleryData | null {
  const filePath = path.join(process.cwd(), 'public/gallery', slug, 'data.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function getAllSlugs(): string[] {
  const galleryDir = path.join(process.cwd(), 'public/gallery');
  if (!fs.existsSync(galleryDir)) return [];
  return fs.readdirSync(galleryDir, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);
}

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = getGalleryData(slug);
  if (!data) return {};
  return {
    title: `${data.appName} Architecture — Navigation Map`,
    description: `Interactive navigation map of ${data.appName}: ${data.stats.routes} routes, ${data.stats.edges} links, ${data.stats.groups} groups.`,
    keywords: [`${data.appName} architecture`, `${data.appName} navigation`, `${data.appName} route map`],
  };
}

export default async function GalleryPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getGalleryData(slug);
  if (!data) notFound();

  return (
    <main className="gallery-detail-page">
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'WebPage',
        name: `${data.appName} Navigation Architecture`,
        description: data.description,
        url: `https://navmap.neonwatty.com/gallery/${slug}`,
      }} />
      <div className="gallery-header">
        <Link href="/gallery">← Gallery</Link>
        <h1>{data.appName}</h1>
        <p>{data.description}</p>
        <div className="gallery-meta">
          <span>{data.stats.routes} routes</span>
          <span>{data.stats.edges} links</span>
          <span>{data.stats.groups} groups</span>
          {data.githubUrl && <a href={data.githubUrl}>GitHub →</a>}
          {data.liveUrl && <a href={data.liveUrl}>Live Site →</a>}
        </div>
      </div>
      <NavMapEmbed
        graph={data.graph as never}
        fallbackImage={`/gallery/${slug}/hierarchy.png`}
        appName={data.appName}
      />
      <div className="gallery-cta">
        <h2>Visualize your own app</h2>
        <p>Generate a nav-map for your Next.js project in under 5 minutes.</p>
        <Link href="/docs/getting-started" className="cta-button">Get Started →</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create custom 404 page**

File: `packages/site/app/not-found.tsx`

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <h1>404 — Page not found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <div className="not-found-links">
        <Link href="/gallery">Browse the Gallery →</Link>
        <Link href="/docs">Read the Docs →</Link>
        <Link href="/docs/getting-started">Visualize your own app →</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Update sitemap.ts to include gallery pages**

Replace `packages/site/app/sitemap.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://navmap.neonwatty.com';

  const docSlugs = fs
    .readdirSync(path.join(process.cwd(), 'src/data/docs'))
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

  const galleryDir = path.join(process.cwd(), 'public/gallery');
  const gallerySlugs = fs.existsSync(galleryDir)
    ? fs.readdirSync(galleryDir, { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name)
    : [];

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ...docSlugs.map(slug => ({
      url: `${baseUrl}/docs/${slug}`, lastModified: new Date(),
      changeFrequency: 'monthly' as const, priority: 0.7,
    })),
    { url: `${baseUrl}/gallery`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...gallerySlugs.map(slug => ({
      url: `${baseUrl}/gallery/${slug}`, lastModified: new Date(),
      changeFrequency: 'monthly' as const, priority: 0.8,
    })),
  ];
}
```

- [ ] **Step 7: Verify gallery pages render**

Run: `pnpm dev:site`
Check:
- http://localhost:3001/gallery — gallery index with Bleep card
- http://localhost:3001/gallery/bleep — Bleep detail page with NavMap embed
- http://localhost:3001/not-a-page — custom 404 renders
- http://localhost:3001/sitemap.xml — gallery pages listed

- [ ] **Step 8: Commit**

```bash
git add packages/site/app/gallery/ packages/site/app/not-found.tsx packages/site/components/ packages/site/app/sitemap.ts
git commit -m "feat(site): add gallery index, detail pages, and custom 404"
```

---

## Chunk 4: Cross-Property Linking, npm/GitHub Optimization & Deployment

### Task 8: Optimize npm and GitHub metadata

**Files:**
- Modify: `packages/core/package.json` (homepage, keywords)
- Modify: `packages/scanner/package.json` (homepage, keywords)

- [ ] **Step 1: Update core package.json**

Add/update in `packages/core/package.json`:

```json
"homepage": "https://navmap.neonwatty.com",
"keywords": [
  "navigation", "sitemap", "react-flow", "next.js", "visualization", "graph",
  "nextjs-navigation", "route-map", "app-architecture", "navigation-graph",
  "interactive-visualization"
]
```

- [ ] **Step 2: Update scanner package.json**

Add/update in `packages/scanner/package.json`:

```json
"homepage": "https://navmap.neonwatty.com/docs/cli-scan",
"keywords": [
  "navigation", "scanner", "cli", "next.js", "sitemap", "playwright",
  "route-scanner", "nextjs-routes", "app-crawler", "navigation-map-generator"
]
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/package.json packages/scanner/package.json
git commit -m "feat: add homepage urls and expanded keywords to package metadata"
```

---

### Task 9: Add site header, footer, and cross-property links

**Files:**
- Create: `packages/site/components/SiteHeader.tsx`
- Create: `packages/site/components/SiteFooter.tsx`
- Modify: `packages/site/app/layout.tsx`

- [ ] **Step 1: Create SiteHeader**

File: `packages/site/components/SiteHeader.tsx`

```tsx
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="site-logo">nav-map</Link>
      <nav>
        <Link href="/docs">Docs</Link>
        <Link href="/gallery">Gallery</Link>
        <a href="https://github.com/neonwatty/nav-map">GitHub</a>
        <a href="https://www.npmjs.com/package/@neonwatty/nav-map">npm</a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create SiteFooter**

File: `packages/site/components/SiteFooter.tsx`

```tsx
import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        <div>
          <h4>nav-map</h4>
          <Link href="/docs/getting-started">Getting Started</Link>
          <Link href="/docs/component-api">API Reference</Link>
          <Link href="/gallery">Gallery</Link>
        </div>
        <div>
          <h4>Resources</h4>
          <a href="https://github.com/neonwatty/nav-map">GitHub</a>
          <a href="https://www.npmjs.com/package/@neonwatty/nav-map">npm</a>
          <a href="https://neonwatty.com">Blog</a>
        </div>
      </div>
      <p className="footer-copyright">
        Built by <a href="https://neonwatty.com">neonwatty</a>. MIT License.
      </p>
    </footer>
  );
}
```

- [ ] **Step 3: Add header and footer to layout.tsx**

Modify `packages/site/app/layout.tsx` to import and render SiteHeader before and SiteFooter after `{children}`.

- [ ] **Step 4: Commit**

```bash
git add packages/site/components/ packages/site/app/layout.tsx
git commit -m "feat(site): add site header with nav and footer with cross-property links"
```

---

### Task 10: Deploy to Vercel

- [ ] **Step 1: Link Vercel project to packages/site**

```bash
cd packages/site
vercel link --yes
```

Set:
- **Root Directory:** `packages/site`
- **Build Command:** `cd ../.. && pnpm install && pnpm --filter @neonwatty/nav-map build && pnpm --filter site build`
- **Output Directory:** `.next`

- [ ] **Step 2: Configure subdomain**

In Vercel dashboard or CLI, add `navmap.neonwatty.com` as a custom domain. Add a CNAME record in DNS: `navmap.neonwatty.com` → `cname.vercel-dns.com`.

- [ ] **Step 3: Deploy**

```bash
vercel --prod
```

- [ ] **Step 4: Verify production**

Check:
- https://navmap.neonwatty.com — landing page renders
- https://navmap.neonwatty.com/docs — docs index renders
- https://navmap.neonwatty.com/gallery — gallery renders
- https://navmap.neonwatty.com/sitemap.xml — all pages listed
- https://navmap.neonwatty.com/robots.txt — valid

- [ ] **Step 5: Submit sitemap to Google Search Console**

1. Add `navmap.neonwatty.com` to Google Search Console
2. Submit `https://navmap.neonwatty.com/sitemap.xml`

- [ ] **Step 6: Commit deployment config**

```bash
git add packages/site/
git commit -m "feat(site): configure vercel deployment"
```

---

### Task 11: Seed additional gallery entries

Scan 5-10 more open-source Next.js apps and add them to the gallery.

- [ ] **Step 1: Clone and scan open-source apps**

For each app, clone the repo and run the scanner:

```bash
git clone --depth 1 https://github.com/calcom/cal.com /tmp/calcom
npx @neonwatty/nav-map-scanner scan /tmp/calcom -o packages/site/public/gallery/calcom/data-raw.json -n "Cal.com"
```

Repeat for: dub.co, papermark, formbricks, documenso, plane, rallly, and others from the seed list.

- [ ] **Step 2: Create gallery data.json for each app**

For each scanned app, create `data.json` wrapping the nav-map graph with metadata (appName, appSlug, description, githubUrl, liveUrl, framework, stats, graph).

- [ ] **Step 3: Generate hierarchy PNGs**

For each gallery entry, generate a static PNG of the hierarchy view for mobile fallback and OG images.

- [ ] **Step 4: Verify all gallery entries render**

Run: `pnpm dev:site` and check each entry at `/gallery/[slug]`.

- [ ] **Step 5: Commit**

```bash
git add packages/site/public/gallery/
git commit -m "feat(site): seed gallery with open-source next.js app visualizations"
```

---

### Task 12: Add PostHog analytics

**Files:**
- Modify: `packages/site/app/layout.tsx`
- Create: `packages/site/components/PostHogProvider.tsx`

- [ ] **Step 1: Install PostHog**

```bash
cd packages/site && pnpm add posthog-js
```

- [ ] **Step 2: Create PostHog provider**

File: `packages/site/components/PostHogProvider.tsx`

```tsx
'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        capture_pageview: true,
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

- [ ] **Step 3: Add PostHog provider to layout.tsx**

Wrap children in `PostHogProvider` in `packages/site/app/layout.tsx`.

- [ ] **Step 4: Set environment variables in Vercel**

Add in Vercel project settings:
- `NEXT_PUBLIC_POSTHOG_KEY` — your PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` — `https://us.i.posthog.com`

- [ ] **Step 5: Commit**

```bash
git add packages/site/
git commit -m "feat(site): add posthog analytics tracking"
```
