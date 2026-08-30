# NavMap Workflow Canvas Embed Mode

## Objective

Add a focused, reusable, screenshot-backed `WorkflowCanvas` surface to NavMap that renders the frozen `workflow-canvas/v1` contract accessibly and responsively without importing the full general-purpose site-map interface or hardcoding Agent Workflows lifecycle semantics.

## Original Request

Perform a focused NavMap workflow-canvas track in parallel with the Agent Workflows Studio decision-model and journey-evidence track, joined by a frozen shared contract and an integration rendezvous.

## Intake Summary

- Input shape: `existing_plan`
- Audience: product teams embedding screenshot-backed workflow review, initially Agent Workflows Studio
- Authority: `approved`
- Proof type: `demo`
- Completion proof: a standalone focused canvas renders the frozen fixture at desktop and exactly 393×852 with screenshot nodes, exact-run overlays, findings/annotations, focused details, comparison, keyboard/screen-reader support, reduced-motion safety, package-consumer proof, and final independent approval
- Goal oracle: consumers can embed a constrained workflow-review canvas whose selected node makes expected state, observed state, evidence, status, findings, and next review understandable without exposing unrelated NavMap controls or letting the component invent product truth
- Likely misfire: repackage the complete NavMap viewer, add decorative graph behavior, or embed Agent Workflows-specific status inference and thereby make Studio more complex
- Blind spots considered: React/runtime weight, public package exports, contract drift, generic versus product-specific semantics, screenshot unavailable/corrupt states, annotation provenance, reference-versus-observed comparison, mobile canvas usability, keyboard graph navigation, focus/dialog behavior, screen-reader alternatives, semantic zoom, reduced motion, layout performance, fixture privacy, package delivery, and consumer smoke
- Existing plan facts: Workflows owns the canonical producer contract and lifecycle truth; NavMap runs an independent consumer Scout in parallel; implementation waits for the paired rendezvous; the component defaults to Flow view and hides unrelated site-map controls; production integration occurs only after both repositories independently pass

## Goal Oracle

The oracle for this goal is:

`From a fresh origin/main-equivalent checkout, a standalone NavMap demo and package consumer render the canonical workflow-canvas/v1 fixture through a focused WorkflowCanvas at desktop and exactly 393×852; users can traverse stable step nodes, inspect reference and exact-run screenshots, understand supplied status/findings/annotations, compare supplied evidence, and operate the experience with keyboard and assistive technology; unrelated NavMap controls are absent; reduced motion preserves meaning; the component never derives Agent Workflows lifecycle truth; and all focused, package, accessibility, responsive, lint, type, Knip, build, and final Judge gates pass.`

The final evidence must demonstrate all of the following:

1. A public, documented focused embedding surface exists without requiring consumers to compose private internal components.
2. Flow view is the default and only product-relevant controls are visible by default.
3. Nodes can display a supplied reference screenshot, explicit unavailable state, and supplied status without inference.
4. Selecting a node exposes expected state, observed state, evidence, findings/annotations, integrity labels, and supplied next-review action.
5. Reference evidence, exact-run observations, and resolution comparisons remain visually and semantically distinct.
6. The component supports supplied before/desktop-after/mobile-after or reference/observed comparisons without modifying original evidence.
7. Missing, stale, corrupt, and unavailable inputs remain conservative and textually explicit.
8. Keyboard users can enter, traverse, select, inspect, close, and return focus predictably; a useful non-canvas semantic representation remains available to screen readers.
9. Exactly 393×852 mobile provides an intentional list/filmstrip or constrained-canvas experience without tiny controls, trapped gestures, clipped panels, or horizontal-page overflow.
10. Motion is purposeful, bounded, interruptible, and meaning-equivalent under `prefers-reduced-motion`; ambient/decorative flow animation is absent from focused mode.
11. The focused surface does not expose search, live targets, route health, analytics, export, shared navigation, or unrelated general site-map modes unless a future explicit API opts in.
12. Layout remains responsive and performant for representative linear, branched, missing-evidence, and larger workflow fixtures.
13. The package export, CSS, TypeScript declarations, fixture validation, component tests, demo smoke, package-consumer smoke, lint, formatting, typecheck, Knip, build, and final independent Judge pass after the last change.

