# NavMap Refactor — PR 3: View + Groups Slices + Ref-Mirror Removal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 6 remaining non-graph/analytics `useState` calls into view and groups slices, and kill the 3 ref-mirror pairs (`handleGroupToggle`/`Ref`, `handleGroupDoubleClick`/`Ref`, `handleHierarchyToggle`/`Ref`). This is the highest-value PR — it delivers the velocity payoff described in the design spec.

**Architecture:** Two new slices. The `view` slice is straightforward (3 values: `viewMode`, `edgeMode`, `treeRootId`). The `groups` slice is more complex: it manages `focusedGroupId` (string|null), `collapsedGroups` (Set<string>), and `hierarchyExpandedGroups` (Set<string>). The current code has side effects (`pushSnapshot` for undo) inside `useState` functional updaters — the refactor separates the undo push from the state mutation so the reducer stays pure.

**Key change:** The 3 `handleX` + `handleXRef` pairs are replaced by action dispatches. Since `dispatch` is stable, effects and callbacks that currently call `handleGroupToggleRef.current` can call `dispatch` or an action-hook method directly, eliminating the entire ref-mirror pattern.

**Tech Stack:** TypeScript 5.7, React 18, Vitest 4

---

## Scope

PR 3 only. After this PR, only `graph`, `layoutDone`, `analyticsData`, `analyticsPeriod` remain on `useState` (migrated in PR 4 with effects extraction).

## Current state shapes in NavMap.tsx

```ts
// View state (lines 114-116)
const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);    // ViewMode = 'hierarchy' | 'map' | 'flow' | 'tree'
const [treeRootId, setTreeRootId] = useState<string | null>(null);
const [edgeMode, setEdgeMode] = useState<EdgeMode>(defaultEdgeMode);    // EdgeMode = 'smooth' | 'step' | 'corridor'

// Groups state (lines 117, 126-127)
const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
const [hierarchyExpandedGroups, setHierarchyExpandedGroups] = useState<Set<string>>(new Set());
```

## The ref-mirror pattern to kill (lines 192-228)

```ts
const handleGroupToggle = useCallback((groupId, collapsed) => {
  setCollapsedGroups(prev => {
    pushSnapshot({ type: 'collapse', collapsedGroups: new Set(prev) });
    // ... mutate and return
  });
  if (collapsed) setFocusedGroupId(prev => ...);
}, [pushSnapshot]);
const handleGroupToggleRef = useRef(handleGroupToggle);
handleGroupToggleRef.current = handleGroupToggle;

const handleGroupDoubleClick = useCallback((groupId) => {
  setFocusedGroupId(prev => ...);
}, []);
const handleGroupDoubleClickRef = useRef(handleGroupDoubleClick);
handleGroupDoubleClickRef.current = handleGroupDoubleClick;

const handleHierarchyToggle = useCallback((groupId) => {
  setHierarchyExpandedGroups(prev => {
    pushSnapshot({ type: 'hierarchy-toggle', expandedGroups: new Set(prev) });
    // ... toggle and return
  });
}, [pushSnapshot]);
const handleHierarchyToggleRef = useRef(handleHierarchyToggle);
handleHierarchyToggleRef.current = handleHierarchyToggle;
```

**Why the refs exist:** These handlers are passed (via `.current`) into node/group render components that don't re-render on every state change. The ref ensures the component always calls the latest version of the handler even if its parent didn't re-render. With `dispatch` being stable, the handler can be defined as a stable callback that dispatches an action — no ref needed.

**The undo side effect:** `pushSnapshot` is called inside `setCollapsedGroups` and `setHierarchyExpandedGroups`. After the refactor, the caller must push the undo snapshot *before* dispatching the state-changing action. The reducer stays pure.

## `useKeyboardNav` contract changes

`useKeyboardNav` currently receives:
- `setFocusedGroupId: (id: string | null) => void` — used on Escape (line 111)
- `setCollapsedGroups: (fn: (prev: Set<string>) => Set<string>) => void` — used in undo (line 168)
- `setHierarchyExpandedGroups: (fn: (prev: Set<string>) => Set<string>) => void` — used in undo (line 178)

