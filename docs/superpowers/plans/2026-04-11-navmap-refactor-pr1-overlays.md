# NavMap Refactor — PR 1: Overlays Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the `useReducer` + slices scaffolding and migrate the six overlay-related `useState` calls in `NavMap.tsx` into an `overlays` slice. This is the pilot PR of the refactor — it proves the pattern end-to-end before migrating the remaining slices.

**Architecture:** A new `packages/core/src/state/` directory holds the reducer, the root types, and per-slice modules. Each slice owns its own state shape, action union, reducer function, and an action hook that wraps `dispatch` into named callbacks. `NavMap.tsx` wires a `useReducer(rootReducer, initialRootState)` at the top of the component and reads overlay state from `state.overlays.*` instead of six separate `useState` calls. Behavior is byte-identical — existing `NavMap.test.tsx` must pass unchanged.

**Tech Stack:** TypeScript 5.7, React 18, Vitest 4, @testing-library/react (already in core package).

---

## Scope

This plan covers **PR 1 only** from `docs/superpowers/specs/2026-04-11-navmap-refactor-design.md`. The other four PRs (flow/display, groups/view, graph/analytics/effects, cleanup) get their own plans after PR 1 ships and the pattern is validated.

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `packages/core/src/state/types.ts` | `RootState` and `Action` union types (extended in future PRs) |
| Create | `packages/core/src/state/slices/overlays.ts` | Overlays slice: state type, action union, reducer, action hook |
| Create | `packages/core/src/state/reducer.ts` | Root reducer + `initialRootState` |
| Create | `packages/core/src/state/__tests__/overlays.test.ts` | Pure reducer tests — one block per action |
| Modify | `packages/core/src/components/NavMap.tsx:106-142` | Replace 6 overlay `useState` calls with `useReducer` + slice hook |

**Why this split:** One slice per file. The root reducer delegates to slice reducers by re-running each slice reducer against the action. `state/types.ts` is where the `Action` union is defined so both the root reducer and future slices can import it without circular deps.

---

## Exact current state shapes (from NavMap.tsx:120-142)

These are the types we need to preserve — action payloads must accept data of exactly these shapes.

```ts
// showHelp, showSearch, searchQuery, showAnalytics — plain booleans/string

// contextMenu:
{
  x: number;
  y: number;
  nodeId: string;
  route: string;
  filePath?: string;
} | null

// hoverPreview:
{
  screenshot?: string;
  label: string;
  position: { x: number; y: number } | null;
} | null
```

---

## Task 1: Scaffold overlays slice (types + initial state + empty reducer)

**Files:**
- Create: `packages/core/src/state/slices/overlays.ts`

- [ ] **Step 1: Create the overlays slice file with types, initial state, and an empty reducer**

Write to `packages/core/src/state/slices/overlays.ts`:

```ts
import { useMemo, type Dispatch } from 'react';

export type ContextMenuState = {
  x: number;
  y: number;
  nodeId: string;
  route: string;
  filePath?: string;
};

export type HoverPreviewState = {
  screenshot?: string;
  label: string;
  position: { x: number; y: number } | null;
};

export type OverlaysState = {
  showHelp: boolean;
  showSearch: boolean;
  searchQuery: string;
  showAnalytics: boolean;
  contextMenu: ContextMenuState | null;
  hoverPreview: HoverPreviewState | null;
};

export const initialOverlaysState: OverlaysState = {
  showHelp: false,
  showSearch: false,
  searchQuery: '',
  showAnalytics: false,
  contextMenu: null,
  hoverPreview: null,
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

export function overlaysReducer(
  state: OverlaysState,
  action: OverlaysAction
): OverlaysState {
  switch (action.type) {
    default:
      return state;
  }
}

export function useOverlaysActions(dispatch: Dispatch<OverlaysAction>) {
  return useMemo(
    () => ({
      openSearch: () => dispatch({ type: 'overlays/openSearch' }),
      closeSearch: () => dispatch({ type: 'overlays/closeSearch' }),
      setSearchQuery: (query: string) =>
        dispatch({ type: 'overlays/setSearchQuery', query }),
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
    }),
    [dispatch]
  );
}
```

