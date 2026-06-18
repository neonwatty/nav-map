# Nav Map Agentic Prototype Workflows

## Objective

Implement and preserve the prototype-surfaces slice for nav-map workflow manifests, scanner output,
and reusable UI rendering.

Prototype surfaces are non-live workflow nodes for screenshots, generated images, HTML mockups,
video/keyframe references, components, and concept screens. They should be reusable manifest
primitives that convert into normal graph nodes without changing existing live route behavior.

## Original Request

Implement the prototype-surfaces slice for nav-map. Add reusable workflow node support for
prototype surfaces such as screenshots, generated images, HTML mockups, video/keyframe references,
components, and concept screens. Keep existing route behavior intact. Start by auditing README,
workflow manifest/types/conversion, screenshot handling, and UI rendering. Propose the smallest
reusable model before editing. Add focused tests and docs. Do not inspect or print secrets,
cookies, tokens, env values, OAuth secrets, private keys, service-role keys, or Playwright auth
storage.

## Intake Summary

- Input shape: `existing_plan`
- Audience: nav-map users, workflow manifest authors, scanner users, and future coding agents
- Authority: `approved`
- Proof type: `test`
- Completion proof: workflow manifests accept reusable prototype surfaces, conversion emits graph
  nodes with stable `prototype://` routes, scanner capture still visits only live routes, UI and
  route-health summaries distinguish live routes from surfaces, README documents the model, and
  focused tests plus validation pass.
- Goal oracle: current code, tests, generated PRcard fixture, README docs, and GoalBuddy board
  receipts prove the prototype-surfaces slice without relying on app-specific core logic or unsafe
  secret inspection.
- Likely misfire: treating prototype artifacts as real browser routes, hard-coding PRcard behavior
  in core, or documenting a model without scanner/UI/test coverage.

## Acceptance Criteria

- Workflow manifests expose a reusable `surfaces` model for prototype/design artifacts.
- Supported surface types include `screenshot`, `generated-image`, `html-mockup`, `video`,
  `keyframe`, `component`, and `concept-screen`.
- Manifest validation covers malformed surfaces and allows edges/flows to reference surface IDs.
- Manifest conversion emits prototype surface graph nodes with stable `prototype://<id>` routes,
  `metadata.kind: "prototype-surface"`, and `metadata.surfaceType`.
- Existing live route conversion and screenshot behavior remain intact; scanner screenshot capture
  does not navigate prototype surfaces.
- UI rendering and exported/route-health summaries distinguish surfaces from live routes.
- README documents the model, scanner behavior, and example usage.
- Demo workflow fixtures show prototype surfaces without adding app-specific behavior to core.
- Focused core and scanner tests pass, and final validation receipts are recorded.

## Non-Negotiable Constraints

- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs. Do not hard-code
  PRcard, Deckchecker, or other app behavior into nav-map core.
- Do not inspect or print secrets, cookies, tokens, passwords, OAuth values, webhook secrets,
  private keys, Supabase service-role keys, raw environment values, or Playwright auth storage.
- Do not inspect, print, commit, or summarize `.nav-map/auth/*.storage.json` or similar auth-state
  contents.
- Preserve existing route behavior unless a focused test proves the intended compatibility.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-agentic-prototype-workflows/state.yaml`

## Run Command

```text
/goal Follow docs/goals/nav-map-agentic-prototype-workflows/goal.md.
```
