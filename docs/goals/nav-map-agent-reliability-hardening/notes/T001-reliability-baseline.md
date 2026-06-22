# T001 Reliability Baseline

## Current Product Surface

- Monorepo packages:
  - `@neonwatty/nav-map`: React component package with ESM/CJS/types exports, validation and workflow subpath exports, and CSS export.
  - `@neonwatty/nav-map-scanner`: CLI package with `nav-map` bin and scanner/agent workflow commands.
  - `demo`: Next.js app consuming the workspace package with `transpilePackages`.
- Main documented agent loop:
  - `workflow --inspect --contract`
  - `context --format json --contract`
  - `auth-state verify --contract`
  - `probe --contract`
  - `diff --format json`
  - `workflow --base-url --screenshot-dir`
- README already frames UI Target mode as lightweight reachability and says probe/diff receipts are stronger audit evidence.

## Existing Fixture Coverage

- `packages/demo/public/prcard.workflow.json` and `prcard.nav-map.json`
  - 14 app route nodes, 3 prototype surface nodes, 4 flows.
  - Covers generated-image prototype, HTML mockup with local iframe URL, component reference, saved screenshots, route health, search, flow animation, and live target labels.
- `packages/demo/public/deckchecker-speaker.workflow.json` and generated graph
  - 11 nodes, 4 flows, route variables, auth-state IDs, signed-out redirect expectations, protected speaker routes, and source hints.
  - Good auth/probe manifest shape, but it depends on an external app/service for real route proof.
- `packages/demo/public/seatify-local.nav-map.json`
  - 12 nodes, 16 edges, 2 flows, local signed-out app dogfood data, protected-route redirect context, saved screenshots.
  - Useful local fixture, but live reachability depends on a separate app server and known frame policy limits.
- `packages/demo/public/bleep-app.nav-map.json`
  - 19 app scan nodes, 24 edges, 6 flows, external target behavior.
- Gap: no deliberately tiny golden fixture that combines one app route, one protected redirect, one HTML mockup, one static prototype, one screenshot, and one offline target in a minimal stable package.

## Existing Test And Smoke Coverage

- Current verification snapshot:
  - `pnpm -s test`: pass. Core 45 files / 304 tests. Scanner 21 passed and 1 skipped files / 164 passed and 2 skipped tests.
  - `pnpm -s lint`: pass with 18 existing `max-lines` warnings and no errors.
  - `pnpm -s format:check`: pass.
  - `pnpm -s knip:production`: pass.
  - `pnpm -s typecheck`: pass.
  - `pnpm -s build`: pass.
  - `pnpm smoke:demo --url http://localhost:3001`: pass after HTTP check and temporary demo server.
- Demo smoke covers PRcard, Deckchecker, Bleep, Seatify local, Saved/Target toggle behavior, app/prototype/mockup details, static prototype disabled target, HTML mockup live iframe readiness, search, audit focus, flow animation, invalid dataset fallback, and expected offline/unverified target labels.
- Test coverage exists for:
  - workflow inspect/generation contracts and storage-path redaction;
  - context contract, filtering, surfaces, evidence kinds, and secret-shaped redaction;
  - probe route variables, expectations, signed-out redirects, screenshots, probe contract, and redaction;
  - diff rendering, contract summaries, manifest/run validation, and contract-envelope loading;
  - auth-state helper redaction and contract output;
  - live readiness planning and labels;
  - artifact preview classification for app/mockup/prototype.

## Evidence Strength By Gap

- Official reliability gate: partially present.
  - CLI help and README teach the loop.
  - There is no single first-class package script that runs an agent reliability gate over a stable representative fixture.
- Golden workflow fixture: missing.
  - Existing fixtures are useful but large and app-specific.
  - A small deterministic fixture would let tests and docs stay crisp.
- Screenshot guarantees: partly strong.
  - Workflow generation receipts record route-node capture and skipped surface IDs.
  - Tests prove surfaces are manifest artifacts rather than live capture targets.
  - Gap remains: no minimal fixture/command that makes this guarantee easy for agents to verify end-to-end.
- Auth-state ergonomics: partly strong.
  - Contracts use auth-state IDs and redact storage paths.
  - Tests cover missing/anonymous/broken helper states, but less end-to-end CLI behavior for missing file, expired/wrong persona, and expected vs unexpected redirects.
- Package-consumer smoke: missing.
  - Builds pass inside monorepo.
  - No script currently verifies downstream consumption of built exports, CSS export, type declarations, dynamic import expectations, or scanner bin behavior from a temp consumer.
- Live Target framing: strong in docs/UI smoke, still worth guarding.
  - README and CLI help call it lightweight preflight.
  - Smoke asserts saved fallbacks and target labels.
  - Risk: future UI copy or tests could accidentally imply Target mode is audit proof.
- Maintainability: known risk.
  - 18 max-lines warnings remain, including reliability-critical files such as workflow manifest conversion, probe/context/workflow modes, live readiness, and connection panel.
  - This should be deferred until reliability gates are implemented unless refactor directly improves the touched reliability path.

## Risk-Ranked Acceptance Gates

1. Add a first-class local reliability gate command that runs inspect/context/probe/diff-style checks against deterministic fixtures and produces safe agent-readable receipts.
2. Add a minimal golden workflow fixture and generated graph/tests that cover app route, protected redirect, HTML mockup, static prototype, screenshot evidence, and offline/unavailable target behavior.
3. Make screenshot receipts and docs impossible to misread: app route screenshots are captured; surfaces are static manifest evidence unless explicitly served as live targets.
4. Add auth-state CLI/contract tests for missing state, missing storage file, failed verification, expected redirect, and unexpected redirect without exposing auth storage contents.
5. Add an external package-consumer smoke that exercises built exports, CSS export, types, dynamic Next-style import shape where practical, and scanner bin availability.
6. Preserve live Target as preview-only in docs, help, UI labels, and smoke assertions.
7. Refactor large reliability-critical files only after gates exist and only when behavior stays covered.

## Recommended Board Adjustments

- Keep T003 before T004 only if T003 creates a lightweight wrapper around existing fixture checks. If T003 needs a deterministic golden fixture to be meaningful, Judge should approve swapping T004 before or into T003.
- T007 should be required before final audit; monorepo build success is not enough evidence for package reliability.
- T009 should remain optional/deferred unless earlier Worker tasks touch those large files and tests make extraction low-risk.