Note: the action hook is written in full here even though no actions are implemented yet. Implementing the hook now (rather than after the reducer cases) avoids another round of file-editing churn, and TypeScript will catch any mismatch between the action shapes here and the reducer cases in later tasks.

- [ ] **Step 2: Run typecheck to confirm the file compiles**

Run: `pnpm --filter @neonwatty/nav-map typecheck`

Expected: PASS (the file imports cleanly, types are well-formed, `overlaysReducer` currently routes every action through the `default` branch).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/state/slices/overlays.ts
git commit -m "feat(core): scaffold overlays slice types and empty reducer"
```

---

## Task 2: Reducer tests — initial state smoke test

**Files:**
- Create: `packages/core/src/state/__tests__/overlays.test.ts`

- [ ] **Step 1: Write the initial state test**

Write to `packages/core/src/state/__tests__/overlays.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  initialOverlaysState,
  overlaysReducer,
  type OverlaysAction,
} from '../slices/overlays';

describe('overlaysReducer', () => {
  describe('initial state', () => {
    it('starts with all overlays closed', () => {
      expect(initialOverlaysState).toEqual({
        showHelp: false,
        showSearch: false,
        searchQuery: '',
        showAnalytics: false,
        contextMenu: null,
        hoverPreview: null,
      });
    });

    it('returns state unchanged for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as OverlaysAction;
      const result = overlaysReducer(initialOverlaysState, unknown);
      expect(result).toBe(initialOverlaysState);
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

Expected: PASS (2 tests in the `initial state` block). If the test runner reports "no tests found", double-check the file path — vitest picks up `**/__tests__/**/*.test.ts` by default in this package.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/state/__tests__/overlays.test.ts
git commit -m "test(core): add overlays reducer initial state tests"
```

---

## Task 3: Search actions (TDD)

**Files:**
- Modify: `packages/core/src/state/slices/overlays.ts`
- Modify: `packages/core/src/state/__tests__/overlays.test.ts`

- [ ] **Step 1: Write failing tests for search actions**

Append to `packages/core/src/state/__tests__/overlays.test.ts` inside `describe('overlaysReducer', () => { ... })`:

```ts
  describe('search actions', () => {
    it('openSearch sets showSearch to true', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/openSearch',
      });
      expect(result.showSearch).toBe(true);
    });

    it('openSearch returns the same reference when already open', () => {
      const open = { ...initialOverlaysState, showSearch: true };
      const result = overlaysReducer(open, { type: 'overlays/openSearch' });
      expect(result).toBe(open);
    });

    it('closeSearch sets showSearch to false and clears searchQuery', () => {
      const open = {
        ...initialOverlaysState,
        showSearch: true,
        searchQuery: 'dashboard',
      };
      const result = overlaysReducer(open, { type: 'overlays/closeSearch' });
      expect(result.showSearch).toBe(false);
      expect(result.searchQuery).toBe('');
    });

    it('closeSearch returns the same reference when already closed with empty query', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/closeSearch',
      });
      expect(result).toBe(initialOverlaysState);
    });

    it('setSearchQuery updates the query string', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/setSearchQuery',
        query: 'checkout',
      });
      expect(result.searchQuery).toBe('checkout');
    });

    it('setSearchQuery returns the same reference when query is unchanged', () => {
      const state = { ...initialOverlaysState, searchQuery: 'checkout' };
      const result = overlaysReducer(state, {
        type: 'overlays/setSearchQuery',
        query: 'checkout',
      });
      expect(result).toBe(state);
    });
  });
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

Expected: 6 new failures in `search actions` block. The existing 2 tests in `initial state` still pass.

- [ ] **Step 3: Implement search actions in the reducer**

Edit `packages/core/src/state/slices/overlays.ts`, replacing the `overlaysReducer` function:

