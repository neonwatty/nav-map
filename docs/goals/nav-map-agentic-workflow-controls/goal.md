# Nav Map Agentic Workflow Controls

## Objective

Document and preserve the already-implemented agentic workflow controls for clickable workflow
overview filters, graph focus styling, keyboard clearing, filtered scanner context, and auth-state
redaction safety.

## Original Request

Add concise README documentation and a GoalBuddy board for the implemented agentic workflow
controls.

## Intake Summary

- Input shape: `existing_plan`
- Audience: nav-map users, coding agents, and future GoalBuddy reviewers
- Authority: `approved`
- Proof type: `artifact`
- Completion proof: README documents the workflow controls and scanner context filters, and the
  GoalBuddy board records measurable acceptance criteria plus receipts for Tasks 1-5.
- Goal oracle: docs and board state accurately describe the implemented controls without claiming
  unrun browser screenshots, monorepo builds, or unsafe secret inspection.
- Likely misfire: documenting broad agent workflow ambitions while omitting the exact controls and
  safety behavior users need.

## Acceptance Criteria

- README explains clickable workflow overview chips, graph focus behavior, and `Escape` clearing
  workflow filters.
- README explains `nav-map context` filters for section, persona, auth, health, and evidence, with
  deckchecker/prcard examples.
- README states auth-state and redaction safety expectations without exposing or requesting
  storage-state contents.
- `state.yaml` is valid GoalBuddy board state with receipts for Tasks 1-4 based on prior
  implementation context.
- Task 5 records only local verification that was actually run.

## Non-Negotiable Constraints

- Edit only `README.md`, this goal directory's `goal.md`, this goal directory's `state.yaml`, and
  `notes/README.md` if needed.
- Do not inspect or print secrets, cookies, tokens, private keys, OAuth secrets, env values,
  storage-state JSON, or anything under `.nav-map/auth`.
- Do not claim browser screenshots, local web service proof, focused tests, or final monorepo build
  unless they are actually run.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-agentic-workflow-controls/state.yaml`

## Run Command

```text
/goal Follow docs/goals/nav-map-agentic-workflow-controls/goal.md.
```