Planning, a type-only contract, a desktop-only screenshot, a private demo component, or full NavMap with controls hidden through brittle CSS are insufficient.

## Goal Kind

`existing_plan`

## Current Tranche

1. Run an independent read-only consumer Scout in NavMap while Workflows audits producer semantics.
2. Consume both Scout receipts at the rendezvous, challenge the canonical Workflows contract, and freeze the public component API and largest safe Worker scope.
3. Implement one coherent focused WorkflowCanvas vertical slice with frozen fixtures, screenshot nodes, selection, details, overlays, and semantic fallback.
4. Complete mobile, keyboard, screen-reader, reduced-motion, unavailable-state, and larger-graph behavior.
5. Export and document the focused surface; prove it through a throwaway package consumer.
6. Produce an integration-readiness receipt for Workflows without editing the Workflows repository.
7. Finish only after a fresh adversarial demo review and independent Judge map current evidence to every oracle check.

This tranche stops before Agent Workflows Studio integration, Agent Workflows lifecycle inference, NavMap scanner changes unrelated to the fixture, live-target editing, screenshot capture, annotation persistence, backend APIs, package publication, or broad redesign of the general NavMap viewer.

## Cross-Repository Contract Boundary

- Workflows T002 owns the canonical `workflow-canvas/v1` producer contract after both T001 Scout receipts.
- NavMap T002 explicitly validates consumer feasibility and may request a PM-mediated revision before any Worker begins.
- NavMap renders supplied labels, statuses, integrity, screenshots, findings, annotations, and next actions. It never derives pass, failure, qualification, readiness, or canonical eligibility.
- Contract fixtures must be privacy-safe and contain no private paths, credentials, production URLs, or screenshot secrets.
- Production integration and delivery mechanism are deferred to a later explicit rendezvous.

## Non-Negotiable Constraints

- Keep the focused surface generic and reusable.
- Do not hardcode Agent Workflows terms or lifecycle transitions into NavMap core.
- Do not require the full NavMap toolbar or private component imports.
- Preserve existing general NavMap behavior and public APIs unless an approved migration is explicitly required.
- Provide an accessible semantic alternative to spatial-only meaning.
- Treat screenshots and annotations as supplied immutable references; do not modify source bytes.
- Make missing and unverifiable evidence conservative.
- Respect reduced motion and avoid ambient/decorative animation in focused mode.
- Work only in a fresh main-equivalent worktree and preserve unrelated dirty worktrees.
- No more than one write Worker runs in this repository at once.
- Do not edit the Agent Workflows repository from this goal.

## Stop Rule

Stop only when the final independent audit records `full_outcome_complete: true` for the complete focused workflow-canvas outcome.

Do not stop after contract validation, a graph rendering, a desktop demo, node screenshots, or passing component tests while public export, semantic fallback, mobile, keyboard, screen readers, reduced motion, unavailable states, package consumption, broader regression gates, or final adversarial review remain incomplete.

If the producer track is delayed, finish only read-only feasibility and generic preparatory work that does not guess the shared contract; do not invent lifecycle semantics to stay busy.

## Slice Sizing

The first task is a read-only consumer Scout. The Judge freezes one public API and largest coherent Worker slice only after the paired producer receipt exists. Component behavior, responsive/accessibility hardening, and package delivery may be separate large slices when their files and proof are genuinely separable; avoid one task per component or hook.

## Board Health

```bash
node /Users/neonwatty/.codex/plugins/cache/goalbuddy/goalbuddy/0.4.3/skills/goal-prep/scripts/check-goal-state.mjs docs/goals/nav-map-workflow-canvas-embed-mode
```

## Canonical Board

`docs/goals/nav-map-workflow-canvas-embed-mode/state.yaml`

## Run Command

```text
Codex: /goal Follow docs/goals/nav-map-workflow-canvas-embed-mode/goal.md.
Claude Code: /goalbuddy Follow docs/goals/nav-map-workflow-canvas-embed-mode/goal.md.
```

## PM Loop

On every continuation, read this charter and GoalBuddy's execution contract, read `state.yaml`, work only the active task, preserve the clean isolated worktree, coordinate the paired Scout/rendezvous receipts without contract drift, record durable receipts, rerun responsive/package proof after component or export changes, and run the hard stop checker before ending. `state.yaml` wins if the charter and board disagree.