After refactor, these become action dispatches via the groups slice. The undo case is special: `useKeyboardNav` calls `setCollapsedGroups(() => new Set(entry.collapsedGroups))` which is a "replace the whole Set" operation. That maps to a `groups/restoreCollapsed` action.

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `packages/core/src/state/slices/view.ts` | View slice: viewMode, edgeMode, treeRootId |
| Create | `packages/core/src/state/slices/groups.ts` | Groups slice: focusedGroupId, collapsedGroups, hierarchyExpandedGroups |
| Create | `packages/core/src/state/__tests__/view.test.ts` | View reducer tests |
| Create | `packages/core/src/state/__tests__/groups.test.ts` | Groups reducer tests |
| Modify | `packages/core/src/state/types.ts` | Widen RootState and Action |
| Modify | `packages/core/src/state/reducer.ts` | Add view + groups delegation |
| Modify | `packages/core/src/state/__tests__/reducer.test.ts` | Add routing tests |
| Modify | `packages/core/src/hooks/useKeyboardNav.ts` | Replace setter props with action dispatches |
| Modify | `packages/core/src/components/NavMap.tsx` | Replace 6 useStates, kill ref-mirror pattern |

---

## Task 1: View slice — scaffold + TDD

**Files:**
- Create: `packages/core/src/state/slices/view.ts`
- Create: `packages/core/src/state/__tests__/view.test.ts`

- [ ] **Step 1: Create the view slice**

Write to `packages/core/src/state/slices/view.ts`:

```ts
import { useMemo, type Dispatch } from 'react';
import type { ViewMode, EdgeMode } from '../../types';

export type ViewState = {
  viewMode: ViewMode;
  edgeMode: EdgeMode;
  treeRootId: string | null;
};

export type ViewAction =
  | { type: 'view/setViewMode'; mode: ViewMode }
  | { type: 'view/setEdgeMode'; mode: EdgeMode }
  | { type: 'view/setTreeRootId'; id: string | null };

export function createInitialViewState(
  defaultViewMode: ViewMode = 'hierarchy',
  defaultEdgeMode: EdgeMode = 'smooth'
): ViewState {
  return {
    viewMode: defaultViewMode,
    edgeMode: defaultEdgeMode,
    treeRootId: null,
  };
}

export const initialViewState: ViewState = createInitialViewState();

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'view/setViewMode':
      if (state.viewMode === action.mode) return state;
      return { ...state, viewMode: action.mode };

    case 'view/setEdgeMode':
      if (state.edgeMode === action.mode) return state;
      return { ...state, edgeMode: action.mode };

    case 'view/setTreeRootId':
      if (state.treeRootId === action.id) return state;
      return { ...state, treeRootId: action.id };

    default:
      return state;
  }
}

export function useViewActions(dispatch: Dispatch<ViewAction>) {
  return useMemo(
    () => ({
      setViewMode: (mode: ViewMode) => dispatch({ type: 'view/setViewMode', mode }),
      setEdgeMode: (mode: EdgeMode) => dispatch({ type: 'view/setEdgeMode', mode }),
      setTreeRootId: (id: string | null) => dispatch({ type: 'view/setTreeRootId', id }),
    }),
    [dispatch]
  );
}
```

Note: `createInitialViewState` is exported so `NavMap.tsx` can pass `defaultViewMode`/`defaultEdgeMode` props into the initial reducer state. The `initialViewState` constant uses defaults and is used by the root reducer and tests.

- [ ] **Step 2: Create view tests**

Write to `packages/core/src/state/__tests__/view.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialViewState, viewReducer, type ViewAction } from '../slices/view';

describe('viewReducer', () => {
  it('starts with hierarchy view, smooth edges, no tree root', () => {
    expect(initialViewState).toEqual({
      viewMode: 'hierarchy',
      edgeMode: 'smooth',
      treeRootId: null,
    });
  });

  it('returns state unchanged for unknown actions', () => {
    const unknown = { type: 'unknown/action' } as unknown as ViewAction;
    expect(viewReducer(initialViewState, unknown)).toBe(initialViewState);
  });

  it('setViewMode changes the view mode', () => {
    const result = viewReducer(initialViewState, { type: 'view/setViewMode', mode: 'flow' });
    expect(result.viewMode).toBe('flow');
  });

  it('setViewMode returns same reference when unchanged', () => {
    const result = viewReducer(initialViewState, { type: 'view/setViewMode', mode: 'hierarchy' });
    expect(result).toBe(initialViewState);
  });

  it('setEdgeMode changes the edge mode', () => {
    const result = viewReducer(initialViewState, { type: 'view/setEdgeMode', mode: 'step' });
    expect(result.edgeMode).toBe('step');
  });

  it('setEdgeMode returns same reference when unchanged', () => {
    const result = viewReducer(initialViewState, { type: 'view/setEdgeMode', mode: 'smooth' });
    expect(result).toBe(initialViewState);
  });

  it('setTreeRootId sets the tree root', () => {
    const result = viewReducer(initialViewState, { type: 'view/setTreeRootId', id: 'home' });
    expect(result.treeRootId).toBe('home');
  });

  it('setTreeRootId clears with null', () => {
    const state = { ...initialViewState, treeRootId: 'home' };
    const result = viewReducer(state, { type: 'view/setTreeRootId', id: null });
    expect(result.treeRootId).toBeNull();
  });

  it('setTreeRootId returns same reference when unchanged', () => {
    const result = viewReducer(initialViewState, { type: 'view/setTreeRootId', id: null });
    expect(result).toBe(initialViewState);
  });
});
```

