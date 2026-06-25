# Growth Ops Agent Dogfood

Date: June 25, 2026

Target repo: `/Users/neonwatty/Desktop/growth-ops`

Target app: Growth Asset Studio at `http://127.0.0.1:5173`

## Goal

Run a clean "new agent adopts NavMap" pass against a real local app that is not a Next.js app.
The target is an Express/Vite SPA with read-only catalog browsing and write-capable operator
controls.

## Safety Boundary

Asset Studio is safe for read-only page loads, read-only API requests, screenshots, and manifest
context generation. It is not safe for blind interaction crawling because visible controls can
archive, promote, update placement metadata, review lineage, or trigger upload flows with explicit
write confirmations in the app code.

Use `crawl --no-interactions` unless a human approves a scoped manual action plan.

Do not run with live S3 sync for this dogfood pass. Keep `live=false` for API probes.

## Receipts

Started the app:

```bash
cd /Users/neonwatty/Desktop/growth-ops
npm run studio:dev
```

Verified local service:

```bash
curl -fsSI http://127.0.0.1:5173/
curl -fsS http://127.0.0.1:5173/api/projects
```

Browser render check:

- Title: `Growth Asset Studio`
- Visible app text included `Asset Studio`, `Assets`, `Lineage`, and `Sync S3`.
- No framework or runtime error was visible.

Safe live crawl:

```bash
node packages/scanner/bin/nav-map.js crawl http://127.0.0.1:5173 \
  --no-interactions \
  --max-pages 5 \
  --screenshot-dir .nav-map/artifacts/growth-ops/screenshots \
  --diagnostics-output .nav-map/artifacts/growth-ops/diagnostics.json \
  -o .nav-map/artifacts/growth-ops/nav-map.json
```

Result:

- Routes: 1
- Edges: 0
- Pages attempted: 1
- Pages succeeded: 1
- Screenshot failures: 0
- Diagnostics: ok

Agent workflow loop:

```bash
node packages/scanner/bin/nav-map.js workflow docs/dogfood/growth-ops-asset-studio.workflow.json --inspect --contract -o .nav-map/artifacts/growth-ops-workflow/inspect.contract.json
node packages/scanner/bin/nav-map.js context docs/dogfood/growth-ops-asset-studio.workflow.json --format json --contract -o .nav-map/artifacts/growth-ops-workflow/context.contract.json
node packages/scanner/bin/nav-map.js probe docs/dogfood/growth-ops-asset-studio.workflow.json --base-url http://127.0.0.1:5173 --contract --out .nav-map/artifacts/growth-ops-workflow/probe.contract.json --screenshots-dir .nav-map/artifacts/growth-ops-workflow/probe-screenshots
node packages/scanner/bin/nav-map.js diff docs/dogfood/growth-ops-asset-studio.workflow.json --probe .nav-map/artifacts/growth-ops-workflow/probe.contract.json --format json --out .nav-map/artifacts/growth-ops-workflow/diff.json
node packages/scanner/bin/nav-map.js workflow docs/dogfood/growth-ops-asset-studio.workflow.json --base-url http://127.0.0.1:5173 --screenshot-dir .nav-map/artifacts/growth-ops-workflow/screenshots -o .nav-map/artifacts/growth-ops-workflow/nav-map.json
```

Result:

- Inspect: valid manifest
- Context: 3 routes, 2 surfaces, 2 flows
- Probe: 3 pass, 0 warn, 0 fail
- Generated graph: 5 nodes, 4 edges, 3 groups, 3 route screenshots
- Screenshot capture: 3 route screenshots captured, 2 non-route surfaces skipped as expected

## Dogfood Findings

1. Live crawl is easy and reliable for a read-only receipt, but it is too shallow for a Vite SPA
   whose important states are controlled by component state rather than routes.
2. Agents need manifest-first guidance for admin/operator apps with write-capable controls.
3. The manifest workflow is effective for mixing the app route, read-only API routes, component
   state notes, and explicit safety boundaries.
4. The CLI help says to use `diff`, but `diff` uses `--out`; nearby commands accept `-o`. That
   inconsistency slowed the loop and should be smoothed later.
5. Dogfooding exposed a probe bug: one shared Playwright page could leak aborted network requests
   from the previous route into the next route's receipt. The probe now opens a fresh page per route
   inside the same browser context.

## Next Good Improvements

- Add a packaged "operator/admin app" guide that says when to use `crawl --no-interactions` and
  when to write a workflow manifest first.
- Consider adding `-o` as an alias for `nav-map diff --out` for command consistency.
- Add a small manifest authoring helper or template for SPA component states and safety boundaries.
