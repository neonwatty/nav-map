# T003 UX Architecture And Code Organization Audit

## Summary

Architecture is data-driven at manifest conversion, but browser UX state is spread through a large
container/shell prop surface and duplicated preview/readiness rendering logic. The
highest-confidence simplification is to introduce reusable preview/readiness and live-target view
models, then group NavMap shell props into mode/control overlays. Avoid app-specific hard-coding.

## Ranked Opportunities

1. Introduce a preview/readiness view-model primitive, such as
   `buildNodePreviewViewModel(node, graph, previewMode, readiness, overrides, screenshotBasePath)`.
   - Impact: high
   - Risk: medium
   - Blast radius: medium
   - Why: removes duplicated mode-specific preview label/render-status/live-target logic from
     `PageNode` and `ConnectionPanel` while preserving `artifactPreview` and `useLiveReadiness` as
     source-of-truth utilities.

2. Group `NavMapShell` props into domain objects: graph state, mode controls, chrome controls,
   live-preview controls, overlays, and canvas handlers.
   - Impact: high
   - Risk: medium
   - Blast radius: medium-high
   - Why: the shell prop contract is very wide and owns mode transition callbacks, making UX
     behavior hard to audit.

3. Extract mode transition behavior into a hook or reducer, especially view mode changes that reset
   flow/tree/hierarchy/focus state.
   - Impact: medium-high
   - Risk: medium
   - Blast radius: medium

4. Create a live-target controls hook for scoped persistence and override mutation.
   - Impact: medium
   - Risk: low-medium
   - Blast radius: low-medium

5. Make mode-specific UX copy use shared labels for Saved/Target/Static/Ready/Unverified/Offline
   across toolbar, node cards, and details panel.
   - Impact: medium
   - Risk: low
   - Blast radius: low-medium

6. Preserve workflow manifests/conversion as the app-specific boundary; do not move PRcard,
   Deckchecker, or Bleep behavior into core UI.

## Evidence Highlights

- `packages/core/src/components/NavMap.tsx`: `NavMapInner` owns many independent UX states directly.
- `packages/core/src/components/NavMapShell.tsx`: props are very wide and mix container, mode,
  chrome, panels, overlays, graph, callbacks, and live-preview concerns.
- `packages/core/src/components/panels/ConnectionPanel.tsx`: recomputes preview state and derives
  iframe/offline/render states locally.
- `packages/core/src/components/nodes/PageNode.tsx`: reconstructs a `NavMapNode` from ReactFlow data
  and derives current preview labels separately from `ConnectionPanel`.
- `packages/core/src/utils/artifactPreview.ts`: already centralizes enough artifact/live URL
  semantics to extend into a fuller display model.
- `packages/core/src/workflowManifest.ts`: manifest conversion remains data-driven and reusable.
- `packages/scanner/src/modes/workflow.ts`: generation receipts already distinguish manifest nodes
  from skipped surfaces and reference auth state by id only.

## Ambiguities For Judge

- Whether the approved implementation should prioritize a low-risk preview/readiness view-model
  refactor or a larger shell prop/mode-controller restructuring.
- Whether UX label changes should be allowed in the same slice as architecture cleanup, since label
  unification may affect screenshots/manual QA expectations.
- Whether local live-target override persistence should remain graph-name/baseUrl/generatedBy scoped
  or become manifest/dataset-id scoped.
