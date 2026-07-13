# NavMap One-Command Adoption

## Objective

Make NavMap easy to adopt inside an existing web-app repository by delivering a backward-compatible `init -> open -> sync` workflow that launches the complete NavMap viewer without requiring the app to embed the React package or maintain a custom demo.

## Original Request

Make a plan to implement the changes that make NavMap easier to pick up and use with web apps.

## Intake Summary

- Input shape: `existing_plan`
- Audience: Developers using NavMap across several web-app repositories
- Authority: `approved`
- Proof type: `demo`
- Completion proof: A fresh fixture app and at least three existing dogfood apps complete `nav-map init`, `nav-map open`, and `nav-map sync`, with the complete viewer browser-verified and existing CLI/React APIs still passing compatibility checks.
- Goal oracle: A repeatable browser walkthrough and command receipt for the full per-repository workflow.
- Likely misfire: Shipping more low-level commands or viewer polish while the easiest CLI path still opens a reduced viewer or requires source-code integration.
- Blind spots considered: Schema migration, local/staging/prod URL portability, screenshot paths, project identity, generated artifact ownership, server lifecycle, and backward compatibility.
- Existing plan facts: Start with the per-repository experience; defer the multi-project workspace hub; add `init`, `open`, and `sync`; serve the real viewer; preserve existing scanner commands and the React package; verify against a fresh app and at least three dogfood apps.

## Goal Oracle

The oracle for this goal is:

`From a clean web-app repository, an operator can initialize NavMap, open the complete viewer, refresh its data, and repeat that workflow across at least three dogfood apps; browser evidence shows the real workflow UI, and compatibility verification remains green.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`existing_plan`

## Current Tranche

Deliver the full per-repository adoption milestone continuously: validate the existing plan, define the project contract, implement the complete bundled viewer path, add `init`, `open`, and `sync`, harden migration and assets, verify fresh-app and dogfood workflows, update onboarding documentation, and finish with an oracle-backed audit. The multi-project workspace hub is a later tranche.

## Provisional Architecture

The implementation should converge on one repository-owned project contract and one bundled viewer:

```text
web app repository
  .nav-map/
    project.json          stable project identity and environment-independent paths
    workflow.json         optional curated workflow intent
    generated/
      nav-map.json        current rendered graph
      receipts/           sync and verification summaries
      screenshots/        route and surface evidence