- [ ] **Step 3: Run tests and typecheck**

Run: `pnpm --filter @neonwatty/nav-map test -- view`
Expected: 9 tests passing.

Run: `pnpm --filter @neonwatty/nav-map typecheck`
Expected: PASS. Note: `import type { ViewMode, EdgeMode } from '../../types'` must resolve correctly — verify the path if typecheck fails.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/state/slices/view.ts packages/core/src/state/__tests__/view.test.ts
git commit -m "feat(core): add view slice with viewMode, edgeMode, and treeRootId"
```

---

## Task 2: Groups slice — scaffold + TDD

**Files:**
- Create: `packages/core/src/state/slices/groups.ts`
- Create: `packages/core/src/state/__tests__/groups.test.ts`

This is the most complex slice because it manages `Set<string>` state.

- [ ] **Step 1: Create the groups slice**

Write to `packages/core/src/state/slices/groups.ts`:

```ts
import { useMemo, type Dispatch } from 'react';

export type GroupsState = {
  focusedGroupId: string | null;
  collapsedGroups: Set<string>;
  hierarchyExpandedGroups: Set<string>;
};

export const initialGroupsState: GroupsState = {
  focusedGroupId: null,
  collapsedGroups: new Set(),
  hierarchyExpandedGroups: new Set(),
};

export type GroupsAction =
  | { type: 'groups/setFocusedGroup'; id: string | null }
  | { type: 'groups/toggleFocusedGroup'; id: string }
  | { type: 'groups/clearFocusIfMatch'; id: string }
  | { type: 'groups/collapseGroup'; id: string }
  | { type: 'groups/expandGroup'; id: string }
  | { type: 'groups/restoreCollapsed'; groups: Set<string> }
  | { type: 'groups/toggleHierarchyGroup'; id: string }
  | { type: 'groups/setHierarchyExpanded'; groups: Set<string> }
  | { type: 'groups/clearHierarchyExpanded' };

export function groupsReducer(
  state: GroupsState,
  action: GroupsAction
): GroupsState {
  switch (action.type) {
    case 'groups/setFocusedGroup':
      if (state.focusedGroupId === action.id) return state;
      return { ...state, focusedGroupId: action.id };

    case 'groups/toggleFocusedGroup':
      return {
        ...state,
        focusedGroupId: state.focusedGroupId === action.id ? null : action.id,
      };

    case 'groups/clearFocusIfMatch':
      if (state.focusedGroupId !== action.id) return state;
      return { ...state, focusedGroupId: null };

    case 'groups/collapseGroup': {
      if (state.collapsedGroups.has(action.id)) return state;
      const next = new Set(state.collapsedGroups);
      next.add(action.id);
      return { ...state, collapsedGroups: next };
    }

    case 'groups/expandGroup': {
      if (!state.collapsedGroups.has(action.id)) return state;
      const next = new Set(state.collapsedGroups);
      next.delete(action.id);
      return { ...state, collapsedGroups: next };
    }

    case 'groups/restoreCollapsed':
      return { ...state, collapsedGroups: action.groups };

    case 'groups/toggleHierarchyGroup': {
      const next = new Set(state.hierarchyExpandedGroups);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, hierarchyExpandedGroups: next };
    }

    case 'groups/setHierarchyExpanded':
      return { ...state, hierarchyExpandedGroups: action.groups };

    case 'groups/clearHierarchyExpanded':
      if (state.hierarchyExpandedGroups.size === 0) return state;
      return { ...state, hierarchyExpandedGroups: new Set() };

    default:
      return state;
  }
}