```ts
export function overlaysReducer(
  state: OverlaysState,
  action: OverlaysAction
): OverlaysState {
  switch (action.type) {
    case 'overlays/openSearch':
      if (state.showSearch) return state;
      return { ...state, showSearch: true };

    case 'overlays/closeSearch':
      if (!state.showSearch && state.searchQuery === '') return state;
      return { ...state, showSearch: false, searchQuery: '' };

    case 'overlays/setSearchQuery':
      if (state.searchQuery === action.query) return state;
      return { ...state, searchQuery: action.query };

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

Expected: 8 passing tests (2 initial state + 6 search actions).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/state/slices/overlays.ts packages/core/src/state/__tests__/overlays.test.ts
git commit -m "feat(core): implement overlays search actions with idempotent guards"
```

---

## Task 4: Help actions (TDD)

**Files:**
- Modify: `packages/core/src/state/slices/overlays.ts`
- Modify: `packages/core/src/state/__tests__/overlays.test.ts`

- [ ] **Step 1: Write failing tests for help actions**

Append to `packages/core/src/state/__tests__/overlays.test.ts` inside `describe('overlaysReducer', () => { ... })`:

```ts
  describe('help actions', () => {
    it('openHelp sets showHelp to true', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/openHelp',
      });
      expect(result.showHelp).toBe(true);
    });

    it('openHelp returns the same reference when already open', () => {
      const open = { ...initialOverlaysState, showHelp: true };
      const result = overlaysReducer(open, { type: 'overlays/openHelp' });
      expect(result).toBe(open);
    });

    it('closeHelp sets showHelp to false', () => {
      const open = { ...initialOverlaysState, showHelp: true };
      const result = overlaysReducer(open, { type: 'overlays/closeHelp' });
      expect(result.showHelp).toBe(false);
    });

    it('closeHelp returns the same reference when already closed', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/closeHelp',
      });
      expect(result).toBe(initialOverlaysState);
    });
  });
```

- [ ] **Step 2: Run tests and confirm 4 new failures**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

- [ ] **Step 3: Implement help actions in the reducer**

Edit `packages/core/src/state/slices/overlays.ts`, adding two new cases inside the `switch`:

```ts
    case 'overlays/openHelp':
      if (state.showHelp) return state;
      return { ...state, showHelp: true };

    case 'overlays/closeHelp':
      if (!state.showHelp) return state;
      return { ...state, showHelp: false };
```

Place these cases between `setSearchQuery` and `default`.

- [ ] **Step 4: Run tests and confirm all 12 pass**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

Expected: 12 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/state/slices/overlays.ts packages/core/src/state/__tests__/overlays.test.ts
git commit -m "feat(core): implement overlays help actions with idempotent guards"
```

---

## Task 5: Analytics visibility actions (TDD)

**Files:**
- Modify: `packages/core/src/state/slices/overlays.ts`
- Modify: `packages/core/src/state/__tests__/overlays.test.ts`

- [ ] **Step 1: Write failing tests for analytics visibility**

Append to `packages/core/src/state/__tests__/overlays.test.ts` inside `describe('overlaysReducer', () => { ... })`:

```ts
  describe('analytics visibility actions', () => {
    it('openAnalytics sets showAnalytics to true', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/openAnalytics',
      });
      expect(result.showAnalytics).toBe(true);
    });

    it('openAnalytics returns the same reference when already open', () => {
      const open = { ...initialOverlaysState, showAnalytics: true };
      const result = overlaysReducer(open, { type: 'overlays/openAnalytics' });
      expect(result).toBe(open);
    });

    it('closeAnalytics sets showAnalytics to false', () => {
      const open = { ...initialOverlaysState, showAnalytics: true };
      const result = overlaysReducer(open, { type: 'overlays/closeAnalytics' });
      expect(result.showAnalytics).toBe(false);
    });

    it('closeAnalytics returns the same reference when already closed', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/closeAnalytics',
      });
      expect(result).toBe(initialOverlaysState);
    });
  });
