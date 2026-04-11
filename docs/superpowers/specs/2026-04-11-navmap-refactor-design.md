# NavMap.tsx Refactor — Design Spec

**Date:** 2026-04-11
**Status:** Design approved — ready for implementation plan
**Phase:** Foundations (2b) — part of the A+E+D wave brainstormed 2026-04-11

## Goal

Restructure `packages/core/src/components/NavMap.tsx` so that adding a new feature to the NavMap component typically means creating or editing a **slice** or **effect hook** — not touching `NavMap.tsx`. The target is change velocity: fewer cross-file edits per feature, smaller PR diffs, and no more fighting the stale-closure pattern that currently lives in three `handleX` + `handleXRef` pairs.

This refactor introduces zero user-visible changes. Props, JSX output, and test behavior stay byte-identical.

## Context

`NavMap.tsx` is currently **890 lines** with `/* eslint-disable max-lines */` at the top. Previous plans have noted the bloat and deferred the refactor (see `docs/superpowers/plans/2026-03-23-integration-improvements.md`, which explicitly said "A follow-up plan should refactor `NavMap.tsx` into smaller files. That refactor is out of scope here").

A structural audit of the file reveals:

- **24 `useState` calls** across lines 106–144
- **12 `useRef` declarations**, including three "callback + ref to callback" pairs (`handleGroupToggle`/`handleGroupToggleRef`, `handleGroupDoubleClick`/`handleGroupDoubleClickRef`, `handleHierarchyToggle`/`handleHierarchyToggleRef`) — the classic stale-closure avoidance smell, indicating effect consumers are subscribing with inappropriate dependency lists.
- **11 `useEffect` blocks** covering graph loading, validation, viewport transitions, flow animations, zoom tier changes, and focus reset (lines 223–388).
- **Several large event handlers** including `navigateToNodeFromSearch` at 46 lines (481–527).
- **~230 lines of JSX** (649–879) that is already partially decomposed — `NavMapOverlays`, `NavMapToolbar`, `HierarchyControls`, `LegendPanel`, `ConnectionPanel`, `WalkthroughBar`, `StatusBanners`, `ContextMenu` are all extracted.

The JSX decomposition is healthy. The **state, effects, and handlers** are where the bloat lives and where new feature work keeps landing. That's the surface this refactor targets.

## Approach

**`useReducer` with domain slices.** Collapse the 24 `useState`s into a single reducer organized by slice, each slice exposing action creators via a thin hook. `NavMap.tsx` becomes an orchestration layer that composes slice hooks and effect hooks around the existing JSX.

This was chosen over two alternatives during the brainstorm:

- **Approach 1 — Feature-grouped hooks (composed).** Rejected because `NavMap.tsx` would still do cross-slice wiring, and the ref-mirror pattern mostly survives (sibling hooks can't cleanly call each other without going through the composer). Smaller win than it looks.
- **Approach 3 — Zustand store.** Rejected because it adds a runtime dependency to a component library that currently has none in this layer. Ergonomically slightly better than `useReducer`, but the marginal win doesn't justify the dep cost.

The `useReducer` approach kills the ref-mirror pattern entirely (dispatch is stable, so effects can capture it directly), adds zero dependencies, and lets us ship slice-by-slice.

## Architecture

### Slice boundaries

Seven slices. Each owns a state shape, an action union, a reducer, and an action hook.

| Slice | Owns |
|---|---|
| `graph` | `graph`, `layoutDone` |
| `view` | `viewMode`, `edgeMode`, `treeRootId` |
| `display` | `showSharedNav`, `focusMode`, `showRedirects` |
| `groups` | `focusedGroupId`, `collapsedGroups`, `hierarchyExpandedGroups` |
| `flow` | `selectedFlowIndex`, `isAnimatingFlow`, `galleryNodeId` |
| `overlays` | `showHelp`, `showSearch`, `searchQuery`, `showAnalytics`, `contextMenu`, `hoverPreview` |
| `analytics` | `analyticsData`, `analyticsPeriod` |

**Why this split:**
- `groups` is separate from `view` because its three state bags (focused, collapsed, hierarchy-expanded) mutate together on the same user actions.
- `overlays` absorbs `hoverPreview` and `contextMenu` — they're all transient "open/close at cursor position" things, and splitting them would gain nothing and add three tiny files.
- `display` is tiny but kept separate because its toggles are mostly keyboard-driven with clean boundaries.
- `analytics` gets its own slice because it has async fetch semantics unlike the synchronous slices.

### What stays on plain `useState` / `useRef`

- **`useNodesState` / `useEdgesState`** from ReactFlow — these come with built-in change handlers and rewriting them into the reducer is pain with zero payoff.
- **Existing hooks** (`useUndoHistory`, `useWalkthrough`, `useSemanticZoom`, `useResponsive`, `useGraphStyling`, `useKeyboardNav`, `useNavMapContext`) — they all stay as-is. This refactor extends the decomposition pattern already established; it doesn't touch what's already decomposed.
- **`containerRef` and `beforeDragRef`** — genuinely imperative, not stale-closure workarounds.

### What goes away

The three `handleX` + `handleXRef` pairs disappear. Since `dispatch` is guaranteed-stable by React, anywhere that currently captures `handleGroupToggleRef.current` can capture `dispatch` directly. `useKeyboardNav` stops receiving callback props and starts receiving a `commands` facade built from `dispatch` — explicit about what commands it can call, but trivially built from action hooks.

### Target file structure

```
packages/core/src/
  components/
    NavMap.tsx              (target: ~200-250 lines — orchestration + JSX)
  state/
    types.ts                (RootState, Action unions, shared types)
    reducer.ts              (rootReducer + initialState)
    slices/
      graph.ts              (GraphState + GraphAction + graphReducer + useGraphActions)
      view.ts
      display.ts
      groups.ts
      flow.ts
      overlays.ts
      analytics.ts
    __tests__/
      graph.test.ts         (pure reducer tests — one per slice)
      view.test.ts
      display.test.ts
      groups.test.ts
      flow.test.ts
      overlays.test.ts
      analytics.test.ts
  effects/
    useGraphLoading.ts      (URL fetch, prop change, validation)
    useLayout.ts            (computeElkLayout / edge bundling effects)
    useFlowPlayback.ts      (viewport centering on flow step)
    useFocus.ts             (fitView transitions on focusedGroupId)
    useAnalyticsFetch.ts    (analytics data fetch on period change)
```

### Slice shape — concrete example

```ts
// state/slices/overlays.ts
export type OverlaysState = {
  showHelp: boolean;
  showSearch: boolean;
  searchQuery: string;
  showAnalytics: boolean;
  contextMenu: ContextMenuState | null;
  hoverPreview: HoverPreviewState | null;
};

export type OverlaysAction =
  | { type: 'overlays/openSearch' }
  | { type: 'overlays/closeSearch' }
  | { type: 'overlays/setSearchQuery'; query: string }
  | { type: 'overlays/openHelp' }
  | { type: 'overlays/closeHelp' }
  | { type: 'overlays/openAnalytics' }
  | { type: 'overlays/closeAnalytics' }
  | { type: 'overlays/showContextMenu'; menu: ContextMenuState }
  | { type: 'overlays/hideContextMenu' }
  | { type: 'overlays/showHoverPreview'; preview: HoverPreviewState }
  | { type: 'overlays/hideHoverPreview' };

export const initialOverlaysState: OverlaysState = {
  showHelp: false,
  showSearch: false,
  searchQuery: '',
  showAnalytics: false,
  contextMenu: null,
  hoverPreview: null,
};

export function overlaysReducer(state: OverlaysState, action: Action): OverlaysState {
  switch (action.type) {
    case 'overlays/openSearch':
      if (state.showSearch) return state;
      return { ...state, showSearch: true };
    case 'overlays/closeSearch':
      if (!state.showSearch) return state;
      return { ...state, showSearch: false, searchQuery: '' };
    // ...
    default:
      return state;
  }
}

export function useOverlaysActions(dispatch: Dispatch<Action>) {
  return useMemo(() => ({
    openSearch: () => dispatch({ type: 'overlays/openSearch' }),
    closeSearch: () => dispatch({ type: 'overlays/closeSearch' }),
    setSearchQuery: (query: string) => dispatch({ type: 'overlays/setSearchQuery', query }),
    openHelp: () => dispatch({ type: 'overlays/openHelp' }),
    closeHelp: () => dispatch({ type: 'overlays/closeHelp' }),
    openAnalytics: () => dispatch({ type: 'overlays/openAnalytics' }),
    closeAnalytics: () => dispatch({ type: 'overlays/closeAnalytics' }),
    showContextMenu: (menu: ContextMenuState) =>
      dispatch({ type: 'overlays/showContextMenu', menu }),
    hideContextMenu: () => dispatch({ type: 'overlays/hideContextMenu' }),
    showHoverPreview: (preview: HoverPreviewState) =>
      dispatch({ type: 'overlays/showHoverPreview', preview }),
    hideHoverPreview: () => dispatch({ type: 'overlays/hideHoverPreview' }),
  }), [dispatch]);
}
```

Key patterns:
- Idempotent action early-exit (`if (state.showSearch) return state;`) so effects can dispatch safely without triggering infinite loops.
- Action type prefixing (`overlays/openSearch`) so the root reducer can delegate routing mechanically if desired later.
- Hook returns a memoized object whose reference is stable across renders (memo deps: `[dispatch]`, and dispatch is React-stable).

### Effect hook shape

```ts
// effects/useFlowPlayback.ts
export function useFlowPlaybackEffects(
  state: RootState,
  dispatch: Dispatch<Action>,
  deps: { setCenter: ReturnType<typeof useReactFlow>['setCenter']; nodesRef: RefObject<Node[]> }
) {
  useEffect(() => {
    if (state.flow.selectedFlowIndex == null) return;
    // ... viewport logic using deps.setCenter
  }, [state.flow.selectedFlowIndex, state.flow.isAnimatingFlow, deps.setCenter]);
}
```

Each effect hook takes `(state, dispatch, externalDeps)`, where `externalDeps` are the ReactFlow-derived things (`fitView`, `setCenter`, node refs) that can't live in the reducer.

### `NavMap.tsx` after the refactor — sketch

```tsx
function NavMapInner(props: NavMapProps) {
  const [state, dispatch] = useReducer(
    rootReducer,
    props.graph ?? null,
    (g): RootState => ({ ...initialState, graph: { graph: g, layoutDone: false } })
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView, setCenter } = useReactFlow();

  // Slice action facades (stable refs)
  const graph = useGraphActions(dispatch);
  const view = useViewActions(dispatch);
  const groups = useGroupsActions(dispatch);
  const flow = useFlowActions(dispatch);
  const overlays = useOverlaysActions(dispatch);
  const display = useDisplayActions(dispatch);
  const analytics = useAnalyticsActions(dispatch);

  // Effect hooks — domain-scoped
  useGraphLoadingEffects(state, dispatch, {
    graphProp: props.graph,
    graphUrl: props.graphUrl,
    onValidationError: props.onValidationError,
  });
  useLayoutEffects(state, dispatch, { setNodes, setEdges });
  useFlowPlaybackEffects(state, dispatch, { setCenter, nodesRef: nodes });
  useFocusEffects(state, dispatch, { fitView });
  useAnalyticsFetchEffects(state, dispatch, { adapter: props.analytics });

  // Existing hooks stay untouched
  const { styledNodes, styledEdges } = useGraphStyling({ /* state + props */ });
  useKeyboardNav({
    state,
    commands: { ...overlays, ...view, ...groups, ...display },
  });

  return (
    <NavMapErrorBoundary>
      <ContainerWarning containerRef={containerRef}>
        <NavMapContext.Provider value={ctx}>
          <div ref={containerRef} className={props.className} style={props.style}>
            <ReactFlow
              nodes={styledNodes}
              edges={styledEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              // ... other ReactFlow props
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
            {/* Panels + overlays read from `state.*` */}
          </div>
        </NavMapContext.Provider>
      </ContainerWarning>
    </NavMapErrorBoundary>
  );
}
```

Target: **200-250 lines** for `NavMap.tsx`.

## Migration strategy

**Principle: the reducer and `useState` coexist during migration.** Each PR migrates one or two slices end-to-end, keeps `NavMap.test.tsx` green, and ships independently. No big-bang.

### 5-PR sequence

#### PR 1 — Overlays slice + scaffolding (the pilot)

The whole reducer infrastructure lands here alongside the first real slice. Overlays is chosen because it has the most state (6 pieces), is fully independent, and produces the most visible shrink in `NavMap.tsx` without touching anything risky.

- Create `state/types.ts`, `state/reducer.ts`
- Create `state/slices/overlays.ts` + `state/__tests__/overlays.test.ts`
- Replace the 6 `useState` calls for overlay state in `NavMap.tsx` with `state.overlays.*` and `useOverlaysActions`
- `NavMap.tsx` shrinks modestly here — most of the shrink comes in PR 4 when effects are extracted. The win from PR 1 is proving the pattern, not the line count.
- `NavMap.test.tsx` must still pass unchanged

**Pilot checkpoint:** After PR 1 ships, pause and sanity-check the ergonomics. If the slice shape feels wrong, we've only spent one PR and can revert + rethink. PRs 2-4 copy the template from PR 1 — they're mostly mechanical.

#### PR 2 — Flow slice + display slice

Two small slices bundled because neither has enough state to justify its own PR.

- `flow`: `selectedFlowIndex`, `isAnimatingFlow`, `galleryNodeId`; `activeFlow` and `galleryNodeIds` memos move to slice selectors
- `display`: `showSharedNav`, `focusMode`, `showRedirects` (keyboard-toggled booleans)
- No cross-slice coupling, no ref cleanup — pure copy-paste from PR 1 template

#### PR 3 — Groups slice + view slice + ref-mirror removal (highest-value PR)

This is where the velocity payoff becomes tangible.

- `groups`: `focusedGroupId`, `collapsedGroups`, `hierarchyExpandedGroups` + `handleGroupToggle` / `handleGroupDoubleClick` / `handleHierarchyToggle` become dispatched actions
- `view`: `viewMode`, `edgeMode`, `treeRootId`
- Update `useKeyboardNav` signature: receives `commands` facade instead of individual callback props
- Delete all three `handleXRef = useRef(handleX)` pairs and all `.current` call sites
- Cross-slice concern: when `setViewMode` fires, layout may need to recompute. The view slice reducer resets `layoutDone: false`, and the layout recompute itself lives in `useLayoutEffects` (extracted in PR 4).

**PR 3 fallback:** If the `useKeyboardNav` refactor turns out to be harder than expected, migrate slice state only and leave the ref-mirror pattern alone. Ship refs cleanup in a follow-up. The velocity win is still ~90% achieved.

#### PR 4 — Graph slice + analytics slice + effects extraction

The biggest PR because graph state is load-bearing for everything and the effects are entangled with ReactFlow's imperative API.

- `graph`: `graph`, `layoutDone`
- `analytics`: `analyticsData`, `analyticsPeriod`
- Move the 11 `useEffect` blocks from `NavMap.tsx` into `effects/`:
  - `useGraphLoadingEffects` — URL fetch, prop change, validation
  - `useLayoutEffects` — observes `state.graph.graph` + `state.view.viewMode`, calls `computeElkLayout`, pushes nodes/edges
  - `useFlowPlaybackEffects` — observes `state.flow.selectedFlowIndex`, calls `setCenter`
  - `useFocusEffects` — observes `state.groups.focusedGroupId`, calls `fitView`
  - `useAnalyticsFetchEffects` — observes `state.analytics.analyticsPeriod`, fetches, dispatches `analytics/setData`
- This is where the big shrink happens — the 11 effects (~165 lines) plus the handlers that compose them (~120 lines) plus graph-loading logic all exit `NavMap.tsx`. After this PR, `NavMap.tsx` should be comfortably under 300 lines and the `eslint-disable max-lines` pragma can be removed in PR 5.

**PR 4 split threshold:** If the diff exceeds ~800 changed lines, split into PR 4a (graph slice + loading/layout effects) and PR 4b (analytics + remaining effects).

#### PR 5 — Cleanup

- Delete `/* eslint-disable max-lines */` from the top of `NavMap.tsx`
- Delete any remaining unused refs from the ref-mirror era
- Update `knip.json` if new dirs need entry points (likely not — `state/` and `effects/` are imported transitively from `NavMap.tsx`)
- Run `pnpm validate` end-to-end to confirm everything is clean

### Rollback boundaries

- Any PR can be reverted independently without blocking downstream work, because the reducer and `useState` coexist.
- If PR 1 reveals the pattern is wrong, revert and reconsider — fall back to Approach 1 (feature-grouped hooks, composed) if needed.
- If PR 3's ref-cleanup is tangled, degrade to "slice state only, keep refs" and ship the rest.

## Testing

### Slice reducers → pure function tests

Trivial and cheap. Each `state/__tests__/<slice>.test.ts` walks every action with sample input/output. Target **100% coverage on reducers** because they're pure and cheap to cover.

### Effect hooks → `renderHook` + mocked externals

Each effect hook gets a test that builds a stub state, mocks external deps (`fitView`, `setCenter`, `computeElkLayout`), dispatches actions, and asserts the hook reacted correctly. Not 100% coverage — critical paths only (graph load, layout recompute, flow viewport transitions, focus fitView).

### Action hooks → skip dedicated tests

They're one-line wrappers around `dispatch`; the slice reducer tests already cover the action payloads.

### `NavMap.test.tsx` → stays unchanged

**Non-negotiable: it must pass unchanged through every PR.** This is the regression net. If a PR changes the integration test, the refactor broke behavior and the PR is wrong.

## Risks & mitigations

| Risk | Why it's real | Mitigation |
|---|---|---|
| **Initial `graph` prop not respected** | `useReducer` lazy-init semantics differ from `useState(prop)`; the current code captures the initial prop via `useState<NavMapGraph \| null>(graphProp ?? null)`. | Use the 3-arg form of `useReducer`: `useReducer(reducer, graphProp, (g) => ({ ...initialState, graph: { graph: g ?? null, layoutDone: false } }))`. Verified via `NavMap.test.tsx`. |
| **Infinite effect loops** | An effect reads `state.x`, dispatches an action that updates `state.x` unconditionally, re-runs. | Slice reducers return the same reference when nothing changes (early-exit pattern shown in the overlays example). Enforced by reducer test cases for idempotent actions. |
| **Implicit cross-slice coupling surfaces** | We discover during migration that some user action must mutate multiple slices atomically. | Don't paper over it — either restructure slice boundaries or introduce a cross-slice action that every affected slice reducer handles. `NavMap.tsx` must not become the coordination layer again. |
| **`useKeyboardNav` refactor harder than expected** | It may have baked-in assumptions about callback stability. | PR 3 fallback: migrate slice state but leave the ref-mirror alone. Ship refs cleanup in a follow-up. |
| **PR 4 too big to review** | Graph + analytics + 11 effects at once is a large diff. | If PR 4 grows past ~800 lines changed, split into PR 4a / PR 4b. Judgment call during implementation. |

## Success criteria

1. `NavMap.tsx` is **under 300 lines** without the `/* eslint-disable max-lines */` pragma.
2. **All 11 `useEffect` calls** are gone from `NavMap.tsx` (migrated into `effects/` hooks).
3. **All 3 ref-mirror pairs** are deleted. A `grep` for `handleGroup.*Ref` in `NavMap.tsx` returns zero hits.
4. **`NavMap.test.tsx` passes unchanged** through every intermediate PR and at the end.
5. **Reducer coverage** is 100% per slice, verified via `vitest run --coverage`.
6. **The velocity test:** pick a hypothetical small feature (e.g., "add a breadcrumb trail showing the last 5 navigated nodes") and spec out where it'd live. If the answer is "new slice or extend one existing slice, plus maybe one new panel component, with 0-5 lines touched in `NavMap.tsx`" — the refactor worked. If the answer is "touch `NavMap.tsx` in 4 places" — something's still wrong.
7. **No new runtime dependencies** in `packages/core/package.json`.

## Out of scope

- **Performance tuning / memoization.** Only touch it if profiling during implementation shows a regression.
- **Exposing the reducer or action types publicly.** Tempting for external keyboard remapping, but adds surface area. Keep the slice module non-exported.
- **Any user-visible change.** Props stay byte-identical; panel components get the same data via the same shapes.
- **Scanner test bootstrap (Phase 2a of the broader roadmap).** That's a separate, independent spec — different package, different concerns. It lands as a prerequisite for the GitHub Action workflow (Phase 3).
- **The GitHub Action workflow itself (Phase 3).** Separate spec. Already has a plan doc at `docs/superpowers/plans/2026-03-25-github-action-crawl.md`.
- **`nav-map init` wizard (Phase 4).** Separate spec. Benefits from this refactor being stable first.

## Next step

Invoke `superpowers:writing-plans` to turn this design into a step-by-step implementation plan.
