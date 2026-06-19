# Nav Map Deckchecker Prototype Dogfood

## Objective

Dogfood prototype surfaces in a second real workflow by adding Deckchecker speaker prototype
references to the manifest, generated graph, demo UI, and verification receipts.

## Original Request

Do the recommended next steps after the prototype-surfaces merge: sync local Git cleanup, then
dogfood prototype surfaces in another realistic workflow.

## Acceptance Criteria

- Local `main` is aligned with merged `origin/main`, and stale prototype branches are cleaned up.
- Deckchecker speaker workflow manifest models at least two non-live prototype references.
- Generated Deckchecker nav-map fixture includes prototype surface nodes and flow steps.
- Inspect output separates live nodes from prototype surfaces.
- Demo UI can search/select the new surfaces and render `Surface Details`.
- No auth storage or secret contents are inspected or printed.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-deckchecker-prototype-dogfood/state.yaml`
