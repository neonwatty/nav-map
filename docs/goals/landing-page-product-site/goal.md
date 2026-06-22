# NavMap Landing Page Product Site

## Objective

Create a polished package landing page on a feature branch from `landing-page`, keep the interactive demo available under `/demo`, verify the site locally and in CI, then open and merge a PR targeting the protected `landing-page` branch when green.

## Original Request

Plan the landing-page product-site work using GoalBuddy prep.

## Intake Summary

- Input shape: `specific`
- Audience: package users, agents evaluating NavMap, and maintainers reviewing the landing page branch
- Authority: `approved`
- Proof type: `demo`
- Completion proof: a PR from a `codex/` feature branch into `landing-page` is merged after protected checks pass, with receipts covering local browser verification, smoke/test commands, CI status, and any known limitations.
- Goal oracle: the protected `landing-page` branch renders a product landing page at `/`, preserves a working demo at `/demo`, passes the branch's required CI checks, and has a final audit receipt tying screenshots/browser checks and CI back to the user outcome.
- Likely misfire: replacing the demo with a marketing page but breaking demo smoke tests, live mode, or agent-facing prototype workflows.
- Blind spots considered: route migration risk, screenshot/asset quality, branch protection and workflow-file push constraints, smoke scripts that may still expect `/`, and the need to avoid implementing generic marketing copy without real package affordances.
- Existing plan facts: `landing-page` exists and is protected; CI runs quality checks, build, scanner browser crawl, knip, tests, typecheck, lint, and max-lines; previous guidance was to create `codex/landing-page-product-site`, make `/` the package landing page, preserve the existing demo under `/demo`, PR into `landing-page`, and merge when green.

## Goal Oracle

The oracle for this goal is:

`The protected landing-page branch renders a useful NavMap package/product landing page at /, preserves a working interactive demo at /demo, passes required CI, and has a merged PR with receipts for local browser checks, test/smoke commands, screenshots or visual review, and final audit.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a pretty static page, a passing tiny slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`specific`

## Current Tranche

Complete the landing-page product-site tranche end to end: validate the current branch/app shape, choose the largest safe implementation package, build the route split and landing page, update smoke/verification as needed, run local browser and command checks, open a PR into `landing-page`, fix review or CI issues, and merge once protected checks are green.

## Non-Negotiable Constraints

- Work from `landing-page` on a `codex/` feature branch; do not push directly to the protected branch except through PR merge.
- Preserve the interactive NavMap demo and agent-useful workflows; move or expose them at `/demo` rather than removing them.
- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs; do not hard-code app behavior into NavMap core.
- Do not inspect or print secrets, tokens, auth storage, `.nav-map/auth/*.storage.json`, cookies, environment values, private keys, or service-role keys.
- Do not revert unrelated dirty work, including local `.codex-workers/` state.
- Before handing off any local URL, verify it with `curl` and browser automation on the exact URL.
- If changing scanner or manifest behavior, add or update focused tests and run the relevant package test command.
- Record workflow verification receipts: commands run, routes tested, screenshots captured, auth state ids only if applicable, failures, warnings, and known limitations.
- Respect the existing landing-page CI gates, including lint, format, typecheck, knip, tests, build, scanner browser crawl, demo smoke, and max-lines.
- For workflow-file pushes, prefer SSH because HTTPS OAuth may lack the `workflow` scope.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if a safe Worker task can be activated.

Do not stop after a single verified Worker package when the broader owner outcome still has safe local follow-up work. Advance the board to the next highest-leverage safe Worker package and continue unless a phase, risk, rejected-verification, ambiguity, or final-completion review is due.

Do not create one Worker/Judge pair per repeated file, route, section, or helper. Put repeated same-shape work into one Worker package and review the package as a whole.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good task is the largest safe useful slice.

Small is not the goal. Useful is the goal.

A Worker should finish the whole assigned slice. A Judge should judge the whole assigned slice. A PM should reorient the board when tasks are safe but not moving the outcome.

Tiny tasks are allowed when the failure is isolated, the risk is high, the scope is unknown, or the tiny task unlocks a larger slice. Tiny tasks are bad when they keep happening, do not change behavior, only add wrappers/contracts/proof files, or avoid the real milestone.

Do not stop because a slice needs owner input, credentials, production access, destructive operations, or policy decisions. Mark that exact slice blocked with a receipt, create the smallest safe follow-up or workaround task, and continue all local, non-destructive work that can still move the goal toward the full outcome.

## Canonical Board

Machine truth lives at:

`docs/goals/landing-page-product-site/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/landing-page-product-site/goal.md.
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