```

- [ ] **Step 2: Run tests and confirm 4 new failures**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

- [ ] **Step 3: Implement analytics visibility actions**

Add two new cases inside the `switch` in `packages/core/src/state/slices/overlays.ts`, between `closeHelp` and `default`:

```ts
    case 'overlays/openAnalytics':
      if (state.showAnalytics) return state;
      return { ...state, showAnalytics: true };

    case 'overlays/closeAnalytics':
      if (!state.showAnalytics) return state;
      return { ...state, showAnalytics: false };
```

- [ ] **Step 4: Run tests and confirm all 16 pass**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

Expected: 16 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/state/slices/overlays.ts packages/core/src/state/__tests__/overlays.test.ts
git commit -m "feat(core): implement overlays analytics visibility actions"
```

---

## Task 6: Context menu actions (TDD)

**Files:**
- Modify: `packages/core/src/state/slices/overlays.ts`
- Modify: `packages/core/src/state/__tests__/overlays.test.ts`

- [ ] **Step 1: Write failing tests for context menu actions**

Append to `packages/core/src/state/__tests__/overlays.test.ts` inside `describe('overlaysReducer', () => { ... })`:

```ts
  describe('context menu actions', () => {
    const sampleMenu = {
      x: 100,
      y: 200,
      nodeId: 'page-home',
      route: '/home',
      filePath: 'app/home/page.tsx',
    };

    it('showContextMenu sets the menu payload', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/showContextMenu',
        menu: sampleMenu,
      });
      expect(result.contextMenu).toEqual(sampleMenu);
    });

    it('showContextMenu replaces an existing menu', () => {
      const prior = {
        ...initialOverlaysState,
        contextMenu: { ...sampleMenu, nodeId: 'old' },
      };
      const result = overlaysReducer(prior, {
        type: 'overlays/showContextMenu',
        menu: sampleMenu,
      });
      expect(result.contextMenu).toEqual(sampleMenu);
      expect(result.contextMenu?.nodeId).toBe('page-home');
    });

    it('hideContextMenu clears the menu', () => {
      const prior = { ...initialOverlaysState, contextMenu: sampleMenu };
      const result = overlaysReducer(prior, {
        type: 'overlays/hideContextMenu',
      });
      expect(result.contextMenu).toBeNull();
    });

    it('hideContextMenu returns the same reference when already hidden', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/hideContextMenu',
      });
      expect(result).toBe(initialOverlaysState);
    });
  });
```

- [ ] **Step 2: Run tests and confirm 4 new failures**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

- [ ] **Step 3: Implement context menu actions**

Add two new cases inside the `switch` in `packages/core/src/state/slices/overlays.ts`, between `closeAnalytics` and `default`:

```ts
    case 'overlays/showContextMenu':
      return { ...state, contextMenu: action.menu };

    case 'overlays/hideContextMenu':
      if (state.contextMenu === null) return state;
      return { ...state, contextMenu: null };
```

Note: `showContextMenu` intentionally does not early-exit on an "equal" menu, because the user can right-click the same node twice to re-position the menu, and the payloads would be structurally equal but referentially distinct.

- [ ] **Step 4: Run tests and confirm all 20 pass**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

Expected: 20 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/state/slices/overlays.ts packages/core/src/state/__tests__/overlays.test.ts
git commit -m "feat(core): implement overlays context menu actions"
```

---

## Task 7: Hover preview actions (TDD)

**Files:**
- Modify: `packages/core/src/state/slices/overlays.ts`
- Modify: `packages/core/src/state/__tests__/overlays.test.ts`

- [ ] **Step 1: Write failing tests for hover preview actions**

Append to `packages/core/src/state/__tests__/overlays.test.ts` inside `describe('overlaysReducer', () => { ... })`:

```ts
  describe('hover preview actions', () => {
    const samplePreview = {
      screenshot: '/screenshots/home.png',
      label: 'Home',
      position: { x: 42, y: 84 },
    };

    it('showHoverPreview sets the preview payload', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/showHoverPreview',
        preview: samplePreview,
      });
      expect(result.hoverPreview).toEqual(samplePreview);
    });

    it('showHoverPreview accepts a preview with null position', () => {
      const preview = { ...samplePreview, position: null };
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/showHoverPreview',
        preview,
      });
      expect(result.hoverPreview?.position).toBeNull();
    });

    it('showHoverPreview accepts a preview without a screenshot', () => {
      const preview = { label: 'About', position: { x: 1, y: 2 } };
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/showHoverPreview',
        preview,
      });
      expect(result.hoverPreview?.screenshot).toBeUndefined();
      expect(result.hoverPreview?.label).toBe('About');
    });

    it('hideHoverPreview clears the preview', () => {
      const prior = { ...initialOverlaysState, hoverPreview: samplePreview };
      const result = overlaysReducer(prior, {
        type: 'overlays/hideHoverPreview',
      });
      expect(result.hoverPreview).toBeNull();
    });

    it('hideHoverPreview returns the same reference when already hidden', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/hideHoverPreview',
      });
      expect(result).toBe(initialOverlaysState);
    });
  });
