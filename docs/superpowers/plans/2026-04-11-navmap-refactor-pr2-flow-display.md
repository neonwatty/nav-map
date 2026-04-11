# NavMap Refactor — PR 2: Flow + Display Slices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the 3 display-toggle `useState` calls (`showSharedNav`, `focusMode`, `showRedirects`) and 3 flow-playback `useState` calls (`selectedFlowIndex`, `isAnimatingFlow`, `galleryNodeId`) from `NavMap.tsx` into two new reducer slices, following the exact pattern proven in PR 1.

**Architecture:** Two new slice files under `packages/core/src/state/slices/`, each with state type, action union, reducer, and action hook. The root `Action` union in `state/types.ts` is widened to `OverlaysAction | DisplayAction | FlowAction`. The root reducer in `state/reducer.ts` delegates to all three slice reducers with the structural-sharing pattern. `NavMap.tsx` destructures from `state.display` and `state.flow` the same way it destructures from `state.overlays`.

**Tech Stack:** TypeScript 5.7, React 18, Vitest 4, @testing-library/react

---

## Scope

PR 2 only. Covers Tasks 1-8 below. Does not touch groups, view, graph, or analytics state (those are PRs 3-4).

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `packages/core/src/state/slices/display.ts` | Display slice: state, actions, reducer, hook |
| Create | `packages/core/src/state/slices/flow.ts` | Flow slice: state, actions, reducer, hook |
| Create | `packages/core/src/state/__tests__/display.test.ts` | Display reducer tests |
| Create | `packages/core/src/state/__tests__/flow.test.ts` | Flow reducer tests |
| Modify | `packages/core/src/state/types.ts` | Widen `RootState` and `Action` |
| Modify | `packages/core/src/state/reducer.ts` | Add display + flow slice delegation |
| Modify | `packages/core/src/state/__tests__/reducer.test.ts` | Add routing tests for new slices |
| Modify | `packages/core/src/components/NavMap.tsx` | Replace 6 `useState` calls with slice reads + action dispatches |

---

## Current state in NavMap.tsx (lines 112-120)

```ts
// Display state (3 booleans)
const [showSharedNav, setShowSharedNav] = useState(false);       // line 112
const [focusMode, setFocusMode] = useState(false);               // line 113
const [showRedirects, setShowRedirects] = useState(false);        // line 114

// Flow state (number|null, boolean, string|null)
const [selectedFlowIndex, setSelectedFlowIndex] = useState<number | null>(null);  // line 116
const [isAnimatingFlow, setIsAnimatingFlow] = useState(false);    // line 119
const [galleryNodeId, setGalleryNodeId] = useState<string | null>(null);          // line 120
```

### Writer call sites

**Display:**
- `setShowSharedNav`: line 502 (passed to `useKeyboardNav`), line 706 (`prev => !prev` toggle)
- `setFocusMode`: line 503 (passed to `useKeyboardNav`), line 708 (`prev => !prev` toggle)
- `setShowRedirects`: line 513 (passed to `useKeyboardNav`), line 707 (`prev => !prev` toggle)

**Flow:**
- `setSelectedFlowIndex`: line 692 (set to `null` on mode change), line 699 (set to `idx`)
- `setIsAnimatingFlow`: line 710 (`true`), lines 832-833 (`false`)
- `setGalleryNodeId`: line 647 (set to `node.id`), line 880 (set to `null`)

### `useKeyboardNav` receives display setters directly

Lines 502-503 and 513 pass `setShowSharedNav`, `setFocusMode`, `setShowRedirects` directly to `useKeyboardNav`. That hook calls them with `prev => !prev` to toggle. We need guarded wrappers (like `guardedSetShowSearch` in PR 1) that resolve the functional updater form against the destructured local before dispatching. The guard condition here is simpler — no `hideX` prop to check — so the wrappers are just:

```ts
const toggleSharedNav = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(showSharedNav) : v;
    if (next) display.showSharedNav();
    else display.hideSharedNav();
  },
  [display, showSharedNav]
);
```

---

## Task 1: Display slice — scaffold + TDD

**Files:**
- Create: `packages/core/src/state/slices/display.ts`
- Create: `packages/core/src/state/__tests__/display.test.ts`

- [ ] **Step 1: Create the display slice file**

Write to `packages/core/src/state/slices/display.ts`:

```ts
import { useMemo, type Dispatch } from 'react';

export type DisplayState = {
  showSharedNav: boolean;
  focusMode: boolean;
  showRedirects: boolean;
};

export const initialDisplayState: DisplayState = {
  showSharedNav: false,
  focusMode: false,
  showRedirects: false,
};

export type DisplayAction =
  | { type: 'display/showSharedNav' }
  | { type: 'display/hideSharedNav' }
  | { type: 'display/toggleSharedNav' }
  | { type: 'display/enableFocusMode' }
  | { type: 'display/disableFocusMode' }
  | { type: 'display/toggleFocusMode' }
  | { type: 'display/showRedirects' }
  | { type: 'display/hideRedirects' }
  | { type: 'display/toggleRedirects' };

export function displayReducer(
  state: DisplayState,
  action: DisplayAction
): DisplayState {
  switch (action.type) {
    case 'display/showSharedNav':
      if (state.showSharedNav) return state;
      return { ...state, showSharedNav: true };

    case 'display/hideSharedNav':
      if (!state.showSharedNav) return state;
      return { ...state, showSharedNav: false };

    case 'display/toggleSharedNav':
      return { ...state, showSharedNav: !state.showSharedNav };

    case 'display/enableFocusMode':
      if (state.focusMode) return state;
      return { ...state, focusMode: true };

    case 'display/disableFocusMode':
      if (!state.focusMode) return state;
      return { ...state, focusMode: false };

    case 'display/toggleFocusMode':
      return { ...state, focusMode: !state.focusMode };

    case 'display/showRedirects':
      if (state.showRedirects) return state;
      return { ...state, showRedirects: true };

    case 'display/hideRedirects':
      if (!state.showRedirects) return state;
      return { ...state, showRedirects: false };

    case 'display/toggleRedirects':
      return { ...state, showRedirects: !state.showRedirects };

    default:
      return state;
  }
}

export function useDisplayActions(dispatch: Dispatch<DisplayAction>) {
  return useMemo(
    () => ({
      showSharedNav: () => dispatch({ type: 'display/showSharedNav' }),
      hideSharedNav: () => dispatch({ type: 'display/hideSharedNav' }),
      toggleSharedNav: () => dispatch({ type: 'display/toggleSharedNav' }),
      enableFocusMode: () => dispatch({ type: 'display/enableFocusMode' }),
      disableFocusMode: () => dispatch({ type: 'display/disableFocusMode' }),
      toggleFocusMode: () => dispatch({ type: 'display/toggleFocusMode' }),
      showRedirects: () => dispatch({ type: 'display/showRedirects' }),
      hideRedirects: () => dispatch({ type: 'display/hideRedirects' }),
      toggleRedirects: () => dispatch({ type: 'display/toggleRedirects' }),
    }),
    [dispatch]
  );
}
```

Note: toggle actions are included here (unlike the overlays slice which only had open/close). The PR 1 final review flagged the missing `toggleAnalytics` as a minor asymmetry. For display, toggles ARE the primary use case — `useKeyboardNav` and the toolbar both call `prev => !prev`. Having explicit toggle actions avoids the functional-updater workaround entirely for the keyboard nav path.

- [ ] **Step 2: Create the display tests**

