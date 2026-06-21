# Nav Map Target Live UX Polish

## Objective

Polish the Target/live review experience so agents and humans can quickly understand live availability at node level, understand why Animate is unavailable, and rerun a small Playwright smoke workflow while the Codex Chrome bridge is unavailable.

## Original Request

Do the next efficient follow-up: the small Target/live UX polish board covering per-node live status clarity, clearer unavailable Animate state, and an optional repeatable Playwright smoke script.

## Intake Summary

- Input shape: `specific`
- Audience: agents and humans manually QAing nav-map screenshot, mockup, and app workflow atlases
- Authority: `requested`
- Proof type: `test`
- Completion proof: focused automated checks plus a repeatable Playwright CLI smoke receipt proving the polish across representative screenshot, mockup, and app datasets
- Goal oracle: a fresh Playwright CLI walkthrough shows Target/live status clarity, unavailable Animate messaging, and smoke workflow repeatability without Codex Chrome, while focused tests/docs prove the reusable model
- Likely misfire: improving labels in one demo path while leaving node-level live state, Animate disabled state, or repeatable QA proof ambiguous for other datasets
- Blind spots considered: live iframes may be blocked by server availability, auth, or embedding headers; mockup/app behavior may need different UX affordances; Playwright is an interim browser proof until Codex Chrome is fixed
- Existing plan facts: Codex Chrome bridge is currently broken, Playwright CLI is the approved fallback, previous live readiness work exists, and app-specific behavior must stay in manifests/fixtures/docs rather than nav-map core

## Goal Oracle

The oracle for this goal is:

`Focused tests plus a fresh Playwright CLI walkthrough over PRcard, Deckchecker, and Bleep demonstrate that users can see each relevant node's live/checking/offline/static/blocked/unavailable state, understand unavailable Animate controls, and rerun the same smoke workflow from documented commands without Codex Chrome.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`specific`

## Current Tranche

Discover the smallest reusable Target/live UX polish slice, implement it if Judge approves a bounded package, verify it with focused tests and Playwright CLI browser proof, and record any remaining Codex Chrome limitation as a follow-up rather than blocking local progress.

## Non-Negotiable Constraints

- Do not inspect or print secrets, environment values, auth storage, cookies, tokens, localStorage, sessionStorage, OAuth secrets, private keys, service-role keys, or Playwright auth storage.
- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs; do not hard-code PRcard, Deckchecker, Bleep, or other app behavior into nav-map core.
- Preserve existing route behavior.
- Use Playwright CLI for browser proof until the Codex Chrome bridge is fixed.
- Add or update focused tests/docs for any scanner, manifest, screenshot, or UI behavior changed.
- Record verification receipts: commands run, routes/datasets tested, screenshots captured when relevant, warnings, failures, and known limitations.
- Leave unrelated local changes alone, including generated `packages/demo/next-env.d.ts` noise.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if a safe Worker task can be activated.

Do not stop after a single verified Worker package when the broader owner outcome still has safe local follow-up work. Advance the board to the next highest-leverage safe Worker package and continue unless a phase, risk, rejected-verification, ambiguity, or final-completion review is due.

Do not create one Worker/Judge pair per repeated file, table, route, or helper. Put repeated same-shape work into one Worker package and review the package as a whole.

Do not stop because a slice needs owner input, credentials, production access, destructive operations, or policy decisions. Mark that exact slice blocked with a receipt, create the smallest safe follow-up or workaround task, and continue all local, non-destructive work that can still move the goal toward the full outcome.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good task is the largest safe useful slice.

Small is not the goal. Useful is the goal.

A Worker should finish the whole assigned slice. A Judge should judge the whole assigned slice. A PM should reorient the board when tasks are safe but not moving the outcome.

Tiny tasks are allowed when the failure is isolated, the risk is high, the scope is unknown, or the tiny task unlocks a larger slice. Tiny tasks are bad when they keep happening, do not change behavior, only add wrappers/contracts/proof files, or avoid the real milestone.

Do not stop because a slice needs owner input, credentials, production access, destructive operations, or policy decisions. Mark that exact slice blocked with a receipt, create the smallest safe follow-up or workaround task, and continue all local, non-destructive work that can still move the goal toward the full outcome.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-target-live-ux-polish/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/nav-map-target-live-ux-polish/goal.md.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Run the bundled GoalBuddy update checker when available and mention a newer version without blocking.
4. Re-check the intake: original request, input shape, authority, proof, blind spots, existing plan facts, and likely misfire.
5. Work only on the active board task.
6. Assign Scout, Judge, Worker, or PM according to the task.
7. Write a compact task receipt.
8. Update the board.
9. If safe local work remains, choose the next largest reversible Worker package and continue unless blocked.
10. If a problem, suggestion, or follow-up should become a repo artifact, create an approved issue/PR or ask the operator whether to create one.
11. Review at phase, risk, rejected-verification, ambiguity, or final-completion boundaries; do not review every small Worker by habit.
12. Finish only with a Judge/PM audit receipt that maps receipts and verification back to the original user outcome and records `full_outcome_complete: true`.

Issue and PR handoffs are supporting artifacts. `state.yaml` remains authoritative, and every external artifact decision must be recorded in a task receipt.
