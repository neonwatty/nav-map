# NavMap Refactor — PR 4: Graph + Analytics Slices + Effects Extraction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the last 4 `useState` calls (`graph`, `layoutDone`, `analyticsData`, `analyticsPeriod`) into graph and analytics slices, extract 10 of the 11 `useEffect` blocks from `NavMap.tsx` into dedicated effect-hook files under `effects/`, and bring `NavMap.tsx` under 300 lines so the `eslint-disable max-lines` pragma can be removed in PR 5.

**Architecture:** Two new slices (graph, analytics) and 5 new effect-hook files. Each effect hook takes `(state, dispatch, externalDeps)` where `externalDeps` are ReactFlow-derived imperatives (`fitView`, `setCenter`, `setNodes`, `setEdges`, refs). The hover-preview mousemove effect (line 598) stays in NavMap.tsx because it's already clean and tiny (7 lines).

**Tech Stack:** TypeScript 5.7, React 18, Vitest 4

---

## Scope

PR 4 only. After this PR, `NavMap.tsx` should be under 300 lines. PR 5 (cleanup) removes the `eslint-disable` pragma and does final tidying.

## Remaining useState calls in NavMap.tsx (lines 112-135)

```ts
const [graph, setGraph] = useState<NavMapGraph | null>(graphProp ?? null);  // 112
const [layoutDone, setLayoutDone] = useState(false);                        // 115
const [analyticsData, setAnalyticsData] = useState<NavMapAnalytics | null>(null);  // 131
const [analyticsPeriod, setAnalyticsPeriod] = useState(() => ({             // 132-134
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  end: new Date().toISOString().slice(0, 10),
}));
```

## 11 useEffect blocks — extraction plan

| Line | Purpose | Target hook file | Notes |
|---|---|---|---|
| 233 | Focus group zoom on focusedGroupId change | `effects/useFocusEffects.ts` | Uses `fitView`, reads `nodes`, `focusedGroupId` |
| 254 | Load graph from URL | `effects/useGraphLoading.ts` | Fetches URL, validates, calls `setGraph` → dispatch |
| 270 | Update graph from prop | `effects/useGraphLoading.ts` | Validates prop, calls `setGraph` → dispatch |
| 282 | Expand hierarchy on graph load | `effects/useGraphLoading.ts` | Reads `viewMode`, calls `groups.setHierarchyExpanded` |
| 290 | Fetch analytics data | `effects/useAnalyticsFetch.ts` | Async fetch, calls `setAnalyticsData` → dispatch |
| 301 | Graph → ReactFlow + ELK layout | `effects/useLayoutEffects.ts` | Complex: uses `handleGroupToggleRef`, `handleGroupDoubleClickRef`, `computeElkLayout`, `buildGraphFromJson`, `buildSharedNavEdges` |
| 330 | Toggle shared nav edges | `effects/useEdgeEffects.ts` | Uses `baseEdgesRef`, `sharedNavEdgesRef`, `setEdges` |
| 340 | Compute bundled edges | `effects/useEdgeEffects.ts` | Uses `computeBundledEdges`, `nodes`, `setEdges` |
| 357 | Restore edges leaving bundled | `effects/useEdgeEffects.ts` | Uses refs, `setEdges` |
| 384 | Auto-collapse/expand on zoom | `effects/useZoomEffects.ts` | Reads `zoomTier`, `viewMode`, dispatches `groups` actions |
| 598 | Hover position tracking | **STAYS in NavMap.tsx** | Already clean (7 lines), depends only on `hasHoverPreview` + `overlays` |

## Remaining refs in NavMap.tsx