Write to `packages/core/src/state/__tests__/display.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialDisplayState, displayReducer, type DisplayAction } from '../slices/display';

describe('displayReducer', () => {
  describe('initial state', () => {
    it('starts with all display toggles off', () => {
      expect(initialDisplayState).toEqual({
        showSharedNav: false,
        focusMode: false,
        showRedirects: false,
      });
    });

    it('returns state unchanged for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as DisplayAction;
      const result = displayReducer(initialDisplayState, unknown);
      expect(result).toBe(initialDisplayState);
    });
  });

  describe('sharedNav actions', () => {
    it('showSharedNav sets to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/showSharedNav' });
      expect(result.showSharedNav).toBe(true);
    });

    it('showSharedNav returns same reference when already true', () => {
      const on = { ...initialDisplayState, showSharedNav: true };
      const result = displayReducer(on, { type: 'display/showSharedNav' });
      expect(result).toBe(on);
    });

    it('hideSharedNav sets to false', () => {
      const on = { ...initialDisplayState, showSharedNav: true };
      const result = displayReducer(on, { type: 'display/hideSharedNav' });
      expect(result.showSharedNav).toBe(false);
    });

    it('hideSharedNav returns same reference when already false', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/hideSharedNav' });
      expect(result).toBe(initialDisplayState);
    });

    it('toggleSharedNav flips from false to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/toggleSharedNav' });
      expect(result.showSharedNav).toBe(true);
    });

    it('toggleSharedNav flips from true to false', () => {
      const on = { ...initialDisplayState, showSharedNav: true };
      const result = displayReducer(on, { type: 'display/toggleSharedNav' });
      expect(result.showSharedNav).toBe(false);
    });
  });

  describe('focusMode actions', () => {
    it('enableFocusMode sets to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/enableFocusMode' });
      expect(result.focusMode).toBe(true);
    });

    it('enableFocusMode returns same reference when already true', () => {
      const on = { ...initialDisplayState, focusMode: true };
      const result = displayReducer(on, { type: 'display/enableFocusMode' });
      expect(result).toBe(on);
    });

    it('disableFocusMode sets to false', () => {
      const on = { ...initialDisplayState, focusMode: true };
      const result = displayReducer(on, { type: 'display/disableFocusMode' });
      expect(result.focusMode).toBe(false);
    });

    it('disableFocusMode returns same reference when already false', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/disableFocusMode' });
      expect(result).toBe(initialDisplayState);
    });

    it('toggleFocusMode flips from false to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/toggleFocusMode' });
      expect(result.focusMode).toBe(true);
    });

    it('toggleFocusMode flips from true to false', () => {
      const on = { ...initialDisplayState, focusMode: true };
      const result = displayReducer(on, { type: 'display/toggleFocusMode' });
      expect(result.focusMode).toBe(false);
    });
  });

  describe('redirects actions', () => {
    it('showRedirects sets to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/showRedirects' });
      expect(result.showRedirects).toBe(true);
    });

    it('showRedirects returns same reference when already true', () => {
      const on = { ...initialDisplayState, showRedirects: true };
      const result = displayReducer(on, { type: 'display/showRedirects' });
      expect(result).toBe(on);
    });

    it('hideRedirects sets to false', () => {
      const on = { ...initialDisplayState, showRedirects: true };
      const result = displayReducer(on, { type: 'display/hideRedirects' });
      expect(result.showRedirects).toBe(false);
    });

    it('hideRedirects returns same reference when already false', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/hideRedirects' });
      expect(result).toBe(initialDisplayState);
    });

    it('toggleRedirects flips from false to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/toggleRedirects' });
      expect(result.showRedirects).toBe(true);
    });

    it('toggleRedirects flips from true to false', () => {
      const on = { ...initialDisplayState, showRedirects: true };
      const result = displayReducer(on, { type: 'display/toggleRedirects' });
      expect(result.showRedirects).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @neonwatty/nav-map test -- display`

Expected: 20 passing tests (2 initial + 6 sharedNav + 6 focusMode + 6 redirects).

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @neonwatty/nav-map typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/state/slices/display.ts packages/core/src/state/__tests__/display.test.ts
git commit -m "feat(core): add display slice with toggle actions and tests"
```

---

## Task 2: Flow slice — scaffold + TDD

**Files:**
- Create: `packages/core/src/state/slices/flow.ts`
- Create: `packages/core/src/state/__tests__/flow.test.ts`

- [ ] **Step 1: Create the flow slice file**

Write to `packages/core/src/state/slices/flow.ts`:

```ts
import { useMemo, type Dispatch } from 'react';

export type FlowState = {
  selectedFlowIndex: number | null;
  isAnimatingFlow: boolean;
  galleryNodeId: string | null;
};

export const initialFlowState: FlowState = {
  selectedFlowIndex: null,
  isAnimatingFlow: false,
  galleryNodeId: null,
};