export function useGroupsActions(dispatch: Dispatch<GroupsAction>) {
  return useMemo(
    () => ({
      setFocusedGroup: (id: string | null) =>
        dispatch({ type: 'groups/setFocusedGroup', id }),
      toggleFocusedGroup: (id: string) =>
        dispatch({ type: 'groups/toggleFocusedGroup', id }),
      clearFocusIfMatch: (id: string) =>
        dispatch({ type: 'groups/clearFocusIfMatch', id }),
      collapseGroup: (id: string) =>
        dispatch({ type: 'groups/collapseGroup', id }),
      expandGroup: (id: string) =>
        dispatch({ type: 'groups/expandGroup', id }),
      restoreCollapsed: (groups: Set<string>) =>
        dispatch({ type: 'groups/restoreCollapsed', groups }),
      toggleHierarchyGroup: (id: string) =>
        dispatch({ type: 'groups/toggleHierarchyGroup', id }),
      setHierarchyExpanded: (groups: Set<string>) =>
        dispatch({ type: 'groups/setHierarchyExpanded', groups }),
      clearHierarchyExpanded: () =>
        dispatch({ type: 'groups/clearHierarchyExpanded' }),
    }),
    [dispatch]
  );
}
```

Action design notes:
- `collapseGroup`/`expandGroup` replace the `setCollapsedGroups(prev => { add/delete; return next })` pattern with explicit collapse/expand semantics. The **undo snapshot** (`pushSnapshot`) is NOT inside the reducer — callers must push the snapshot before dispatching.
- `restoreCollapsed` replaces `setCollapsedGroups(() => new Set(entry.collapsedGroups))` from undo — it's a "wholesale replace" operation.
- `clearFocusIfMatch` replaces `setFocusedGroupId(prev => (prev === groupId ? null : prev))` — only clears if the current focused group matches.
- `toggleFocusedGroup` replaces `setFocusedGroupId(prev => (prev === groupId ? null : groupId))` — toggle between focused and unfocused.

- [ ] **Step 2: Create groups tests**

Write to `packages/core/src/state/__tests__/groups.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialGroupsState, groupsReducer, type GroupsAction } from '../slices/groups';

