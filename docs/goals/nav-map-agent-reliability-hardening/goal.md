# Nav Map Agent Reliability Hardening

## Objective

Close the remaining reliability gaps before `@neonwatty/nav-map` and `@neonwatty/nav-map-scanner` are relied on as agent workflow tools for app, HTML mockup, prototype, screenshot, and live-target review.

## Original Request

Plan out a complete GoalBuddy prep board to close the gaps before relying on the tool.

## Intake Summary

- Input shape: `specific`
- Audience: nav-map maintainers and agents using nav-map as pre-read, prototype, and workflow verification infrastructure.
- Authority: `requested`
- Proof type: `test`
- Completion proof: a final Judge/PM audit maps completed task receipts to a passing reliability oracle that includes CLI contracts, probe/diff receipts, demo browser smoke, package-consumer smoke, and docs that clearly frame screenshot/live-mode guarantees.
- Goal oracle: the repo exposes a documented, repeatable reliability gate where representative workflow manifests, app routes, HTML mockups, static prototypes, screenshots, auth-state edge cases, and live-target states are validated by commands that pass locally and are suitable for CI.
- Likely misfire: polishing docs or adding isolated tests while leaving agents without a single trusted workflow gate, or treating UI Target mode as audit proof instead of best-effort preview.
- Blind spots considered: auth-state expiration and wrong-persona failure modes; screenshot capture scope for surfaces vs app nodes; external package consumption outside the monorepo; cross-origin iframe/no-cors limits; existing large-file maintainability warnings.
- Existing plan facts: close the gaps identified in the app/package status review: make `probe`/`diff` the official reliability gate, add a golden workflow fixture, clarify screenshot guarantees, strengthen auth-state ergonomics, add package-consumer smoke, keep live mode framed as preview not audit, and pay down large-file risk where it helps reliability.

## Goal Oracle

The oracle for this goal is:

`pnpm validate` plus a local demo browser smoke, CLI contract checks for a golden workflow fixture, probe/diff receipts for expected healthy and failing routes, auth-state edge-case receipts that never expose storage contents, and an external package-consumer smoke all pass; final docs accurately explain which evidence is audit-grade and which evidence is preview-only.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`specific`

## Current Tranche

Complete successive safe, verified hardening slices until nav-map has a repeatable reliability story for agents:

1. Confirm current behavior and turn the gap list into acceptance gates.
2. Implement a golden workflow fixture and official reliability gate.
3. Harden screenshot, auth-state, live-target, and package-consumer proof paths.
4. Update docs only where they reduce misuse.
5. Run final validation and browser smoke before completion.

## Non-Negotiable Constraints

- Do not inspect, print, commit, or summarize `.nav-map/auth/*.storage.json`, cookies, tokens, localStorage, session contents, private keys, raw env values, OAuth secrets, webhook secrets, or service-role keys.
- Keep app-specific workflow data in manifests, fixtures, screenshots, docs, or tests; do not hard-code PRcard, Deckchecker, Seatify, or other app behavior into nav-map core.
- Treat UI Target mode as lightweight preview/reachability unless stronger probe/diff or browser-walkthrough receipts prove behavior.
- When changing scanner or manifest behavior, add focused tests and run the relevant package test command before reporting completion.
- Record receipts for workflow verification: commands run, routes tested, screenshots captured, auth state used by id only, failures, warnings, and known limitations.
- Do not commit `.codex-workers/` or GoalBuddy generated local board server state outside the goal directory.
- Preserve unrelated dirty work; do not revert user changes.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if safe Worker tasks remain.

Do not stop after a single verified Worker package when the broader owner outcome still has safe local follow-up work. Advance the board to the next highest-leverage safe Worker package and continue unless a phase, risk, rejected-verification, ambiguity, or final-completion review is due.

Do not create one Worker/Judge pair per repeated file, table, route, or helper. Put repeated same-shape work into one Worker package and review the package as a whole.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good task is the largest safe useful slice.

Small is not the goal. Useful is the goal.

A Worker should finish the whole assigned slice. A Judge should judge the whole assigned slice. A PM should reorient the board when tasks are safe but not moving the outcome.

Tiny tasks are allowed when the failure is isolated, the risk is high, the scope is unknown, or the tiny task unlocks a larger slice. Tiny tasks are bad when they keep happening, do not change behavior, only add wrappers/contracts/proof files, or avoid the real milestone.

Do not stop because a slice needs owner input, credentials, production access, destructive operations, or policy decisions. Mark that exact slice blocked with a receipt, create the smallest safe follow-up or workaround task, and continue all local, non-destructive work that can still move the goal toward the full outcome.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-agent-reliability-hardening/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/nav-map-agent-reliability-hardening/goal.md.
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
10. Review at phase, risk, rejected-verification, ambiguity, or final-completion boundaries; do not review every small Worker by habit.
11. Finish only with a Judge/PM audit receipt that maps receipts and verification back to the original user outcome and records `full_outcome_complete: true`.