export type FlowAction =
  | { type: 'flow/selectFlow'; index: number }
  | { type: 'flow/clearFlow' }
  | { type: 'flow/startAnimation' }
  | { type: 'flow/stopAnimation' }
  | { type: 'flow/openGallery'; nodeId: string }
  | { type: 'flow/closeGallery' };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'flow/selectFlow':
      if (state.selectedFlowIndex === action.index) return state;
      return { ...state, selectedFlowIndex: action.index };

    case 'flow/clearFlow':
      if (state.selectedFlowIndex === null) return state;
      return { ...state, selectedFlowIndex: null };

    case 'flow/startAnimation':
      if (state.isAnimatingFlow) return state;
      return { ...state, isAnimatingFlow: true };

    case 'flow/stopAnimation':
      if (!state.isAnimatingFlow) return state;
      return { ...state, isAnimatingFlow: false };

    case 'flow/openGallery':
      if (state.galleryNodeId === action.nodeId) return state;
      return { ...state, galleryNodeId: action.nodeId };

    case 'flow/closeGallery':
      if (state.galleryNodeId === null) return state;
      return { ...state, galleryNodeId: null };

    default:
      return state;
  }
}

export function useFlowActions(dispatch: Dispatch<FlowAction>) {
  return useMemo(
    () => ({
      selectFlow: (index: number) => dispatch({ type: 'flow/selectFlow', index }),
      clearFlow: () => dispatch({ type: 'flow/clearFlow' }),
      startAnimation: () => dispatch({ type: 'flow/startAnimation' }),
      stopAnimation: () => dispatch({ type: 'flow/stopAnimation' }),
      openGallery: (nodeId: string) => dispatch({ type: 'flow/openGallery', nodeId }),
      closeGallery: () => dispatch({ type: 'flow/closeGallery' }),
    }),
    [dispatch]
  );
}
```

- [ ] **Step 2: Create the flow tests**

Write to `packages/core/src/state/__tests__/flow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialFlowState, flowReducer, type FlowAction } from '../slices/flow';