describe('groupsReducer', () => {
  it('starts with no focus, empty collapsed and expanded sets', () => {
    expect(initialGroupsState.focusedGroupId).toBeNull();
    expect(initialGroupsState.collapsedGroups.size).toBe(0);
    expect(initialGroupsState.hierarchyExpandedGroups.size).toBe(0);
  });

  it('returns state unchanged for unknown actions', () => {
    const unknown = { type: 'unknown/action' } as unknown as GroupsAction;
    expect(groupsReducer(initialGroupsState, unknown)).toBe(initialGroupsState);
  });

  describe('focused group', () => {
    it('setFocusedGroup sets the focused group', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/setFocusedGroup', id: 'auth' });
      expect(result.focusedGroupId).toBe('auth');
    });

    it('setFocusedGroup clears with null', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/setFocusedGroup', id: null });
      expect(result.focusedGroupId).toBeNull();
    });

    it('setFocusedGroup returns same reference when unchanged', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/setFocusedGroup', id: null });
      expect(result).toBe(initialGroupsState);
    });

    it('toggleFocusedGroup sets when null', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/toggleFocusedGroup', id: 'auth' });
      expect(result.focusedGroupId).toBe('auth');
    });

    it('toggleFocusedGroup clears when matching', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/toggleFocusedGroup', id: 'auth' });
      expect(result.focusedGroupId).toBeNull();
    });

    it('toggleFocusedGroup replaces when different', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/toggleFocusedGroup', id: 'marketing' });
      expect(result.focusedGroupId).toBe('marketing');
    });

    it('clearFocusIfMatch clears when matching', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/clearFocusIfMatch', id: 'auth' });
      expect(result.focusedGroupId).toBeNull();
    });

    it('clearFocusIfMatch returns same reference when not matching', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/clearFocusIfMatch', id: 'marketing' });
      expect(result).toBe(state);
    });
  });

  describe('collapsed groups', () => {
    it('collapseGroup adds a group', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/collapseGroup', id: 'auth' });
      expect(result.collapsedGroups.has('auth')).toBe(true);
    });

    it('collapseGroup returns same reference when already collapsed', () => {
      const state = { ...initialGroupsState, collapsedGroups: new Set(['auth']) };
      const result = groupsReducer(state, { type: 'groups/collapseGroup', id: 'auth' });
      expect(result).toBe(state);
    });

    it('expandGroup removes a group', () => {
      const state = { ...initialGroupsState, collapsedGroups: new Set(['auth']) };
      const result = groupsReducer(state, { type: 'groups/expandGroup', id: 'auth' });
      expect(result.collapsedGroups.has('auth')).toBe(false);
    });

    it('expandGroup returns same reference when not collapsed', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/expandGroup', id: 'auth' });
      expect(result).toBe(initialGroupsState);
    });

    it('restoreCollapsed replaces the entire set', () => {
      const restored = new Set(['a', 'b', 'c']);
      const result = groupsReducer(initialGroupsState, { type: 'groups/restoreCollapsed', groups: restored });
      expect(result.collapsedGroups).toBe(restored);
    });
  });

  describe('hierarchy expanded groups', () => {
    it('toggleHierarchyGroup adds when absent', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/toggleHierarchyGroup', id: 'auth' });
      expect(result.hierarchyExpandedGroups.has('auth')).toBe(true);
    });

    it('toggleHierarchyGroup removes when present', () => {
      const state = { ...initialGroupsState, hierarchyExpandedGroups: new Set(['auth']) };
      const result = groupsReducer(state, { type: 'groups/toggleHierarchyGroup', id: 'auth' });
      expect(result.hierarchyExpandedGroups.has('auth')).toBe(false);
    });

    it('setHierarchyExpanded replaces the entire set', () => {
      const expanded = new Set(['a', 'b']);
      const result = groupsReducer(initialGroupsState, { type: 'groups/setHierarchyExpanded', groups: expanded });
      expect(result.hierarchyExpandedGroups).toBe(expanded);
    });

    it('clearHierarchyExpanded empties the set', () => {
      const state = { ...initialGroupsState, hierarchyExpandedGroups: new Set(['a', 'b']) };
      const result = groupsReducer(state, { type: 'groups/clearHierarchyExpanded' });
      expect(result.hierarchyExpandedGroups.size).toBe(0);
    });

    it('clearHierarchyExpanded returns same reference when already empty', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/clearHierarchyExpanded' });
      expect(result).toBe(initialGroupsState);
    });
  });
});
```

- [ ] **Step 3: Run tests and typecheck**

Run: `pnpm --filter @neonwatty/nav-map test -- groups`
Expected: 20 tests passing.

Run: `pnpm --filter @neonwatty/nav-map typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/state/slices/groups.ts packages/core/src/state/__tests__/groups.test.ts
git commit -m "feat(core): add groups slice with focused, collapsed, and hierarchy actions"
```

---

## Task 3: Widen root types + update root reducer

**Files:**
- Modify: `packages/core/src/state/types.ts`
- Modify: `packages/core/src/state/reducer.ts`
- Modify: `packages/core/src/state/__tests__/reducer.test.ts`

- [ ] **Step 1: Update types.ts** — add ViewState, ViewAction, GroupsState, GroupsAction imports; widen RootState and Action.

- [ ] **Step 2: Update reducer.ts** — add view + groups to initialRootState and the `next` object in rootReducer.

Note: the view slice needs special handling for props-based initial state (`defaultViewMode`, `defaultEdgeMode`). For now, use `initialViewState` (defaults to 'hierarchy'/'smooth'). The prop-based initialization will be handled in Task 5 when wiring into NavMap.tsx — the `useReducer` 3rd-arg lazy initializer can override.

- [ ] **Step 3: Update reducer.test.ts** — add routing tests for view and groups slices, update the structural-sharing test to verify all 5 slices.

- [ ] **Step 4: Run tests, typecheck, commit**

```bash
git add packages/core/src/state/types.ts packages/core/src/state/reducer.ts packages/core/src/state/__tests__/reducer.test.ts
git commit -m "feat(core): widen root reducer with view and groups slices"
```

---

## Task 4: Update `useKeyboardNav` contract

**Files:**
- Modify: `packages/core/src/hooks/useKeyboardNav.ts`

This is where the ref-mirror benefit becomes real. `useKeyboardNav` currently receives raw setter functions. After this task, it receives action dispatches via the groups slice hook.

- [ ] **Step 1: Update the `KeyboardNavDeps` interface**

Replace these props in the interface:
```ts
// REMOVE:
focusedGroupId: string | null;
setFocusedGroupId: (id: string | null) => void;
setCollapsedGroups: (fn: (prev: Set<string>) => Set<string>) => void;
setHierarchyExpandedGroups: (fn: (prev: Set<string>) => Set<string>) => void;

