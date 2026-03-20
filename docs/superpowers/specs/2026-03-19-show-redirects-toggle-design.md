# Show Redirects Toggle

Add a toolbar toggle to show/hide redirect edges. Off by default to reduce visual noise.

## Interaction

- New toolbar button **"Show Redirects"** next to "Show Shared Nav"
- Default: **off** (redirect edges hidden)
- Keyboard shortcut: **R**
- When off: edges with type `redirect` get opacity 0 and pointerEvents none
- When on: redirect edges render normally
- Selecting a node in focus mode still reveals connected redirect edges (existing behavior via `useGraphStyling` selection logic)

## Implementation

### State

New boolean in `NavMapInner`:

```ts
const [showRedirects, setShowRedirects] = useState(false);
```

### useGraphStyling.ts

Add `showRedirects: boolean` to `GraphStylingDeps`. In the `styledEdges` useMemo, before any other styling logic, filter out redirect edges when `showRedirects` is false:

```ts
const filteredEdges = showRedirects
  ? visibleEdges
  : visibleEdges.filter(e => {
      const edgeType = (e.data as Record<string, unknown>)?.edgeType ?? e.type;
      return edgeType !== 'redirect';
    });
```

Then use `filteredEdges` instead of `visibleEdges` throughout the rest of the memo.

### NavMapToolbar.tsx

Add `showRedirects` and `onToggleRedirects` props. Render a button matching the style of "Show Shared Nav":

```tsx
<button onClick={onToggleRedirects} style={btnStyle(isDark, showRedirects)}>
  Show Redirects
</button>
```

### useKeyboardNav.ts

Add "R" case that toggles `showRedirects`.

### NavMap.tsx

- Add `showRedirects` state
- Pass to `useGraphStyling` and `NavMapToolbar`
- Pass `setShowRedirects` to `useKeyboardNav`

### Files modified

- `packages/core/src/components/NavMap.tsx`
- `packages/core/src/hooks/useGraphStyling.ts`
- `packages/core/src/components/panels/NavMapToolbar.tsx`
- `packages/core/src/hooks/useKeyboardNav.ts`