describe('flowReducer', () => {
  describe('initial state', () => {
    it('starts with no flow selected and no animation', () => {
      expect(initialFlowState).toEqual({
        selectedFlowIndex: null,
        isAnimatingFlow: false,
        galleryNodeId: null,
      });
    });

    it('returns state unchanged for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as FlowAction;
      const result = flowReducer(initialFlowState, unknown);
      expect(result).toBe(initialFlowState);
    });
  });

  describe('flow selection', () => {
    it('selectFlow sets the index', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/selectFlow', index: 2 });
      expect(result.selectedFlowIndex).toBe(2);
    });

    it('selectFlow returns same reference when index unchanged', () => {
      const state = { ...initialFlowState, selectedFlowIndex: 2 };
      const result = flowReducer(state, { type: 'flow/selectFlow', index: 2 });
      expect(result).toBe(state);
    });

    it('selectFlow replaces existing index', () => {
      const state = { ...initialFlowState, selectedFlowIndex: 1 };
      const result = flowReducer(state, { type: 'flow/selectFlow', index: 3 });
      expect(result.selectedFlowIndex).toBe(3);
    });

    it('clearFlow sets index to null', () => {
      const state = { ...initialFlowState, selectedFlowIndex: 2 };
      const result = flowReducer(state, { type: 'flow/clearFlow' });
      expect(result.selectedFlowIndex).toBeNull();
    });

    it('clearFlow returns same reference when already null', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/clearFlow' });
      expect(result).toBe(initialFlowState);
    });
  });

  describe('animation', () => {
    it('startAnimation sets isAnimatingFlow to true', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/startAnimation' });
      expect(result.isAnimatingFlow).toBe(true);
    });

    it('startAnimation returns same reference when already animating', () => {
      const state = { ...initialFlowState, isAnimatingFlow: true };
      const result = flowReducer(state, { type: 'flow/startAnimation' });
      expect(result).toBe(state);
    });

    it('stopAnimation sets isAnimatingFlow to false', () => {
      const state = { ...initialFlowState, isAnimatingFlow: true };
      const result = flowReducer(state, { type: 'flow/stopAnimation' });
      expect(result.isAnimatingFlow).toBe(false);
    });

    it('stopAnimation returns same reference when not animating', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/stopAnimation' });
      expect(result).toBe(initialFlowState);
    });
  });

  describe('gallery', () => {
    it('openGallery sets nodeId', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/openGallery', nodeId: 'home' });
      expect(result.galleryNodeId).toBe('home');
    });

    it('openGallery returns same reference when same nodeId', () => {
      const state = { ...initialFlowState, galleryNodeId: 'home' };
      const result = flowReducer(state, { type: 'flow/openGallery', nodeId: 'home' });
      expect(result).toBe(state);
    });

    it('openGallery replaces existing nodeId', () => {
      const state = { ...initialFlowState, galleryNodeId: 'home' };
      const result = flowReducer(state, { type: 'flow/openGallery', nodeId: 'about' });
      expect(result.galleryNodeId).toBe('about');
    });

    it('closeGallery sets nodeId to null', () => {
      const state = { ...initialFlowState, galleryNodeId: 'home' };
      const result = flowReducer(state, { type: 'flow/closeGallery' });
      expect(result.galleryNodeId).toBeNull();
    });

    it('closeGallery returns same reference when already null', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/closeGallery' });
      expect(result).toBe(initialFlowState);
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @neonwatty/nav-map test -- flow`

Expected: 16 passing tests (2 initial + 5 selection + 4 animation + 5 gallery).

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @neonwatty/nav-map typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/state/slices/flow.ts packages/core/src/state/__tests__/flow.test.ts
git commit -m "feat(core): add flow slice with selection, animation, and gallery actions"
```

---

## Task 3: Widen root types + update root reducer

**Files:**
- Modify: `packages/core/src/state/types.ts`
- Modify: `packages/core/src/state/reducer.ts`
- Modify: `packages/core/src/state/__tests__/reducer.test.ts`

- [ ] **Step 1: Update types.ts**

Replace the contents of `packages/core/src/state/types.ts` with:

```ts
import type { OverlaysState, OverlaysAction } from './slices/overlays';
import type { DisplayState, DisplayAction } from './slices/display';
import type { FlowState, FlowAction } from './slices/flow';

export type RootState = {
  overlays: OverlaysState;
  display: DisplayState;
  flow: FlowState;
};

/**
 * Action is a discriminated union of all slice action types. Slice reducers
 * pattern-match on `action.type` and must return state unchanged for actions
 * they don't own.
 */
export type Action = OverlaysAction | DisplayAction | FlowAction;
```

- [ ] **Step 2: Update reducer.ts — switch to loop-based structural sharing**

Replace the contents of `packages/core/src/state/reducer.ts` with:

```ts
import { initialOverlaysState, overlaysReducer } from './slices/overlays';
import { initialDisplayState, displayReducer } from './slices/display';
import { initialFlowState, flowReducer } from './slices/flow';
import type { Action, RootState } from './types';

export const initialRootState: RootState = {
  overlays: initialOverlaysState,
  display: initialDisplayState,
  flow: initialFlowState,
};

/**
 * Root reducer delegates to each slice reducer. Returns the same state
 * reference if no slice changed (React useReducer bailout).
 */
export function rootReducer(state: RootState, action: Action): RootState {
  const next: RootState = {
    overlays: overlaysReducer(state.overlays, action as never),
    display: displayReducer(state.display, action as never),
    flow: flowReducer(state.flow, action as never),
  };

  // Structural sharing: return same reference if nothing changed
  for (const key of Object.keys(next) as (keyof RootState)[]) {
    if (next[key] !== state[key]) return next;
  }
  return state;
}
```

Note: `action as never` is needed because each slice reducer accepts its own narrow action type, but the root reducer receives the wide `Action` union. The `as never` is safe because each slice's switch statement handles only its own action prefixes and returns state unchanged for everything else via `default`. This is the scaling pattern the PR 1 comment in reducer.ts recommended.

- [ ] **Step 3: Update reducer tests**

Replace the contents of `packages/core/src/state/__tests__/reducer.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { initialRootState, rootReducer } from '../reducer';
import type { Action } from '../types';

describe('rootReducer', () => {
  it('routes overlays actions to the overlays slice', () => {
    const result = rootReducer(initialRootState, { type: 'overlays/openSearch' });
    expect(result.overlays.showSearch).toBe(true);
  });

  it('routes display actions to the display slice', () => {
    const result = rootReducer(initialRootState, { type: 'display/toggleSharedNav' });
    expect(result.display.showSharedNav).toBe(true);
  });

  it('routes flow actions to the flow slice', () => {
    const result = rootReducer(initialRootState, { type: 'flow/selectFlow', index: 1 });
    expect(result.flow.selectedFlowIndex).toBe(1);
  });

  it('returns the same root reference when no slice changed', () => {
    const unknown = { type: 'unknown/action' } as unknown as Action;
    const result = rootReducer(initialRootState, unknown);
    expect(result).toBe(initialRootState);
  });

  it('returns a new root reference when a slice changed', () => {
    const result = rootReducer(initialRootState, { type: 'overlays/openSearch' });
    expect(result).not.toBe(initialRootState);
  });

  it('produces a new slice reference only for the changed slice', () => {
    const result = rootReducer(initialRootState, { type: 'display/toggleFocusMode' });
    expect(result.display).not.toBe(initialRootState.display);
    expect(result.overlays).toBe(initialRootState.overlays);
    expect(result.flow).toBe(initialRootState.flow);
  });

  it('returns the same root reference on idempotent dispatch', () => {
    const first = rootReducer(initialRootState, { type: 'overlays/openSearch' });
    const second = rootReducer(first, { type: 'overlays/openSearch' });
    expect(second).toBe(first);
  });
});
```

Note: test 6 ("produces a new slice reference only for the changed slice") is the structural-sharing test that was mislabeled in PR 1. Now with 3 slices it actually tests what it claims — unchanged slices keep their references.

- [ ] **Step 4: Run all state tests**

Run: `pnpm --filter @neonwatty/nav-map test -- state`

Expected: all state tests pass — overlays (28), display (20), flow (16), reducer (7) = 71 state tests.

If the `-- state` filter doesn't match all 4 files, run `pnpm --filter @neonwatty/nav-map test` and verify all 4 test files pass.

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @neonwatty/nav-map typecheck`

Expected: PASS. If it fails on `action as never`, verify the slice reducer signatures — they should accept their own narrow action type (e.g., `DisplayAction`), not `Action`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/state/types.ts packages/core/src/state/reducer.ts packages/core/src/state/__tests__/reducer.test.ts
git commit -m "feat(core): widen root reducer with display and flow slices"
```

---

## Task 4: Wire display + flow slices into NavMap.tsx

**Files:**
- Modify: `packages/core/src/components/NavMap.tsx`

This is the integration task. Same strategy as PR 1 Task 9: add imports, replace useStates with destructured locals from `state.display` and `state.flow`, replace writer call sites, create guarded wrappers for `useKeyboardNav`.

- [ ] **Step 1: Scan for all call sites**

```bash
grep -n -E "setShowSharedNav|setFocusMode|setShowRedirects|setSelectedFlowIndex|setIsAnimatingFlow|setGalleryNodeId" packages/core/src/components/NavMap.tsx
```

Record the line numbers for reference in Steps 3-5.

- [ ] **Step 2: Add imports**

At the top of `NavMap.tsx`, add alongside the existing state imports:

```ts
import { useDisplayActions } from '../state/slices/display';
import { useFlowActions } from '../state/slices/flow';
```

- [ ] **Step 3: Replace 6 useState calls with slice destructuring**

Find lines 112-120 in `NavMap.tsx`. Replace the six useState calls:

```ts
const [showSharedNav, setShowSharedNav] = useState(false);
const [focusMode, setFocusMode] = useState(false);
const [showRedirects, setShowRedirects] = useState(false);
// ...
const [selectedFlowIndex, setSelectedFlowIndex] = useState<number | null>(null);
// ...
const [isAnimatingFlow, setIsAnimatingFlow] = useState(false);
const [galleryNodeId, setGalleryNodeId] = useState<string | null>(null);
```

With (add the action hooks after the existing `overlays` line):

```ts
const display = useDisplayActions(dispatch);
const { showSharedNav, focusMode, showRedirects } = state.display;
const flow = useFlowActions(dispatch);
const { selectedFlowIndex, isAnimatingFlow, galleryNodeId } = state.flow;
```

Leave `viewMode`, `edgeMode`, `treeRootId`, `focusedGroupId` as plain `useState` — those belong to the `view` and `groups` slices in PR 3.

- [ ] **Step 4: Replace display writer call sites**

| Old | New |
|---|---|
| `setShowSharedNav(prev => !prev)` (line ~706) | `display.toggleSharedNav()` |
| `setShowRedirects(prev => !prev)` (line ~707) | `display.toggleRedirects()` |
| `setFocusMode(prev => !prev)` (line ~708) | `display.toggleFocusMode()` |

- [ ] **Step 5: Replace flow writer call sites**

| Old | New |
|---|---|
| `setSelectedFlowIndex(null)` (line ~692) | `flow.clearFlow()` |
| `setSelectedFlowIndex(idx)` (line ~699) | `flow.selectFlow(idx)` |
| `setIsAnimatingFlow(true)` (line ~710) | `flow.startAnimation()` |
| `setIsAnimatingFlow(false)` (lines ~832-833) | `flow.stopAnimation()` |
| `setGalleryNodeId(node.id)` (line ~647) | `flow.openGallery(node.id)` |
| `setGalleryNodeId(null)` (line ~880) | `flow.closeGallery()` |

- [ ] **Step 6: Update `useKeyboardNav` props**

Lines 502-503 and 513 currently pass `setShowSharedNav`, `setFocusMode`, `setShowRedirects` directly to `useKeyboardNav`. The hook uses them with `prev => !prev` toggle pattern.

Since display now has explicit toggle actions, create guarded wrappers OR pass toggle-compatible functions. The cleanest approach: create wrapper callbacks that match the existing setter signature:

```ts
const toggleableSetShowSharedNav = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(showSharedNav) : v;
    if (next) display.showSharedNav();
    else display.hideSharedNav();
  },
  [display, showSharedNav]
);

const toggleableSetFocusMode = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(focusMode) : v;
    if (next) display.enableFocusMode();
    else display.disableFocusMode();
  },
  [display, focusMode]
);

const toggleableSetShowRedirects = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(showRedirects) : v;
    if (next) display.showRedirects();
    else display.hideRedirects();
  },
  [display, showRedirects]
);
```

Then replace the `useKeyboardNav` props:

```ts
setShowSharedNav: toggleableSetShowSharedNav,
setFocusMode: toggleableSetFocusMode,
setShowRedirects: toggleableSetShowRedirects,
```

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter @neonwatty/nav-map typecheck`

Expected: PASS.

- [ ] **Step 8: Run full test suite**

Run: `pnpm --filter @neonwatty/nav-map test`

Expected: All tests pass. `NavMap.test.tsx` must pass unchanged.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/components/NavMap.tsx
git commit -m "refactor(core): migrate NavMap display and flow state to reducer slices"
```

---

## Task 5: Full validation pass

- [ ] **Step 1: Run lint**

Run: `pnpm lint`

Expected: 0 errors (pre-existing warnings OK).

- [ ] **Step 2: Run typecheck across all packages**

Run: `pnpm typecheck`

Expected: PASS for all packages.

- [ ] **Step 3: Run format check**

Run: `pnpm format:check`

Expected: PASS for core files (pre-existing drift on `packages/site/**/*.json` is unrelated).

- [ ] **Step 4: Run knip**

Run: `pnpm knip:production`

Expected: PASS.

- [ ] **Step 5: Run build**

Run: `pnpm build:core`

Expected: ESM/CJS/DTS all build successfully.

- [ ] **Step 6: Verify NavMap.test.tsx is unchanged**

```bash
git diff HEAD -- packages/core/src/components/NavMap.test.tsx
```

Expected: no output (test file is byte-identical).

- [ ] **Step 7: Commit any fixes from validation**

---

## Success Criteria (PR 2)

- [ ] `packages/core/src/components/NavMap.tsx` no longer has `useState` calls for `showSharedNav`, `focusMode`, `showRedirects`, `selectedFlowIndex`, `isAnimatingFlow`, or `galleryNodeId`.
- [ ] `pnpm --filter @neonwatty/nav-map test` passes with ~179 tests (143 baseline + ~36 new).
- [ ] `NavMap.test.tsx` is byte-identical to its state before this PR.
- [ ] `pnpm validate` passes end-to-end (excluding the pre-existing Vercel nav-map deploy issue).
- [ ] The `/* eslint-disable max-lines */` pragma is still present (removed in PR 5).

## Out of scope

- Migrating `viewMode`, `edgeMode`, `treeRootId` (view slice — PR 3)
- Migrating `focusedGroupId`, `collapsedGroups`, `hierarchyExpandedGroups` (groups slice — PR 3)
- Migrating `graph`, `layoutDone`, `analyticsData`, `analyticsPeriod` (PR 4)
- Extracting effects (PR 4)
- Removing the ref-mirror pattern (PR 3)
- Removing `eslint-disable max-lines` (PR 5)