```

- [ ] **Step 2: Run tests and confirm 5 new failures**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

- [ ] **Step 3: Implement hover preview actions**

Add two new cases inside the `switch` in `packages/core/src/state/slices/overlays.ts`, between `hideContextMenu` and `default`:

```ts
    case 'overlays/showHoverPreview':
      return { ...state, hoverPreview: action.preview };

    case 'overlays/hideHoverPreview':
      if (state.hoverPreview === null) return state;
      return { ...state, hoverPreview: null };
```

- [ ] **Step 4: Run tests and confirm all 25 pass**

Run: `pnpm --filter @neonwatty/nav-map test -- overlays`

Expected: 25 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/state/slices/overlays.ts packages/core/src/state/__tests__/overlays.test.ts
git commit -m "feat(core): implement overlays hover preview actions"
```

---

## Task 8: Root reducer + types module

**Files:**
- Create: `packages/core/src/state/types.ts`
- Create: `packages/core/src/state/reducer.ts`
- Create: `packages/core/src/state/__tests__/reducer.test.ts`

- [ ] **Step 1: Create the types module**

Write to `packages/core/src/state/types.ts`:

```ts
import type { OverlaysState, OverlaysAction } from './slices/overlays';

export type RootState = {
  overlays: OverlaysState;
};

/**
 * Action is a discriminated union of all slice action types. It will grow
 * as additional slices (flow, display, groups, view, graph, analytics) are
 * migrated in subsequent PRs. Slice reducers pattern-match on `action.type`
 * and must return state unchanged for actions they don't own.
 */
export type Action = OverlaysAction;
```

- [ ] **Step 2: Create the root reducer module**

Write to `packages/core/src/state/reducer.ts`:

```ts
import { initialOverlaysState, overlaysReducer } from './slices/overlays';
import type { Action, RootState } from './types';

export const initialRootState: RootState = {
  overlays: initialOverlaysState,
};

export function rootReducer(state: RootState, action: Action): RootState {
  const overlays = overlaysReducer(state.overlays, action);
  if (overlays === state.overlays) return state;
  return { ...state, overlays };
}
```

Note: the root reducer returns the same `state` reference if the overlays slice didn't change. This is the root-level analog of the slice-level idempotent guards, and it matters because React bails out of re-rendering when `useReducer` returns the same state reference.

- [ ] **Step 3: Write tests for the root reducer**

Write to `packages/core/src/state/__tests__/reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialRootState, rootReducer } from '../reducer';
import type { Action } from '../types';

describe('rootReducer', () => {
  it('routes overlays actions to the overlays slice', () => {
    const result = rootReducer(initialRootState, {
      type: 'overlays/openSearch',
    });
    expect(result.overlays.showSearch).toBe(true);
  });

  it('returns the same root reference when no slice changed', () => {
    const unknown = { type: 'unknown/action' } as unknown as Action;
    const result = rootReducer(initialRootState, unknown);
    expect(result).toBe(initialRootState);
  });

  it('returns a new root reference when the overlays slice changed', () => {
    const result = rootReducer(initialRootState, {
      type: 'overlays/openSearch',
    });
    expect(result).not.toBe(initialRootState);
  });

  it('leaves unchanged slices referentially equal (structural sharing)', () => {
    const result = rootReducer(initialRootState, {
      type: 'overlays/openSearch',
    });
    expect(result.overlays).not.toBe(initialRootState.overlays);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @neonwatty/nav-map test -- state`