// ADD:
focusedGroupId: string | null;
groups: {
  setFocusedGroup: (id: string | null) => void;
  restoreCollapsed: (groups: Set<string>) => void;
  setHierarchyExpanded: (groups: Set<string>) => void;
};
```

- [ ] **Step 2: Update the destructuring and handler body**

In the body of `useKeyboardNav`:
- Replace `setFocusedGroupId(null)` (Escape handler, line 111) → `groups.setFocusedGroup(null)`
- Replace the undo `setCollapsedGroups(() => new Set(entry.collapsedGroups))` (line 168) → `groups.restoreCollapsed(new Set(entry.collapsedGroups))`
- Replace the undo `setHierarchyExpandedGroups(() => new Set(entry.expandedGroups))` (line 178) → `groups.setHierarchyExpanded(new Set(entry.expandedGroups))`

- [ ] **Step 3: Update the useEffect dependency array**

Replace `setFocusedGroupId`, `setCollapsedGroups`, `setHierarchyExpandedGroups` with `groups` in the dep array. Since `groups` is a memoized object from `useGroupsActions(dispatch)`, it's stable.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @neonwatty/nav-map typecheck`
Expected: may fail because NavMap.tsx still passes the old props — that's OK, we'll fix it in Task 5. If it does fail, note the expected errors and continue.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/hooks/useKeyboardNav.ts
git commit -m "refactor(core): update useKeyboardNav to accept groups action facade"
```

---

## Task 5: Wire view + groups into NavMap.tsx + kill ref-mirrors

**Files:**
- Modify: `packages/core/src/components/NavMap.tsx`

This is the big integration task. It replaces 6 useState calls, kills 3 ref-mirror pairs (~35 lines), updates ~30 call sites, and changes the `useKeyboardNav` call.

- [ ] **Step 1: Add imports**

```ts
import { useViewActions, createInitialViewState } from '../state/slices/view';
import { useGroupsActions } from '../state/slices/groups';
```

- [ ] **Step 2: Replace 6 useState calls with slice destructuring**

Replace lines 114-117 and 126-127. Add after existing action hooks:

```ts
const view = useViewActions(dispatch);
const { viewMode, edgeMode, treeRootId } = state.view;
const groups = useGroupsActions(dispatch);
const { focusedGroupId, collapsedGroups, hierarchyExpandedGroups } = state.groups;
```

Note: `viewMode` and `edgeMode` had prop-based defaults (`defaultViewMode`, `defaultEdgeMode`). The `useReducer` lazy initializer in PR 1 used `initialRootState`. Now we need to override the view slice's initial state with the props. Update the `useReducer` call:

```ts
const [state, dispatch] = useReducer(rootReducer, undefined, () => ({
  ...initialRootState,
  view: createInitialViewState(defaultViewMode, defaultEdgeMode),
}));
```

- [ ] **Step 3: Kill the 3 ref-mirror pairs**

Delete entirely (lines ~192-228):
- `handleGroupToggle` + `handleGroupToggleRef`
- `handleGroupDoubleClick` + `handleGroupDoubleClickRef`
- `handleHierarchyToggle` + `handleHierarchyToggleRef`

Replace with inline action dispatches at the call sites. The undo snapshot is pushed BEFORE the dispatch:

For `handleGroupToggle` callers:
```ts
// Before: handleGroupToggleRef.current(groupId, collapsed)
// After:
pushSnapshot({ type: 'collapse', collapsedGroups: new Set(collapsedGroups) });
if (collapsed) groups.collapseGroup(groupId);
else groups.expandGroup(groupId);
if (collapsed) groups.clearFocusIfMatch(groupId);
```

For `handleGroupDoubleClick` callers:
```ts
// Before: handleGroupDoubleClickRef.current(groupId)
// After:
groups.toggleFocusedGroup(groupId);
```

For `handleHierarchyToggle` callers:
```ts
// Before: handleHierarchyToggleRef.current(groupId)
// After:
pushSnapshot({ type: 'hierarchy-toggle', expandedGroups: new Set(hierarchyExpandedGroups) });
groups.toggleHierarchyGroup(groupId);
```

- [ ] **Step 4: Replace remaining writer call sites**

View writers:
| Old | New |
|---|---|
| `setViewMode(mode)` | `view.setViewMode(mode)` |
| `setEdgeMode(mode)` | `view.setEdgeMode(mode)` |
| `setTreeRootId(null)` | `view.setTreeRootId(null)` |
| `setTreeRootId(id)` | `view.setTreeRootId(id)` |

Groups writers:
| Old | New |
|---|---|
| `setFocusedGroupId(null)` | `groups.setFocusedGroup(null)` |
| `setFocusedGroupId(prev => ...)` | Use `groups.toggleFocusedGroup(id)` or `groups.clearFocusIfMatch(id)` or `groups.setFocusedGroup(null)` depending on semantics |
| `setCollapsedGroups(...)` | Already replaced via ref-mirror removal |
| `setHierarchyExpandedGroups(new Set(...))` | `groups.setHierarchyExpanded(new Set(...))` |
| `setHierarchyExpandedGroups(new Set())` | `groups.clearHierarchyExpanded()` |

- [ ] **Step 5: Update the `useKeyboardNav` call**

Replace:
```ts
setFocusedGroupId,
setCollapsedGroups,
setHierarchyExpandedGroups,
```

With:
```ts
groups,
```

Also remove the 3 `toggleableSetShowSharedNav`/`toggleableSetFocusMode`/`toggleableSetShowRedirects` wrappers from PR 2 — since `useKeyboardNav` now has access to the groups facade, check if it can also use the display toggle actions directly. (This may be deferred to keep the diff scoped.)

- [ ] **Step 6: Delete the `viewModeRef`**

Lines 135-136 currently have:
```ts
const viewModeRef = useRef(viewMode);
viewModeRef.current = viewMode;
```

Check if `viewModeRef` is used anywhere else in the file. If it's only used inside effects that now read from `state.view.viewMode`, delete it. If it's referenced in render-phase callbacks or passed to children, leave it for now.

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter @neonwatty/nav-map typecheck`
Expected: PASS.

