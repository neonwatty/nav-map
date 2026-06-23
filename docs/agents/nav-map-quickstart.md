# NavMap Agent Quickstart

Use NavMap when an agent needs compact workflow context before inspecting an app, prototype, HTML mockup, or screenshot set.

## 1. Start With A Manifest

Copy one starter and adapt ids, labels, routes, personas, sections, edges, and flows:

```bash
cp templates/nav-map/app.workflow.json ./workflow.nav-map.json
cp templates/nav-map/prototype-surfaces.workflow.json ./prototype.workflow.json
cp templates/nav-map/auth-workflow.workflow.json ./auth.workflow.json
```

Keep product-specific knowledge in the manifest, not in NavMap core.

## 2. Inspect Before Browsing

```bash
nav-map workflow ./workflow.nav-map.json --inspect --contract
nav-map context ./workflow.nav-map.json --format json --contract
```

Use the contract output to decide which routes, surfaces, screenshots, and auth states matter.

## 3. Prototype And Screenshot Work

Represent static HTML mockups, concept screens, and component previews as `surfaces`.

```bash
nav-map workflow ./prototype.workflow.json --no-screenshots -o public/nav-map.json
```

Surface screenshots are reused from the manifest. Live screenshot capture navigates route `nodes` only.

## 4. Live App Verification

```bash
nav-map probe ./workflow.nav-map.json --base-url http://localhost:3000 --contract
nav-map diff ./workflow.nav-map.json --probe .nav-map/probe-runs/latest.json --format json
```

Use probe and diff receipts as evidence. UI Target mode is only a lightweight reachability preflight.
Use `--out <path>` or `--output <path>` to keep probe receipts at a stable path for handoff.

If no live app or browser automation is available, do not invent probe evidence. Complete the offline checks instead:

```bash
nav-map workflow ./workflow.nav-map.json --inspect --contract
nav-map context ./workflow.nav-map.json --format json --contract
nav-map workflow ./workflow.nav-map.json --no-screenshots -o public/nav-map.json
```

Inside the NavMap repo, run `pnpm reliability:agent` for a deterministic probe/diff loop with its own local fixture server.

## 5. Auth-Safe Verification

Define auth states by id in the manifest. Do not inspect or print the storage-state file.

```bash
nav-map auth-state verify ./auth.workflow.json --state owner --base-url http://localhost:3000 --contract
nav-map probe ./auth.workflow.json --base-url http://localhost:3000 --auth-state owner --contract
```

Report the auth-state id and safe reason codes only.

## 6. Generate The Graph

```bash
nav-map workflow ./workflow.nav-map.json \
  --base-url http://localhost:3000 \
  --screenshot-dir public/screenshots/workflow \
  -o public/nav-map.json
```

Then render with `@neonwatty/nav-map` and keep the generated graph plus screenshots in app assets.

## 7. Report A Receipt

Use `templates/nav-map/agent-receipt.md` and include commands run, routes tested, surfaces inspected, screenshots captured or reused, artifact paths, failures, warnings, and known limitations.