Expected: PASS for both `overlays.test.ts` (25 tests) and `reducer.test.ts` (4 tests) — 29 total.

- [ ] **Step 5: Run a typecheck to verify the full state module compiles**

Run: `pnpm --filter @neonwatty/nav-map typecheck`

Expected: PASS. If it fails on `OverlaysAction` not being assignable to `Action`, verify that `state/types.ts` exports `Action = OverlaysAction` (not `Action extends OverlaysAction`, which would be an error).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/state/types.ts packages/core/src/state/reducer.ts packages/core/src/state/__tests__/reducer.test.ts
git commit -m "feat(core): add root reducer with overlays slice wiring"
```

---

## Task 9: Wire the reducer into NavMap.tsx

This task replaces the six overlay `useState` calls in `NavMap.tsx` with a single `useReducer` call and the `useOverlaysActions` hook. It is the task with the most call-site edits, so it is broken into small steps.

**Files:**
- Modify: `packages/core/src/components/NavMap.tsx`

- [ ] **Step 1: Read the current overlay-related usage sites**

Before editing, scan `NavMap.tsx` for every reference to the six overlay states so no call site is missed. Run:

```bash
grep -n -E "showHelp|setShowHelp|showSearch|setShowSearch|searchQuery|setSearchQuery|showAnalytics|setShowAnalytics|contextMenu|setContextMenu|hoverPreview|setHoverPreview" packages/core/src/components/NavMap.tsx
```

Record the line numbers. Expect hits in three regions:
- **Lines 120-142** — the `useState` declarations being removed
- **Lines 151-167** — `guardedSetShowSearch` / `guardedSetShowHelp` wrapper callbacks
- **Lines ~649-879** — JSX and handler reads/writes

If the grep returns more than ~30 lines, that's normal — the JSX reads most of these values.

- [ ] **Step 2: Add the imports**

Edit `packages/core/src/components/NavMap.tsx`. Near the top of the import block (around line 20, next to the `types` import), add:

```ts
import { rootReducer, initialRootState } from '../state/reducer';
import { useOverlaysActions } from '../state/slices/overlays';
```

Change the existing `useState` import line to also import `useReducer`:

```ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
```

- [ ] **Step 3: Replace the six `useState` calls with a single `useReducer` call**

Find lines 120-142 in `NavMap.tsx` — they currently contain:

```ts
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ /* ... */ } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  // ... then collapsedGroups, hierarchyExpandedGroups, analyticsData, analyticsPeriod ...
  const [hoverPreview, setHoverPreview] = useState<{ /* ... */ } | null>(null);
```

Replace the six overlay-related lines (`showHelp`, `showSearch`, `searchQuery`, `contextMenu`, `showAnalytics`, `hoverPreview`) with:

```ts
  const [state, dispatch] = useReducer(rootReducer, initialRootState);
  const overlays = useOverlaysActions(dispatch);
  const { showHelp, showSearch, searchQuery, showAnalytics, contextMenu, hoverPreview } =
    state.overlays;