- [ ] **Step 8: Run full test suite**

Run: `pnpm --filter @neonwatty/nav-map test`
Expected: All tests pass. `NavMap.test.tsx` unchanged.

- [ ] **Step 9: Verify ref-mirrors are gone**

```bash
grep -n "handleGroupToggleRef\|handleGroupDoubleClickRef\|handleHierarchyToggleRef" packages/core/src/components/NavMap.tsx
```
Expected: 0 matches.

- [ ] **Step 10: Commit**

```bash
git add packages/core/src/components/NavMap.tsx
git commit -m "refactor(core): migrate view and groups state, kill ref-mirror pattern"
```

---

## Task 6: Full validation pass

- [ ] **Step 1:** `pnpm lint` — 0 errors
- [ ] **Step 2:** `pnpm typecheck` — PASS all packages
- [ ] **Step 3:** `pnpm knip:production` — PASS
- [ ] **Step 4:** `pnpm build:core` — PASS
- [ ] **Step 5:** Verify `NavMap.test.tsx` unchanged: `git diff HEAD -- packages/core/src/components/NavMap.test.tsx` — 0 lines
- [ ] **Step 6:** Verify ref-mirrors gone: `grep -c "handleGroup.*Ref" packages/core/src/components/NavMap.tsx` — 0
- [ ] **Step 7:** Commit any fixes

---

## Success Criteria (PR 3)

- [ ] `NavMap.tsx` has no `useState` calls for `viewMode`, `edgeMode`, `treeRootId`, `focusedGroupId`, `collapsedGroups`, or `hierarchyExpandedGroups`
- [ ] The 3 `handleX` + `handleXRef` pairs are completely deleted
- [ ] `useKeyboardNav` accepts a `groups` facade instead of raw setter functions
- [ ] `NavMap.test.tsx` passes unchanged
- [ ] `pnpm validate` passes (excluding pre-existing Vercel deploy issue)
- [ ] All reducer tests pass with structural-sharing verification across all 5 slices

## Out of scope

- Migrating `graph`, `layoutDone`, `analyticsData`, `analyticsPeriod` (PR 4)
- Extracting effects into `effects/` hooks (PR 4)
- Removing `eslint-disable max-lines` (PR 5)
