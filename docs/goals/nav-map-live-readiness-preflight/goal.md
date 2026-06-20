# Nav Map Live Readiness Preflight

## Objective

Design and implement a clear Live-mode readiness experience for nav-map so users can tell, before and during Live review, which app, mockup, and prototype nodes can actually render live and which nodes should fall back to screenshots.

## Original Request

Plan with GoalBuddy prep how to improve the UX for the Live option: when the user clicks Live, check whether the desired app URL and individual nodes are available before showing live views, and give notice when Live is unavailable globally or per node.

## Intake Summary

- Input shape: `specific`
- Audience: nav-map users dogfooding workflow atlases with screenshots, live app routes, live mockups, and static prototype surfaces.
- Authority: `requested`
- Proof type: `test`
- Completion proof: focused automated tests plus a Codex Chrome walkthrough showing Live preflight, global readiness summary, per-node status, offline fallback, reachable app iframe, reachable mockup iframe, and screenshot fallback behavior.
- Goal oracle: Chrome dogfood against `http://localhost:3001/?dataset=prcard` with the PRcard target app on `http://localhost:3000`, plus an intentionally offline target, demonstrating the full Live readiness UX without framework/runtime errors.
- Likely misfire: only checking the selected node after the user clicks it, or showing a green Live state when the iframe exists but the target is offline, static-only, blocked, or not actually embeddable.
- Blind spots considered: browser-only probes cannot always prove HTTP status or route render correctness for cross-origin apps; app routes and mockups need different sandbox/security behavior; current route behavior and screenshot fallback must stay intact.
- Existing plan facts: Live should feel like a managed state, not a mystery toggle; preflight should run after the user provides or confirms the desired app URL; UX should support both global unavailable and individual-node unavailable states.

## Goal Oracle

The oracle for this goal is:

`In a fresh Codex Chrome session, nav-map at http://localhost:3001/?dataset=prcard runs a Live readiness preflight, shows a global readiness summary, labels individual nodes as live/offline/static/blocked/checking as applicable, renders reachable app and mockup live iframes, keeps screenshots for unavailable nodes with a clear notice, and produces no fresh browser warning/error logs.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`specific`

## Current Tranche

Complete the first production-quality Live readiness tranche: discover the current Live-mode data flow, select the smallest reusable model for graph-wide or flow-scoped readiness, implement the UX and state plumbing, add focused tests/docs, and dogfood with Chrome against both reachable and offline targets.

## Non-Negotiable Constraints

- Keep existing route behavior, screenshots mode, mockup live rendering, app live rendering, and prototype surface rendering intact.
- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs; do not hard-code PRcard behavior into nav-map core.
- Do not inspect or print secrets, cookies, tokens, env values, OAuth secrets, private keys, service-role keys, or Playwright auth storage.
- Treat `.nav-map/auth/*.storage.json` and similar auth-state files as sensitive.
- Prefer reusable primitives: live target scope, node readiness, readiness probe status, readiness summary, and explicit fallback behavior.
- Add or update focused tests when changing readiness, preview, scanner, or manifest behavior.
- Use Codex Chrome to validate the final local UX with concrete workflows before reporting completion.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if a safe Worker task can be activated.

Do not stop after a single verified Worker package when the broader owner outcome still has safe local follow-up work. Advance the board to the next highest-leverage safe Worker package and continue unless a phase, risk, rejected-verification, ambiguity, or final-completion review is due.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good Worker package should ship a coherent user-visible Live readiness slice, not only a helper function. If repeated node/status rendering changes are needed, group them into one Worker package and verify the package as a whole.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-live-readiness-preflight/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/nav-map-live-readiness-preflight/goal.md.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Re-check the intake: original request, input shape, authority, proof, blind spots, existing plan facts, and likely misfire.
4. Work only on the active board task.
5. Assign Scout, Judge, Worker, or PM according to the task.
6. Write a compact task receipt.
7. Update the board.
8. Continue to the next largest reversible safe Worker package unless blocked.
9. Finish only with a Judge/PM audit receipt that maps receipts and verification back to the original user outcome and records `full_outcome_complete: true`.
