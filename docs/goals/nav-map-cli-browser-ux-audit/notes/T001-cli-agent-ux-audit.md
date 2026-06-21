# T001 CLI Agent UX Audit

## Summary

Audited agent-first CLI UX for workflow inspect/context/auth-state/probe/diff/generation using
docs, help, implementation, tests, and demo manifests. CLI has a strong agent loop and contract
envelope, but several commands still write by default, some docs reference invalid auth ids,
probe/diff semantics are less read-only than labels imply, and receipts are partly console-only or
path-only instead of fully agent-readable.

## Ranked Findings

- High: `workflow --inspect --contract` is documented as the read-first command, but implementation
  always writes an output file via `runWorkflowInspectManifest`; default CLI output remains
  `nav-map.json`, while mode default is `workflow.inspect.json`.
- High friction: README scanner loop tells agents to run `auth-state verify ... prcard.workflow.json
  --state signed-in`, but PRcard manifest has no `authStates`; this makes the published happy path
  fail before agents reach probe/diff.
- High: `diff` accepts a manifest argument but ignores it, so agents can pass the wrong manifest and
  still get a diff from probe data; this weakens expected-vs-observed trust.
- Medium-high: `diff --format json` is called in README as if it prints JSON, but implementation
  writes JSON to default `.md` path and only prints `Wrote ...`, creating a format/path mismatch for
  agents.
- Medium-high: `probe` contract is described as an agent receipt, but command output only prints
  route/fail/warn counts; agents must know to open the out path to get artifacts/check detail.
- Medium: probe receipts include screenshot paths and route results, but no top-level selected
  flow/nodes, skipped surfaces, route variable keys applied, or command argv.
- Medium: `workflow` generation returns a structured receipt internally but only prints a lossy
  single-line receipt; there is no `--receipt`, `--contract`, or JSON output for generation.
- Medium: contract nextActions contain placeholder commands such as `<manifest>` and `<base-url>`,
  which preserve generality but are less directly runnable by agents after a successful verify/diff.
- Medium-low: top-level help and README correctly explain that Target preview is lightweight and
  probe/diff provide stronger audit evidence; preserve this.
- Medium-low: context contracts successfully distinguish PRcard app routes plus mockup/prototype
  surfaces and Deckchecker auth-state ids/route variables without exposing storage contents.
- Low: tests cover redaction, context contracts, workflow inspect contracts, probe status
  evaluation, and diff contracts, but have little CLI-level coverage for help examples, invalid
  README sample commands, stdout-vs-file behavior, or default output extension choices.

## Commands Inspected Or Run

- `node packages/scanner/bin/nav-map.js --help`
- `node packages/scanner/bin/nav-map.js workflow --help`
- `node packages/scanner/bin/nav-map.js context --help`
- `node packages/scanner/bin/nav-map.js auth-state --help`
- `node packages/scanner/bin/nav-map.js probe --help`
- `node packages/scanner/bin/nav-map.js diff --help`
- `node packages/scanner/bin/nav-map.js context packages/demo/public/prcard.workflow.json --format json --contract --line-budget 80`
- `node packages/scanner/bin/nav-map.js context packages/demo/public/deckchecker-speaker.workflow.json --format json --contract --line-budget 80`

## Recommended Changes

- Add a read-only stdout mode for `workflow --inspect --contract`, or make `--out` explicit and
  align default inspect output/help.
- Fix the README auth-state sample to use Deckchecker speaker auth state, or add PRcard authStates
  if PRcard auth is intended.
- Make `diff` validate the manifest against probe app/ids, or remove the manifest argument; add
  contract and JSON default-extension behavior.
- Enrich probe/generation receipts with command, selected flow/nodes, skipped surfaces, route
  variables applied, screenshot count/path summary, auth state id only, warnings, and nextActions.
- Add CLI integration tests for README command snippets with safe demo manifests, help text
  assertions for the agent loop, no-write inspect stdout mode, JSON output extension behavior, and
  contract redaction regressions.

## Ambiguities For Judge

- Whether `workflow --inspect` should be stdout-only by default for agents or continue writing a
  durable inspect artifact.
- Whether probe/diff should be considered write commands only, or gain explicit dry-run/stdout modes
  for read-only agent audits.
- Whether PRcard should gain an auth-state fixture or README should steer auth-state examples
  exclusively to Deckchecker.