```

Leave `collapsedGroups`, `hierarchyExpandedGroups`, `analyticsData`, and `analyticsPeriod` as plain `useState` for now — those belong to other slices that get migrated in later PRs.

The destructured local bindings (`showHelp`, `showSearch`, etc.) preserve the existing read sites without edits — this is the trick that keeps the JSX diff small.

- [ ] **Step 4: Replace writer call sites**

For each writer, the mechanical replacement is:

| Old call | New call |
|---|---|
| `setShowSearch(true)` | `overlays.openSearch()` |
| `setShowSearch(false)` | `overlays.closeSearch()` |
| `setShowHelp(true)` | `overlays.openHelp()` |
| `setShowHelp(false)` | `overlays.closeHelp()` |
| `setShowAnalytics(true)` | `overlays.openAnalytics()` |
| `setShowAnalytics(false)` | `overlays.closeAnalytics()` |
| `setShowAnalytics(v => !v)` | `overlays.openAnalytics()` or `overlays.closeAnalytics()` based on current `showAnalytics` value |
| `setSearchQuery('...')` | `overlays.setSearchQuery('...')` |
| `setContextMenu({ x, y, nodeId, route, filePath })` | `overlays.showContextMenu({ x, y, nodeId, route, filePath })` |
| `setContextMenu(null)` | `overlays.hideContextMenu()` |
| `setHoverPreview({ ... })` | `overlays.showHoverPreview({ ... })` |
| `setHoverPreview(null)` | `overlays.hideHoverPreview()` |

Walk every call site surfaced by the grep in Step 1. **Edge case:** if you find a `setShowAnalytics(prev => !prev)` style callback, replace it with a conditional:

```ts
if (showAnalytics) overlays.closeAnalytics();
else overlays.openAnalytics();
```

This preserves the toggle semantics against the destructured `showAnalytics` local.

- [ ] **Step 5: Update `guardedSetShowSearch` and `guardedSetShowHelp`**

Lines 151-165 currently contain:

```ts
const guardedSetShowSearch = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    if (hideSearch) return;
    setShowSearch(v);
  },
  [hideSearch]
);

const guardedSetShowHelp = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    if (hideHelp) return;
    setShowHelp(v);
  },
  [hideHelp]
);
```

Both accept either a boolean or a functional updater (e.g., `guardedSetShowSearch(v => !v)`). The reducer actions are open/close, not toggle, so we need to resolve the functional updater against the current value before dispatching.

Replace with:

```ts
const guardedSetShowSearch = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    if (hideSearch) return;
    const next = typeof v === 'function' ? v(showSearch) : v;
    if (next) overlays.openSearch();
    else overlays.closeSearch();
  },
  [hideSearch, overlays, showSearch]
);

const guardedSetShowHelp = useCallback(
  (v: boolean | ((p: boolean) => boolean)) => {
    if (hideHelp) return;
    const next = typeof v === 'function' ? v(showHelp) : v;
    if (next) overlays.openHelp();
    else overlays.closeHelp();
  },
  [hideHelp, overlays, showHelp]
);
```

Notes:
- `overlays` is memoized on `dispatch` (which is React-stable), so including it in the dependency array is safe and satisfies the exhaustive-deps lint rule.
- `showSearch` / `showHelp` are the destructured locals from Step 3. The callback will recreate when they change, which is fine — toggle callbacks are lightweight.
- Functional updater support is preserved. Existing call sites like `guardedSetShowSearch(v => !v)` continue to work unchanged.

- [ ] **Step 6: Run the typecheck**

Run: `pnpm --filter @neonwatty/nav-map typecheck`

Expected: PASS. If it fails, the most likely causes are:
- A call site that was missed — the compiler will point to the offending line.
- A `setShowX`-style callback passed as a prop to a child component. Child components that accept a setter need either (a) the prop replaced with a named callback like `onSearchOpen` / `onSearchClose`, or (b) wrapping in a local arrow function. Prefer (b) to keep this PR's diff narrow; (a) is a better refactor for a later PR.

- [ ] **Step 7: Run the existing NavMap integration test**

Run: `pnpm --filter @neonwatty/nav-map test -- NavMap`

Expected: PASS — `NavMap.test.tsx` must run green with zero edits to the test file itself. If any assertions fail, the refactor has introduced a behavior regression; investigate before proceeding.

- [ ] **Step 8: Run the full test suite for the core package**

Run: `pnpm --filter @neonwatty/nav-map test`

Expected: PASS for all tests (87 existing + 29 new state tests = 116 total, give or take).

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/components/NavMap.tsx
git commit -m "refactor(core): migrate NavMap overlay state to reducer slice"
```

---

## Task 10: Full validation pass

**Files:** none modified unless validation surfaces issues.

- [ ] **Step 1: Run lint**

