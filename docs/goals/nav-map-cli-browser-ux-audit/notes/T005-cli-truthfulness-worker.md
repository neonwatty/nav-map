# T005 CLI Truthfulness Worker Receipt

## Result

Done.

## Changes

- Made `workflow -o/--output` default per mode instead of forcing `--inspect` to write `nav-map.json`.
  - Generation still defaults to `nav-map.json`.
  - Inspect now defaults through the mode layer to `workflow.inspect.json`.
- Made `diff <manifest>` load and validate the manifest against the probe receipt before writing.
  - App name must match.
  - Probe result node ids must exist in manifest route nodes.
- Made `diff --format json` default to `.nav-map/probe-runs/latest.diff.json`; Markdown still defaults to `.nav-map/probe-runs/latest.diff.md`.
- Enriched workflow/probe/diff receipts with reusable agent-readable metadata:
  - command strings
  - selected flow/node ids
  - route-variable keys
  - screenshot summaries
  - warning lists
  - nextActions
- Kept new probe receipt fields backward-compatible so older saved probe JSON can still be rendered by `diff`.
- Fixed the README agent QA auth-state example to use Deckchecker's valid `speaker` auth-state id instead of PRcard persona ids.

## Files Changed

- `README.md`
- `packages/scanner/src/commands/workflow.ts`
- `packages/scanner/src/commands/diff.ts`
- `packages/scanner/src/commands/probe.ts`
- `packages/scanner/src/modes/workflow.ts`
- `packages/scanner/src/modes/diff.ts`
- `packages/scanner/src/modes/probe.ts`
- `packages/scanner/src/__tests__/workflow.test.ts`
- `packages/scanner/src/__tests__/diff.test.ts`
- `packages/scanner/src/__tests__/probe.test.ts`
- `packages/scanner/src/__tests__/commands.test.ts`

## Verification

- Pass: `pnpm --filter @neonwatty/nav-map-scanner test -- packages/scanner/src/__tests__/workflow.test.ts packages/scanner/src/__tests__/diff.test.ts packages/scanner/src/__tests__/probe.test.ts packages/scanner/src/__tests__/commands.test.ts`
  - `164 passed`, `2 skipped`
- Pass: `pnpm --filter @neonwatty/nav-map-scanner typecheck`
- Pass: `pnpm --filter @neonwatty/nav-map-scanner build`
- Pass: `node packages/scanner/bin/nav-map.js workflow --help`
- Pass: `node packages/scanner/bin/nav-map.js diff --help`
- Pass: `node packages/scanner/bin/nav-map.js probe --help`
- Pass: `node packages/scanner/bin/nav-map.js context packages/demo/public/prcard.workflow.json --format json --contract --line-budget 80`
  - Contract summary: app `PRcard Workflow Atlas`, `14` routes, `3` surfaces, `4` flows.
- Pass: `node packages/scanner/bin/nav-map.js context packages/demo/public/deckchecker-speaker.workflow.json --format json --contract --line-budget 80`
  - Contract summary: app `Deckchecker Speaker Workflow`, `11` routes, `0` surfaces, `4` flows.

## Browser Status

Codex Chrome/browser UX proof remains blocked by T002's runtime issue:
`codex/sandbox-state-meta: missing field sandboxPolicy`.

No browser UI files were changed in this slice, per the T004 decision.

## Known Limitations

- Final goal completion is still blocked until T002 can be rerun with working Codex Chrome control.
- The top-level help's short QA loop still shows `diff` without `--format json`; the command-specific help and README now document JSON behavior.
