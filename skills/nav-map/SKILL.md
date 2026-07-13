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

## Default Repository Loop

Prefer the project workflow unless the user explicitly needs a low-level scanner primitive:

```bash
# Once per web-app repository
nav-map init .

# Repeat whenever routes or workflow intent change
nav-map sync
nav-map open
```

For curated intent, initialize with `--manifest <path>`. For a live crawl, use `--url <url>`.
Add `--base-url <url>` to create the initial `local` environment, and select it later with
`sync --environment local`. Use `--no-screenshots` for safe offline generation. `init` is
idempotent and refuses conflicting configuration; `sync` preserves the last good graph and writes
a receipt; `open` launches the complete viewer without requiring React integration in the app.

Treat `scan`, `crawl`, `workflow`, `probe`, `diff`, and `serve` as advanced primitives for custom
automation, audit evidence, or legacy file-oriented workflows.

## Safety Rules

- Do not inspect, print, commit, or summarize `.nav-map/auth/*.storage.json` or other Playwright auth storage contents.
- Do not print cookies, tokens, passwords, OAuth secrets, private keys, service-role keys, raw env values, or browser auth storage.
- Reference auth states by manifest id only, such as `owner` or `speaker`.
- Keep app-specific workflow data in manifests, templates, fixtures, screenshots, and docs. Do not hard-code app behavior into NavMap core.
- Treat UI Target mode as a lightweight browser reachability preflight. Use `probe` and `diff` receipts for audit evidence.

## Pick The Workflow

- **Existing app routes**: run `init`, `sync`, and `open`; add a workflow manifest when product intent matters beyond discovered routes.
- **HTML mockups or prototype screens**: add them as `surfaces`; keep screenshots or live HTML paths in manifest metadata. Use the schema-supported surface types: `screenshot`, `generated-image`, `html-mockup`, `video`, `keyframe`, `component`, and `concept-screen`.
- **Screenshots only**: attach `screenshot` paths to route nodes or surfaces, then generate `nav-map.json` without live capture.
- **Live app QA**: run `probe --contract`, then `diff` against the manifest.
- **Authenticated app QA**: define `authStates` with ids and verification routes. Verify with `auth-state verify --contract` before probing.

## Agent Loop

For a workflow project, initialize once and inspect/context before touching a browser:

```bash
nav-map init . --manifest <manifest> --base-url <url>
nav-map workflow <manifest> --inspect --contract
nav-map context <manifest> --format json --contract
```

For live route evidence:

```bash
nav-map probe <manifest> --base-url <url> --contract
nav-map diff <manifest> --probe .nav-map/probe-runs/latest.json --format json
```

Use `--out <path>` or `--output <path>` when a probe receipt needs a stable handoff path.

For auth-gated routes:

```bash
nav-map auth-state verify <manifest> --state <id> --base-url <url> --contract
nav-map probe <manifest> --base-url <url> --auth-state <id> --contract
```

To generate a graph and capture route screenshots:

```bash
nav-map sync --environment local
nav-map open
```

Use the lower-level `workflow <manifest> --base-url ... --screenshot-dir ... -o ...` command when
the output must go to a custom path outside the project artifact contract.

Use `--no-screenshots` when a manifest is screenshot-backed or prototype-only and no live app should be loaded.

If browser automation or a live app is unavailable, do not fabricate probe/diff evidence. Finish the offline path with `workflow --inspect`, `context`, and `workflow --no-screenshots`, then report the browser limitation. Inside the NavMap repo, use `pnpm reliability:agent` for a deterministic local probe/diff loop that starts its own fixture server.

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