Run: `pnpm lint`

Expected: PASS (warnings from existing `no-console` rules are pre-existing and unrelated to this PR; new files should be clean). If new warnings appear, fix them inline — likely candidates are unused imports or `any` types.

- [ ] **Step 2: Run typecheck across all packages**

Run: `pnpm typecheck`

Expected: PASS for all 4 workspace packages (core, scanner, site, demo).

- [ ] **Step 3: Run format check**

Run: `pnpm format:check`

Expected: PASS. If it fails, run `pnpm format` to apply formatting, then re-add the modified files and amend the most recent commit (or make a `style:` commit).

- [ ] **Step 4: Run knip**

Run: `pnpm knip:production`

Expected: PASS with no new unused-exports warnings. The new `state/` module is imported from `NavMap.tsx`, so knip should trace it correctly. If knip reports `state/types.ts` or `state/reducer.ts` as unused, verify that `NavMap.tsx` imports them.

- [ ] **Step 5: Run the full build**

Run: `pnpm build:core`

Expected: PASS. The build produces `packages/core/dist/`.

- [ ] **Step 6: Run the demo app against the new build to sanity-check rendering**

Run: `pnpm dev` (starts the demo)

Visit `http://localhost:3000` (or whatever port the demo uses). Manually verify:
- [ ] Search opens with `Cmd+K` and closes with `Escape`
- [ ] Help opens with `?` and closes with `Escape`
- [ ] Right-click a node → context menu appears at the cursor
- [ ] Hover a node → preview appears
- [ ] Analytics panel opens and closes (if there's a toolbar button for it)

If any interaction is broken, that's a regression in the reducer wiring — investigate before marking the PR ready.

- [ ] **Step 7: Commit any fixes from validation**

If Steps 1-6 surfaced any issues, fix them with small follow-up commits (one per concern). Do not squash back into Task 9's commit — keeping the fixes separate makes it easier to review where edge cases surfaced.

---

## Success Criteria (PR 1)

Check these before opening the PR:

- [ ] `packages/core/src/components/NavMap.tsx` no longer has `useState` calls for `showHelp`, `showSearch`, `searchQuery`, `showAnalytics`, `contextMenu`, `hoverPreview` (verify via `grep`).
- [ ] `packages/core/src/state/` contains 5 files (`types.ts`, `reducer.ts`, `slices/overlays.ts`, `__tests__/overlays.test.ts`, `__tests__/reducer.test.ts`).
- [ ] `pnpm --filter @neonwatty/nav-map test` reports ~116 passing tests with zero failures.
- [ ] `NavMap.test.tsx` is byte-identical to its state on `main`.
- [ ] `pnpm validate` passes end-to-end.
- [ ] Manual demo smoke test shows search, help, context menu, hover preview, and analytics behave identically to before.
- [ ] `/* eslint-disable max-lines */` is still present at the top of `NavMap.tsx` — **this is expected**. It comes off in PR 5, not here.

---

## Pilot Checkpoint (after merging PR 1)

Before starting PR 2, answer these questions:

1. Did the slice shape feel right in practice, or did any action need an awkward payload?
2. Did the idempotent-guard pattern (`if (state.x) return state;`) prevent any actual re-render regressions, or was it paranoia?
3. Did `useOverlaysActions` produce stable-enough references for downstream hooks, or did anything need to be memoized further?
4. Was the "destructure locals from `state.overlays`" trick a win for diff size, or a liability for readability?

If any answer is a red flag, revisit the spec at `docs/superpowers/specs/2026-04-11-navmap-refactor-design.md` before drafting the PR 2 plan. A small course-correction now is much cheaper than in PR 3.

---

## Out of scope for this PR

- Migrating any other slice (flow, display, groups, view, graph, analytics)
- Extracting effects into `effects/` hooks
- Removing the `eslint-disable max-lines` pragma
- Removing the three `handleGroup*Ref` pairs (those live in the `groups` slice, migrated in PR 3)
- Any user-visible change — props, JSX output, keybindings, and behavior stay identical
