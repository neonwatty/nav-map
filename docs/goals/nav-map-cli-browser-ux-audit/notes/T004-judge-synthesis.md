# T004 Judge Synthesis

## Decision

Approved a bounded CLI manual-QA truthfulness and receipt-quality slice.

T002 blocks browser-UX claims and final completion, but it does not block local CLI/docs
implementation because T001 findings are concrete, secret-free, app-agnostic, and verifiable.
Browser UI refactors from T003 should wait until Codex Chrome observations exist.

## Ranked Findings

- High: T002 has no Codex Chrome observations; do not approve browser UI behavior changes or final
  completion from code inspection alone.
- High: `workflow --inspect --contract` is documented as read-first but writes a default artifact.
- High: README auth-state happy path uses PRcard `signed-in`, but PRcard has no authStates.
- High: `diff <manifest>` accepts but ignores the manifest argument, weakening expected-vs-observed
  trust.
- Medium-high: `diff --format json` and probe receipts are not agent-readable enough for manual QA
  without opening side files.
- Medium: T003 preview/readiness view-model is the best browser architecture follow-up, but should
  wait for browser proof.

## Approved Worker Slice

Implement the approved CLI manual-QA truthfulness slice:

- Make workflow inspect read behavior and help/output truthful.
- Fix README auth-state examples to use valid demo auth-state ids.
- Make diff's manifest argument either validated or removed from the contract.
- Align JSON output behavior.
- Enrich probe/diff/workflow receipts with agent-readable command, flow/node, route-variable key,
  screenshot summary, auth-state id-only, warning, and nextAction fields.
- Do not touch browser UI in this slice.

## Missing Evidence

- Fresh Codex Chrome walkthrough for PRcard, Deckchecker, and Bleep browser UX.
- Post-implementation scanner test results and CLI command receipts.
