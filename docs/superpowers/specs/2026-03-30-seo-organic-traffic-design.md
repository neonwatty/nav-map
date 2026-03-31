# SEO & Organic Traffic Strategy for nav-map

**Date:** 2026-03-30
**Status:** Draft
**Goal:** Take nav-map from zero organic traffic to sustainable discovery through programmatic content and technical SEO — with minimal ongoing effort.

## Context

nav-map is an open-source React component library that visualizes Next.js app navigation as interactive graphs. It has a static HTML landing page, an npm package (`@neonwatty/nav-map`), a CLI scanner (`@neonwatty/nav-map-scanner`), and a GitHub repo at `github.com/neonwatty/nav-map`. There is currently no organic search presence, no docs site, no content strategy, and no structured data.

### Constraints

- **Minimal ongoing effort** — the strategy must work without regular content creation
- **Target audience** — Next.js developers first, expanding to eng managers and the broader React community over time
- **Starting from zero** — no existing domain authority on the nav-map property

## 1. Site Architecture & Domain

**Domain:** `navmap.neonwatty.com` — deployed on Vercel as a Next.js app.

**Pages:**

| Path | Content | Generation |
|---|---|---|
| `/` | Landing page (migrated from static HTML, preserving current design) | Manual |
| `/docs/*` | Auto-generated documentation (~12 pages) | Build-time from source |
| `/gallery/*` | Open-source app visualizations (~15-20 pages at launch) | Build-time from scanner JSON |
| `/gallery` | Filterable gallery index | Build-time |

**Site package location:** `packages/site` — a new Next.js app in the monorepo. The existing `packages/demo` remains as-is for local development; the gallery replaces its role as the public-facing demo.

**What stays where it is:**
- npm package on npmjs.com
- GitHub repo at github.com/neonwatty/nav-map

**Why Next.js (not static HTML):**
- SSR/SSG enables unique meta tags, OG images, and structured data per page
- Native sitemap generation
- Familiar stack — no learning curve
- Free Vercel deployment

## 2. Technical SEO Foundation

### Per-page requirements

Every page must have:
- Unique `<title>` and `<meta name="description">` tailored to page content
- Canonical URL via `<link rel="canonical">`
- OG tags with page-specific images (auto-generated via Next.js `opengraph-image` routes)
- JSON-LD structured data:
  - Landing page: `SoftwareApplication` schema
  - Docs pages: `TechArticle` schema
  - Gallery pages: `WebPage` schema
- Proper heading hierarchy (h1 → h2 → h3)

### Site-wide requirements

- `robots.txt` — allow all crawlers
- Auto-generated `sitemap.xml` via Next.js metadata API or `next-sitemap`
- Static generation for all pages (no client-side rendering for content)
- Fast Core Web Vitals
- Internal linking: every page links to related pages (gallery → docs, docs → gallery examples)

### npm & GitHub optimization

- Package `description` and `keywords` in package.json tuned for actual search terms
- GitHub repo description, topics, and About section optimized
- README links to gallery and docs site

## 3. Documentation Pages (Programmatic)

All docs are generated from source code at build time. Maintain the code, docs update themselves.

| Page | Source | Target keyword pattern |
|---|---|---|
| `/docs/getting-started` | README quick-start section | "nav-map setup guide" |
| `/docs/component-api` | TypeScript types in `packages/core/src/types.ts` + NavMap props | "nav-map react component API" |
| `/docs/cli/scan` | CLI definitions in `packages/scanner/src/cli.ts` | "nextjs route scanner CLI" |
| `/docs/cli/crawl` | Same | "crawl nextjs app routes" |
| `/docs/cli/record` | Same | "record nextjs e2e navigation" |
| `/docs/cli/record-flows` | Same | "record nextjs user flows" |
| `/docs/cli/generate` | Same | "generate nav-map from config" |
| `/docs/cli/serve` | Same | "nav-map local viewer server" |
| `/docs/cli/auth` | Same | "nextjs auth page screenshots" |
| `/docs/keyboard-shortcuts` | HelpOverlay component data | "nav-map keyboard shortcuts" |
| `/docs/views/hierarchy` | View mode descriptions | "nextjs route hierarchy visualization" |
| `/docs/views/flow` | Same | "nextjs user flow visualization" |
| `/docs/views/map` | Same | "nextjs app navigation map" |
| `/docs/views/tree` | Same | "nextjs route tree explorer" |
| `/docs/analytics` | Analytics adapter interface in `packages/core/src/analytics/types.ts` + PostHog example | "nextjs navigation analytics" |

**~15 indexable pages** from day one, each targeting a distinct long-tail query.

### Generation mechanism

A prebuild script (`scripts/generate-docs.ts`) runs before `next build`:

1. **Parser:** Uses ts-morph to extract type definitions, JSDoc comments, and CLI command metadata from source files
2. **Output format:** JSON data files written to `packages/site/src/data/docs/` — one JSON file per docs page containing title, description, sections, props tables, code examples
3. **Rendering:** Next.js static pages in `app/docs/` consume the JSON files and render them with shared layout components
4. **Build pipeline:** `"prebuild": "tsx scripts/generate-docs.ts"` in packages/site/package.json — runs automatically before every `next build`

Why JSON over MDX: JSON is simpler to generate programmatically and keeps content structure separate from presentation. The Next.js pages own the layout; the JSON files own the data.

## 4. Gallery — The Growth Engine

The gallery creates an unbounded number of indexable pages without writing content.

### How it works

1. Run `nav-map-scanner scan <repo-dir>` against cloned open-source Next.js repos (repo-based scanning — no auth or robots.txt concerns)
2. Save output JSON + screenshots to `packages/site/public/gallery/[app-name]/` — one JSON file (~50-200KB) and up to 10 thumbnail screenshots per app (~500KB total per entry)
3. Each app becomes a gallery page at `/gallery/[app-name]`
4. Screenshots are committed to git (total ~15MB for 20 apps — acceptable for a monorepo). If the gallery grows beyond ~50 apps, migrate screenshots to a CDN.

### What each gallery page contains

- Interactive nav-map visualization (client-hydrated React component — the visualization requires interactivity)
- Static fallback: a pre-rendered PNG of the hierarchy view, shown on mobile and as the initial paint before hydration (good for Core Web Vitals and mobile-first indexing)
- Route count, edge count, group count as structured data
- Screenshot thumbnails of key pages
- App metadata (GitHub stars, description, framework version)
- "Visualize your own app" CTA → getting-started docs

### Seed list (~15-20 apps)

cal.com, dub.co, papermark, twenty, infisical, formbricks, documenso, plane, rallly, hoppscotch, and similar well-known open-source Next.js projects.

### Keyword targeting per page

- `[app-name] architecture`
- `[app-name] navigation structure`
- `[app-name] route map`
- Queries developers search when evaluating or contributing to these projects

### Growth model

- Scanning a new app: ~5 minutes with existing CLI
- Each scan = a new indexable page
- Eventually community-contributed (PRs that add a JSON file)

### Content quality

- Each page has a real, interactive visualization — genuine utility
- Developers get actual architectural insight about these apps
- Structured route data is original content that doesn't exist elsewhere

## 5. Cross-Property Linking & Distribution

Leverage existing Vercel properties to bootstrap authority.

### From neonwatty.com (blog)

- Add nav-map to projects/portfolio page
- One introductory blog post: "I built a tool to visualize Next.js app architecture"
- Footer link to navmap.neonwatty.com

### From bleepthat.sh

- "Powered by nav-map" link in the Bleep demo
- Gallery page for Bleep links back to bleepthat.sh (mutual benefit)

### From GitHub

- Optimized repo description, topics, and social preview image
- README links to gallery and docs site
- 301 redirect from `neonwatty.github.io/nav-map` → `navmap.neonwatty.com` (if GitHub Pages deployment exists; otherwise skip)

### From npm

- `homepage` field → `navmap.neonwatty.com`
- Expanded `keywords` with search-relevant terms

### Structured data signals

- JSON-LD `SoftwareApplication` references npm URL, GitHub repo, docs
- `sameAs` property links all properties together

## 6. Measurement & Success Criteria

### Analytics

- PostHog on `navmap.neonwatty.com`
- Track: page views, referral sources, gallery page views, CTA clicks

### Search Console

- Add `navmap.neonwatty.com` to Google Search Console
- Verify via DNS (subdomain of already-verified neonwatty.com)

### Success milestones

| Timeframe | Target |
|---|---|
| Month 1 | All pages indexed, sitemap submitted to Google |
| Month 3 | 50+ impressions/day in Search Console, top-20 for 3+ long-tail queries |
| Month 6 | 500+ organic visits/month, gallery pages ranking for "[app] architecture" queries |

### No ongoing work required

PostHog and Search Console collect data passively. Check when curious.

## 7. Error Handling & Mobile

### Custom 404 page

Gallery apps may be renamed or removed. A custom 404 page links to the gallery index and docs, retaining users who hit dead links. Includes a search prompt and "Visualize your own app" CTA.

### Mobile strategy

Google uses mobile-first indexing. The interactive nav-map visualization requires a desktop-sized viewport. Gallery pages use a **progressive approach:**
- **Mobile:** Static PNG of the hierarchy view (pre-rendered during gallery generation) + key stats (route count, edge count) + CTA to view interactive version on desktop
- **Desktop:** Full interactive visualization with hydrated React component

Docs pages and the landing page are fully responsive with standard CSS.

### OG image generation

- **Gallery pages:** Auto-generated OG image showing the hierarchy view PNG with the app name overlaid — visually compelling when shared
- **Docs pages:** Branded template with page title and nav-map logo
- **Landing page:** Hand-crafted `og-image.png` (already exists)

All generated via Next.js `opengraph-image` route convention.