After extracting effects, these refs move into the effect hooks that use them:
- `prevFocusedGroupRef` → `useFocusEffects`
- `viewModeRef` → `useLayoutEffects` (or delete if no longer needed)
- `onValidationErrorRef` → `useGraphLoading`
- `prevZoomTierRef` → `useZoomEffects`
- `baseEdgesRef` → stays in NavMap.tsx (shared between `useLayoutEffects` and `useEdgeEffects`)
- `sharedNavEdgesRef` → same, shared
- `containerRef` → stays in NavMap.tsx (used in JSX)
- `beforeDragRef` → stays (used in drag handlers)
- `collapsedGroupsRef`, `hierarchyExpandedGroupsRef`, `handleGroupToggleRef`, `handleGroupDoubleClickRef`, `handleHierarchyToggleRef` → these were introduced in PR 3 for `useViewModeLayout`. They stay until `useViewModeLayout` is refactored (out of PR 4 scope).

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `packages/core/src/state/slices/graph.ts` | Graph slice: graph data + layoutDone |
| Create | `packages/core/src/state/slices/analytics.ts` | Analytics slice: data + period |
| Create | `packages/core/src/state/__tests__/graph.test.ts` | Graph reducer tests |
| Create | `packages/core/src/state/__tests__/analytics.test.ts` | Analytics reducer tests |
| Create | `packages/core/src/effects/useGraphLoading.ts` | Graph URL fetch, prop sync, validation, hierarchy init |
| Create | `packages/core/src/effects/useFocusEffects.ts` | Focus group zoom transitions |
| Create | `packages/core/src/effects/useAnalyticsFetch.ts` | Analytics data fetching |
| Create | `packages/core/src/effects/useEdgeEffects.ts` | Shared nav toggle, edge bundling, mode restore |
| Create | `packages/core/src/effects/useZoomEffects.ts` | Auto-collapse/expand on semantic zoom tier |
| Modify | `packages/core/src/state/types.ts` | Widen RootState and Action |
| Modify | `packages/core/src/state/reducer.ts` | Add graph + analytics delegation |
| Modify | `packages/core/src/state/__tests__/reducer.test.ts` | Add routing tests |
| Modify | `packages/core/src/components/NavMap.tsx` | Replace 4 useStates, extract 10 effects, target <300 lines |

---

## Task 1: Graph slice

**Files:** Create `packages/core/src/state/slices/graph.ts` + `packages/core/src/state/__tests__/graph.test.ts`

```ts
// graph.ts
export type GraphState = {
  graph: NavMapGraph | null;
  layoutDone: boolean;
};

export type GraphAction =
  | { type: 'graph/setGraph'; graph: NavMapGraph | null }
  | { type: 'graph/setLayoutDone'; done: boolean };
```

Simple slice — 2 actions, idempotent guards. The `graph` prop and URL-fetch results dispatch `graph/setGraph`. Layout completion dispatches `graph/setLayoutDone`.

Note: `setGraph` accepts the full `NavMapGraph | null` directly. Validation happens in the effect hook BEFORE dispatching — the reducer stays pure.

Tests: ~8 tests (initial state, setGraph, setLayoutDone, idempotency guards).

Commit: `git commit -m "feat(core): add graph slice with graph data and layoutDone"`

---

## Task 2: Analytics slice

**Files:** Create `packages/core/src/state/slices/analytics.ts` + `packages/core/src/state/__tests__/analytics.test.ts`

```ts
// analytics.ts
export type AnalyticsPeriod = { start: string; end: string };

export type AnalyticsState = {
  data: NavMapAnalytics | null;
  period: AnalyticsPeriod;
};

export type AnalyticsAction =
  | { type: 'analytics/setData'; data: NavMapAnalytics | null }
  | { type: 'analytics/setPeriod'; period: AnalyticsPeriod };
```

Note: `AnalyticsPeriod` type is new — currently the period is an inline `{ start: string; end: string }` object. Export it for the effect hook.

Initial state uses the default 30-day window calculation.

Tests: ~6 tests.

Commit: `git commit -m "feat(core): add analytics slice with data and period"`

---

## Task 3: Widen root reducer to 7 slices

**Files:** Modify `types.ts`, `reducer.ts`, `reducer.test.ts`

Add graph + analytics to `RootState`, `Action`, `initialRootState`, and `rootReducer`. The lazy initializer in NavMap.tsx will need to handle `graph`'s initial value from the `graphProp`.

Tests: add routing for graph and analytics. Structural-sharing test verifies all 7 slices.

Commit: `git commit -m "feat(core): widen root reducer with graph and analytics slices"`

---

## Task 4: Extract effect hooks (5 files)

This is the core of PR 4 — moving effects out of NavMap.tsx into dedicated files.

### 4a: `effects/useGraphLoading.ts`

Consolidates 3 effects (lines 254, 270, 282):
- URL fetch + validation
- Prop sync + validation
- Hierarchy expand on graph load

Interface:
```ts
export function useGraphLoading(deps: {
  graphProp: NavMapGraph | null | undefined;
  graphUrl: string | undefined;
  state: RootState;
  dispatch: Dispatch<Action>;
  groups: ReturnType<typeof useGroupsActions>;
  onValidationError?: (errors: GraphValidationError[]) => void;
}): void
```

### 4b: `effects/useFocusEffects.ts`

Extracts line 233 effect (focus group zoom). Owns `prevFocusedGroupRef` internally.

```ts
export function useFocusEffects(deps: {
  focusedGroupId: string | null;
  nodes: Node[];
  fitView: (opts?: ...) => void;
}): void
```