nav-map init              discover and safely create the project contract
nav-map open              resolve the project and launch the complete bundled viewer
nav-map sync              refresh graph/evidence through existing scan/workflow primitives
```

The exact file names remain subject to T001 validation. The important boundaries are:

- The project contract owns stable identity, relative artifact paths, source mode, manifest path, and named environments.
- Environment profiles own base URLs and default environment selection; workflow intent does not become machine-port-specific.
- Existing `scan`, `crawl`, `workflow`, `probe`, `diff`, and `serve` behavior remains callable. `open` and `sync` orchestrate those primitives rather than replacing their internals.
- `serve` should become compatible with the complete viewer or delegate to the same implementation so there is only one browser product.
- The bundled viewer consumes standard `NavMapGraph`; it must not know about PRcard, Deckchecker, Bleep, Seatify, or other specific apps.

## Planned Work Packages

### 1. Validate the contract and bundling approach

- Decide how the scanner package ships a browser-ready build of the real React viewer.
- Define the versioned project contract and compatibility behavior for repositories that already have `nav-map.json`, workflow manifests, or `nav-map.config.json`.
- Specify server lifecycle, default ports, no-browser behavior, and error/receipt contracts.
- Identify the smallest end-to-end vertical slice and its exact file boundary.

Exit gate: Judge produces an implementable first Worker card with explicit tests and stop conditions.

### 2. Unify `open` and `serve` on the complete viewer

- Bundle the actual NavMap UI with the scanner package.
- Add `nav-map open [dir]` project resolution and browser-launch behavior.
- Make `nav-map serve` use or delegate to the same viewer while retaining its existing file-oriented entry point.
- Serve graph data and nested screenshots safely; reject traversal and report missing artifacts clearly.
- Provide deterministic port selection and a machine-readable ready receipt.

Exit gate: the CLI opens a supplied PRcard graph in the complete viewer, exposes workflow/flow/audit/preview controls, and passes focused server and package-consumer tests.

### 3. Add safe, idempotent `init`

- Detect repository name, framework/source mode, likely workflow manifests, existing graph/config artifacts, and appropriate ignored output paths.
- Create a minimal versioned project contract without overwriting user files.
- Support non-interactive defaults plus explicit flags suitable for agents and CI.
- Explain every created, reused, skipped, or conflicting file in a safe receipt.

Exit gate: first run creates a valid project; second run is a no-op or offers a controlled migration; existing configurations remain usable.

### 4. Add `sync` orchestration

- Resolve the initialized project and selected environment.
- Invoke current scan, crawl, or workflow generation paths rather than duplicating scanner logic.
- Write graph and receipt artifacts atomically and preserve the last good graph on failure.
- Record warnings, screenshot counts, routes/surfaces processed, auth-state id only, and next actions.
- Keep `open` usable with the last successful graph when a new sync fails.

Exit gate: a changed fixture route appears after `sync`, failures leave a truthful receipt, and the complete viewer refreshes or reloads predictably.

### 5. Harden portability and migration

- Validate flows, project contracts, environment profiles, graph compatibility, and nested screenshot paths.
- Detect legacy flow shapes such as `id`/`label` and either migrate them explicitly or fail with an actionable message instead of rendering blank UI.
- Scope viewer preferences by stable project id and environment rather than mutable graph metadata.
- Cover port collisions, stale servers, missing browser launch support, malformed JSON, and partial artifacts.

Exit gate: focused migration and lifecycle tests cover the failures observed during the audit.

### 6. Prove adoption and update onboarding

- Create a disposable clean-app fixture for the full `init -> open -> sync` loop.
- Dogfood the same path on at least three existing apps representing curated workflow, scan-only, and local-environment cases.
- Verify exact URLs through HTTP and the in-app browser, with no framework/runtime errors.
- Update README and the NavMap skill so the one-command path is primary and low-level commands are advanced workflows.
- Run full tests, typecheck, build, package-consumer smoke, skill smoke, reliability gate, and browser walkthrough receipts.

Exit gate: final Judge maps fresh-app and three-app evidence to every oracle criterion.

## Explicit Non-Goals For This Tranche

- A global or hosted multi-project workspace hub.
- Cloud accounts, remote storage, collaboration, or sharing.
- A visual manifest editor.
- Automatic login, OAuth completion, or secret capture during `init`.
- Replacing the current scanner engines or changing the public React component API.
- Hard-coding dogfood app behavior in core or scanner code.

## Non-Negotiable Constraints

- Preserve existing scanner commands and the public React package API unless an additive compatibility layer is required.
- Keep app-specific behavior in manifests, fixtures, screenshots, or docs; do not hard-code dogfood apps into NavMap core.
- Treat auth storage and environment secrets as sensitive; identify auth states by id only.
- Use the complete `@neonwatty/nav-map` experience for the convenient viewer path.
- Add focused tests for scanner, manifest, migration, server, and lifecycle behavior.
- Browser-verify exact local URLs before reporting them ready.
- Stop development servers before production builds that share the same Next.js output directory.
- Record commands, routes, screenshots, auth-state ids, failures, warnings, and known limitations in verification receipts.
- Defer the multi-project workspace hub until the per-repository oracle is satisfied.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if a safe Worker task can be activated.

Do not stop after a single verified Worker package when the broader owner outcome still has safe local follow-up work. Advance the board to the next highest-leverage safe package until the oracle is satisfied.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny. Prefer coherent vertical slices that change the adoption workflow and can be demonstrated end to end.

## Board Health

Machine truth lives in `docs/goals/nav-map-one-command-adoption/state.yaml`. If the board looks stale or inconsistent, run:

```bash
node /Users/neonwatty/.codex/plugins/cache/goalbuddy/goalbuddy/0.4.0/skills/goal-prep/scripts/check-goal-state.mjs docs/goals/nav-map-one-command-adoption
```

## Run Command

```text
/goal Follow docs/goals/nav-map-one-command-adoption/goal.md.
```
