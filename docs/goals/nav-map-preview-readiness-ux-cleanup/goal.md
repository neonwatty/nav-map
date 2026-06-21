# Nav Map Preview Readiness UX Cleanup

## Objective

Make nav-map's screenshot, mockup, prototype, and app review experience simple enough for agents and humans to use during manual QA without ambiguity about what is saved, live-capable, actually embeddable, offline, or only a static reference.

## Original Request

Create a GoalBuddy prep board from the three-agent audit of the current CLI UX and Codex Chrome UX, focusing on whether screenshot, mockup, and app versions are comprehensive, complete, and as simple as possible for agent and human manual QA.

## Intake Summary

- Input shape: `existing_plan`
- Audience: agents and humans using nav-map for manual QA of screenshots, HTML mockups, static prototypes, and live app routes.
- Authority: `requested`
- Proof type: `demo`
- Completion proof: focused tests plus fresh Codex Chrome walkthroughs across PRcard, Deckchecker, and Bleep showing clear preview/readiness language, usable responsive controls, correct target-state semantics, and improved CLI/context output.
- Goal oracle: fresh Codex Chrome and CLI receipts proving the four UX axes are distinct: artifact type, current preview, target preflight, and route/workflow audit.
- Likely misfire: renaming labels or adding docs while the app still shows misleading states such as `App / Live` in screenshot mode, `Ready` for unverified external targets, duplicate `Static`, or empty workflow counters for raw scans.
- Blind spots considered: browser reachability is not the same as iframe embeddability; route health and target readiness answer different questions; CLI agent flows are currently powerful but fragmented; persisted UI state can contaminate cross-dataset review.
- Existing plan facts: three independent audits converged on preview-label ambiguity, overconfident live readiness, toolbar overflow, cross-dataset stale state, missing surface context, thin workflow receipts, and fragmented CLI guidance.

## Goal Oracle

The oracle for this goal is:

`A fresh Codex Chrome walkthrough of http://localhost:3001/?dataset=prcard, http://localhost:3001/?dataset=deckchecker-speaker, and http://localhost:3001/?dataset=bleep proves that app routes, HTML mockups, static prototypes, saved screenshots, live targets, unverified external targets, offline targets, route health, and workflow metadata are labeled as separate concepts; primary controls remain visible at 858px with panels open; dataset switches do not retain confusing transient context; and CLI/context output gives agents a clear screenshot/mockup/app workflow including surfaces and receipts.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`existing_plan`

## Current Tranche

Turn the three-agent audit into successive safe implementation packages that simplify nav-map's manual QA UX without weakening existing route behavior. The tranche is complete only when the UI, CLI/context surface, tests, and Chrome dogfood all agree on the simplified model.

## Non-Negotiable Constraints

- Do not inspect or print secrets, cookies, tokens, env values, OAuth secrets, private keys, service-role keys, browser storage, or Playwright auth storage.
- Treat `.nav-map/auth/*.storage.json` and similar auth-state files as sensitive.
- Keep app-specific behavior in manifests, fixtures, screenshots, or docs; do not hard-code PRcard, Deckchecker, Bleep, localhost ports, or project-specific workflows into nav-map core.
- Preserve existing route behavior, screenshot fallback behavior, mockup rendering, prototype surface rendering, and app route rendering.
- Keep the UX model explicit: artifact type, current preview, target preflight, and route/workflow audit are different axes.
- Add focused tests for changed preview labels, target-state semantics, toolbar/state behavior, CLI/context behavior, and receipt output.
- Dogfood with Codex Chrome across PRcard, Deckchecker, and Bleep before final completion.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if a safe Worker task can be activated.

Do not stop after one verified Worker package when the broader owner outcome still has safe local follow-up work. Advance the board to the next highest-leverage safe Worker package unless a phase, risk, rejected-verification, ambiguity, or final-completion review is due.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good Worker package should ship a coherent manual-QA improvement that is visible in Chrome or useful in CLI output, not only a helper rename. Group repeated same-shape label/test changes into one Worker package and verify the package as a whole.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-preview-readiness-ux-cleanup/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/nav-map-preview-readiness-ux-cleanup/goal.md.
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
9. Continue to the next largest reversible safe Worker package unless blocked.
10. Finish only with a Judge/PM audit receipt that maps receipts and verification back to the original user outcome and records `full_outcome_complete: true`.