### 4c: `effects/useAnalyticsFetch.ts`

Extracts line 290 effect (analytics data fetch).

```ts
export function useAnalyticsFetch(deps: {
  analyticsAdapter: AnalyticsAdapter | undefined;
  showAnalytics: boolean;
  state: RootState;
  dispatch: Dispatch<Action>;
}): void
```

### 4d: `effects/useEdgeEffects.ts`

Consolidates 3 effects (lines 330, 340, 357):
- Shared nav toggle
- Bundled edge computation
- Edge mode restore

```ts
export function useEdgeEffects(deps: {
  layoutDone: boolean;
  showSharedNav: boolean;
  edgeMode: EdgeMode;
  nodes: Node[];
  setEdges: (edges: Edge[]) => void;
  baseEdgesRef: RefObject<Edge[]>;
  sharedNavEdgesRef: RefObject<Edge[]>;
}): void
```

### 4e: `effects/useZoomEffects.ts`

Extracts line 384 effect (auto-collapse/expand on zoom tier). Owns `prevZoomTierRef` internally.

```ts
export function useZoomEffects(deps: {
  zoomTier: string;
  viewMode: ViewMode;
  graph: NavMapGraph | null;
  groups: ReturnType<typeof useGroupsActions>;
}): void
```

Each effect hook is a single file with a single exported function. No tests for effect hooks in this PR — they're tested via the existing `NavMap.test.tsx` integration test which must pass unchanged.

Commit: `git commit -m "feat(core): extract 10 effects from NavMap into dedicated hook files"`

---

## Task 5: Wire everything into NavMap.tsx

The big integration task:

1. Replace 4 `useState` calls with graph + analytics slice reads
2. Update the `useReducer` lazy initializer to include graph initial state from `graphProp`
3. Replace `setGraph(data)` → `dispatch({ type: 'graph/setGraph', graph: data })` (but this now lives in `useGraphLoading`)
4. Replace `setLayoutDone(true/false)` → `dispatch({ type: 'graph/setLayoutDone', done: true/false })` (lives in `useLayoutEffects` — or keep the graph→layout effect in NavMap for now if extracting is too complex)
5. Replace `setAnalyticsData(...)` → `dispatch(...)` (lives in `useAnalyticsFetch`)
6. Replace `setAnalyticsPeriod(...)` → `dispatch(...)` (in toolbar callback)
7. Replace 10 `useEffect` blocks with 5 hook calls
8. Move owned refs into the hook files
9. Delete `viewModeRef` if no longer needed (check `useViewModeLayout`)

**Target after this task:** NavMap.tsx should be ~250-300 lines — imports, `useReducer` setup, action hooks, effect hooks, existing extracted hooks (`useGraphStyling`, `useKeyboardNav`, etc.), memos, event handlers, and JSX.

Commit: `git commit -m "refactor(core): wire graph+analytics slices and extract effects from NavMap"`

---

## Task 6: Full validation pass

Standard validation: lint, typecheck, knip, build, NavMap.test.tsx unchanged, line count check.

**Key success criteria:**
- NavMap.tsx under 300 lines
- All `useEffect` blocks gone from NavMap.tsx except the hover-preview one (7 lines)
- All 4 remaining `useState` calls replaced with slice reads
- `eslint-disable max-lines` still present (removed in PR 5)
- All tests pass

---

## Risk assessment

This is the riskiest PR because:

1. **The graph→layout effect (line 301) references `handleGroupToggleRef.current` and `handleGroupDoubleClickRef.current`**, which are also needed by `useViewModeLayout`. Extracting this effect means the ref must be passed through. The refs were already stabilized in PR 3 but they're still `useRef` instances in NavMap.tsx because `useViewModeLayout` expects them. The effect hook will receive them as deps.

2. **The `graph` state currently lives on `useState` and is set by two effects** (URL fetch and prop sync). Moving it to the reducer means dispatching `graph/setGraph` from within the effect hook. The 3-arg `useReducer` initializer must set the initial graph from `graphProp`.

3. **The analytics period has a computed default** (30-day window from today). This must be preserved in the slice's initial state or the lazy initializer.

4. **PR 4 split threshold** from the spec: if the diff exceeds ~800 changed lines, split into PR 4a (graph slice + loading/layout effects) and PR 4b (analytics + remaining effects).

## Out of scope

- Refactoring `useViewModeLayout` to stop using `RefObject<fn>` params (follow-up PR)
- Removing `eslint-disable max-lines` (PR 5)
- Any user-visible change
