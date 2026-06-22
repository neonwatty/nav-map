---
name: nav-map
description: Use when an agent needs to map, inspect, prototype, or verify an app workflow with NavMap. Covers workflow manifests, screenshots, HTML mockup surfaces, live route probes, auth-state-safe checks, agent context contracts, and nav-map.json generation.
metadata:
  short-description: Map and verify app workflows with NavMap
---

# NavMap

Use this skill when the user wants an agent-readable workflow atlas for an app, site, prototype, HTML mockup, or screenshot-backed review.

NavMap has two installable pieces:

- `@neonwatty/nav-map`: React viewer and workflow types.
- `@neonwatty/nav-map-scanner`: `nav-map` CLI for context, probes, diffs, screenshots, and graph generation.

## Safety Rules

- Do not inspect, print, commit, or summarize `.nav-map/auth/*.storage.json` or other Playwright auth storage contents.
- Do not print cookies, tokens, passwords, OAuth secrets, private keys, service-role keys, raw env values, or browser auth storage.
- Reference auth states by manifest id only, such as `owner` or `speaker`.
- Keep app-specific workflow data in manifests, templates, fixtures, screenshots, and docs. Do not hard-code app behavior into NavMap core.
- Treat UI Target mode as a lightweight browser reachability preflight. Use `probe` and `diff` receipts for audit evidence.

## Pick The Workflow

- **Existing app routes**: create a workflow manifest with `nodes`, `edges`, and `flows`, then run `context`, `probe`, `diff`, and `workflow`.
- **HTML mockups or prototype screens**: add them as `surfaces`; keep screenshots or live HTML paths in manifest metadata.
- **Screenshots only**: attach `screenshot` paths to route nodes or surfaces, then generate `nav-map.json` without live capture.
- **Live app QA**: run `probe --contract`, then `diff` against the manifest.
- **Authenticated app QA**: define `authStates` with ids and verification routes. Verify with `auth-state verify --contract` before probing.

## Agent Loop

Start with inspect and context before touching a browser:

```bash
nav-map workflow <manifest> --inspect --contract
nav-map context <manifest> --format json --contract
```

For live route evidence:

```bash
nav-map probe <manifest> --base-url <url> --contract
nav-map diff <manifest> --probe .nav-map/probe-runs/latest.json --format json
```

For auth-gated routes:

```bash
nav-map auth-state verify <manifest> --state <id> --base-url <url> --contract
nav-map probe <manifest> --base-url <url> --auth-state <id> --contract
```

To generate a graph and capture route screenshots:

```bash
nav-map workflow <manifest> \
  --base-url <url> \
  --screenshot-dir public/screenshots/workflow \
  -o public/nav-map.json
```

Use `--no-screenshots` when a manifest is screenshot-backed or prototype-only and no live app should be loaded.

## Templates

If this skill is used from the NavMap repo, start from:

- `templates/nav-map/app.workflow.json`
- `templates/nav-map/prototype-surfaces.workflow.json`
- `templates/nav-map/auth-workflow.workflow.json`
- `templates/nav-map/agent-receipt.md`

When using the package elsewhere, recreate the same pattern: personas, sections, route nodes, prototype surfaces, edges, flows, expectations, auth-state ids, and source hints.

## Receipts

When reporting back, include:

- Commands run.
- Routes or surfaces inspected.
- Screenshots captured or reused.
- Auth state ids used, never storage contents.
- Probe and diff artifact paths.
- Failures, warnings, skipped live captures, and known limitations.

## Validation

Inside the NavMap repo, run:

```bash
pnpm smoke:skill
pnpm reliability:agent
```

Before relying on published packages, also run:

```bash
pnpm smoke:package-consumer
```
