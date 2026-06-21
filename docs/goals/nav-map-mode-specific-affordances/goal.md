# Nav Map Mode-Specific Affordances

## Objective

Design and implement the next reusable UX slice that makes screenshot/prototype, mockup, and app review modes easier to understand and operate without hard-coding any app-specific behavior.

## Original Request

Continue after the merged Target/live UX polish and post-merge smoke, with the next product slice focused on mode-specific affordances for screenshot/mockup/app workflows.

## Intake Summary

- Input shape: `specific`
- Audience: agents and humans manually QAing nav-map workflow atlases
- Authority: `inferred`
- Proof type: `test`
- Completion proof: focused tests plus a fresh Playwright CLI smoke walkthrough proving screenshot/prototype, mockup, and app affordances are clear across PRcard, Deckchecker, and Bleep
- Goal oracle: a fresh Playwright CLI walkthrough plus focused tests prove users can distinguish screenshot/prototype, mockup, and app review affordances, understand which controls apply in each mode, and still use Target/live behavior without route regressions
- Likely misfire: adding broad mode labels or app-specific copy that makes the UI busier without actually clarifying what actions are available for each artifact kind
- Blind spots considered: screenshot/prototype surfaces are often static; mockups and apps can both have live URLs but different sandbox/interaction expectations; app mode may eventually support deeper interactive route walking that mockups/prototypes should not promise
- Existing plan facts: Target/live readiness and unavailable Animate UX are already merged, the demo smoke is the accepted Playwright CLI proof path while Codex Chrome is unavailable, and app-specific workflow data must stay in manifests/fixtures/docs

## Goal Oracle

The oracle for this goal is:

`Focused tests plus a fresh Playwright CLI smoke walkthrough over PRcard, Deckchecker, and Bleep show that screenshot/prototype, mockup, and app artifacts expose distinct useful affordances, unavailable controls explain themselves, Target/live behavior still works, and no route behavior regresses.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny slice, or clean-looking labels are not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`specific`

## Current Tranche

Audit the current UI and smoke coverage, choose the smallest reusable mode-specific affordance model, implement the first approved vertical slice, verify with focused tests and Playwright CLI, and stop only after final audit proves the slice.

## Non-Negotiable Constraints

- Do not inspect or print secrets, environment values, auth storage, cookies, tokens, localStorage, sessionStorage, OAuth secrets, private keys, service-role keys, or Playwright auth storage.
- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs; do not hard-code PRcard, Deckchecker, Bleep, or other app behavior into nav-map core.
- Preserve existing route behavior.
- Use Playwright CLI for browser proof until the Codex Chrome bridge is fixed.
- Add or update focused tests/docs for any UI, scanner, manifest, screenshot, or smoke behavior changed.
- Keep the UX quiet and operational: do not add explanatory marketing copy or noisy labels that do not unlock a user action or reduce ambiguity.

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

`docs/goals/nav-map-mode-specific-affordances/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/nav-map-mode-specific-affordances/goal.md.
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
