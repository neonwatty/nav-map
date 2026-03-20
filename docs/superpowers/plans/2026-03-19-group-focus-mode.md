# Group Focus Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Double-click a group header to zoom in and dim all other groups, creating a visual "focus" on that group.

**Architecture:** Add `focusedGroupId` state to `NavMapInner`, expose it via `NavMapContext`. GroupNode gets a debounced click/double-click handler. `useGraphStyling` applies opacity dimming to nodes and edges outside the focused group. Toolbar shows an indicator when focused.

**Tech Stack:** React, @xyflow/react, TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/core/src/hooks/useNavMap.ts` | Modify | Add `focusedGroupId` to context type |
| `packages/core/src/components/nodes/GroupNode.tsx` | Modify | Debounce click, add double-click handler |
| `packages/core/src/hooks/useGraphStyling.ts` | Modify | Apply group-based opacity to nodes and edges |
| `packages/core/src/components/NavMap.tsx` | Modify | Wire up focusedGroupId state, toolbar indicator, exit handlers |
| `packages/core/src/hooks/useKeyboardNav.ts` | Modify | Escape clears focusedGroupId |

---

## Chunk 1: Context and GroupNode

### Task 1: Add focusedGroupId to NavMapContext

**Files:**
- Modify: `packages/core/src/hooks/useNavMap.ts:5-12` (NavMapContextValue interface)
- Modify: `packages/core/src/hooks/useNavMap.ts:14-21` (defaultContext)

- [ ] **Step 1: Add focusedGroupId to the context interface**

In `packages/core/src/hooks/useNavMap.ts`, add to `NavMapContextValue`:

```ts
export interface NavMapContextValue {
  graph: NavMapGraph | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  isDark: boolean;
  screenshotBasePath: string;
  getGroupColors: (groupId: string) => GroupColors;
  focusedGroupId: string | null;
}
```

Update `defaultContext`:

```ts
const defaultContext: NavMapContextValue = {
  graph: null,
  selectedNodeId: null,
  setSelectedNodeId: () => {},
  isDark: true,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#1e1e2a', border: '#888', text: '#aaa' }),
  focusedGroupId: null,
};
```

Note: `useNavMapState` does NOT manage `focusedGroupId` — it will be passed in by `NavMapInner` when constructing the context value. `useNavMapState` return type no longer matches `NavMapContextValue` exactly; `NavMapInner` will spread it and add `focusedGroupId`.

- [ ] **Step 2: Verify build passes**

Run: `pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds (TypeScript will warn in NavMap.tsx about missing `focusedGroupId` in the context value — that's expected and will be fixed in Task 4).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/hooks/useNavMap.ts
git commit -m "feat: add focusedGroupId to NavMapContext type"
```

---

### Task 2: Add debounced click and double-click to GroupNode

**Files:**
- Modify: `packages/core/src/components/nodes/GroupNode.tsx`

The core challenge: single-click currently calls `handleToggle` immediately. We need to delay it ~250ms so we can detect double-clicks. On double-click, cancel the pending toggle and fire `onDoubleClick` instead.

- [ ] **Step 1: Add onDoubleClick to GroupNodeData interface**

```ts
export interface GroupNodeData {
  label: string;
  groupId: string;
  childCount: number;
  collapsed: boolean;
  onToggle?: (groupId: string, collapsed: boolean) => void;
  onDoubleClick?: (groupId: string) => void;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Replace click handler with debounced click + double-click**

Replace the entire `GroupNodeComponent` function body. Key changes:
- Add a `useRef` for the click timer
- Add a `useEffect` cleanup to clear timer on unmount
- `handleClick`: sets a 250ms timeout that calls the old `handleToggle`. Stores the timeout ID in the ref. Both the visual state (`setIsCollapsed`) and the parent callback (`onToggle`) are delayed.
- `handleDoubleClick`: clears the timeout ref, calls `e.stopPropagation()` (prevents React Flow's `onNodeDoubleClick` from firing for the gallery viewer), calls `nodeData.onDoubleClick?.(nodeData.groupId)`.
- The header div gets both `onClick={handleClick}` and `onDoubleClick={handleDoubleClick}`.

```tsx
import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useNavMapContext } from '../../hooks/useNavMap';

export interface GroupNodeData {
  label: string;
  groupId: string;
  childCount: number;
  collapsed: boolean;
  onToggle?: (groupId: string, collapsed: boolean) => void;
  onDoubleClick?: (groupId: string) => void;
  [key: string]: unknown;
}

function GroupNodeComponent({ data, width, height }: NodeProps) {
  const nodeData = data as unknown as GroupNodeData;
  const { isDark, getGroupColors } = useNavMapContext();
  const colors = getGroupColors(nodeData.groupId);
  const [isCollapsed, setIsCollapsed] = useState(nodeData.collapsed ?? false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    // Delay toggle to distinguish from double-click
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      const next = !isCollapsed;
      setIsCollapsed(next);
      nodeData.onToggle?.(nodeData.groupId, next);
    }, 250);
  }, [isCollapsed, nodeData]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      nodeData.onDoubleClick?.(nodeData.groupId);
    },
    [nodeData]
  );

  // ... rest of JSX unchanged, but header div gets:
  // onClick={handleClick} onDoubleClick={handleDoubleClick}
```

Update the header div (line 38-49) to use both handlers:

```tsx
<div
  onClick={handleClick}
  onDoubleClick={handleDoubleClick}
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    background: colors.border,
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    userSelect: 'none',
  }}
>
```

- [ ] **Step 3: Verify build passes**

Run: `pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds. No runtime changes yet (onDoubleClick is not wired up).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/nodes/GroupNode.tsx
git commit -m "feat: debounce group header click, add double-click handler"
```

---

## Chunk 2: Graph Styling and Node Dimming

### Task 3: Add group focus dimming to useGraphStyling

**Design note:** The spec mentions modifying PageNode.tsx and CompactNode.tsx to read `focusedGroupId` from context and apply dimming. Instead, this plan handles all node dimming centrally in `useGraphStyling` (which already manages opacity for flow highlighting and selection dimming). This is the better approach — single source of truth for all dimming logic. The `pointerEvents: 'none'` requirement from the spec is also handled here. PageNode and CompactNode do not need changes.

**Files:**
- Modify: `packages/core/src/hooks/useGraphStyling.ts:4-14` (GraphStylingDeps interface)
- Modify: `packages/core/src/hooks/useGraphStyling.ts:91-125` (styledNodes useMemo)
- Modify: `packages/core/src/hooks/useGraphStyling.ts:127-176` (styledEdges useMemo)

- [ ] **Step 1: Add focusedGroupId and nodeGroupMap to deps**

Update `GraphStylingDeps`:

```ts
interface GraphStylingDeps {
  nodes: Node[];
  edges: Edge[];
  zoomedNodes: Node[];
  collapsedGroups: Set<string>;
  selectedNodeId: string | null;
  focusMode: boolean;
  viewMode: ViewMode;
  activeFlow: NavMapFlow | null;
  focusedGroupId: string | null;
  nodeGroupMap: Map<string, string>;
}
```

Add destructuring for the new fields:

```ts
const {
  nodes, edges, zoomedNodes, collapsedGroups,
  selectedNodeId, focusMode, viewMode, activeFlow,
  focusedGroupId, nodeGroupMap,
} = deps;
```

- [ ] **Step 2: Apply group focus dimming to styledNodes**

In the `styledNodes` useMemo, add a group focus check **before** the existing flow/selection dimming. The precedence rule: flow highlighting wins, then group focus, then selection dimming.

Insert at the top of the `styledNodes` useMemo (after the existing flow check on lines 93-107), before the `selectedNodeId` check:

```ts
const styledNodes = useMemo(() => {
  // Flow highlighting takes precedence
  if (viewMode === 'map' && activeFlow) {
    // ... existing flow logic unchanged ...
  }

  // Group focus dimming (only when no flow is selected)
  if (focusedGroupId) {
    return visibleNodes.map(node => {
      if (node.type === 'groupNode') {
        const groupId = (node.data as Record<string, unknown>).groupId as string;
        const isFocused = groupId === focusedGroupId;
        return {
          ...node,
          style: {
            ...node.style,
            opacity: isFocused ? 1 : 0.15,
            transition: 'opacity 300ms ease',
          },
        };
      }
      const nodeGroup = (node.data as Record<string, unknown>).group as string | undefined;
      const isFocused = nodeGroup === focusedGroupId;
      return {
        ...node,
        style: {
          ...node.style,
          opacity: isFocused ? 1 : 0.15,
          pointerEvents: (isFocused ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
          transition: 'opacity 300ms ease',
        },
      };
    });
  }

  // ... existing selectedNodeId logic unchanged ...
}, [visibleNodes, visibleEdges, selectedNodeId, viewMode, activeFlow, focusedGroupId]);
```

- [ ] **Step 3: Apply group focus dimming to styledEdges**

Similarly, in the `styledEdges` useMemo, add after the existing flow check (lines 128-146), before the focusMode check:

```ts
const styledEdges = useMemo(() => {
  // Flow edge highlighting takes precedence
  if (viewMode === 'map' && activeFlow) {
    // ... existing flow logic unchanged ...
  }

  // Group focus edge dimming
  if (focusedGroupId) {
    return visibleEdges.map(edge => {
      const sourceGroup = nodeGroupMap.get(edge.source);
      const targetGroup = nodeGroupMap.get(edge.target);
      const sourceIn = sourceGroup === focusedGroupId;
      const targetIn = targetGroup === focusedGroupId;
      let opacity = 0;
      if (sourceIn && targetIn) opacity = 1;
      else if (sourceIn || targetIn) opacity = 0.15;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity,
          pointerEvents: (opacity > 0 ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
          transition: 'opacity 300ms ease',
        },
      };
    });
  }

  // ... existing focusMode and selectedNodeId logic unchanged ...
}, [visibleEdges, selectedNodeId, focusMode, viewMode, activeFlow, focusedGroupId, nodeGroupMap]);
```

- [ ] **Step 4: Verify build passes**

Run: `pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds. NavMap.tsx will need updating to pass the new deps (next task).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/hooks/useGraphStyling.ts
git commit -m "feat: add group focus dimming to useGraphStyling"
```

---

## Chunk 3: Wire Everything Up in NavMap

### Task 4: Add focusedGroupId state and wire up NavMap

**Files:**
- Modify: `packages/core/src/components/NavMap.tsx`

This is the main wiring task. Several changes in one file.

- [ ] **Step 1: Add focusedGroupId state**

After `galleryNodeId` state (line 112):

```ts
const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
```

- [ ] **Step 2: Build nodeGroupMap**

After the `galleryNodeIds` useMemo block, add:

```ts
const nodeGroupMap = useMemo(() => {
  const map = new Map<string, string>();
  for (const node of graph?.nodes ?? []) {
    map.set(node.id, node.group);
  }
  return map;
}, [graph]);
```

- [ ] **Step 3: Pass focusedGroupId into context value**

The context is currently created by `useNavMapState` (line 145) and passed directly to `NavMapContext.Provider` (line 502). We need to add `focusedGroupId`. Change the provider value:

```tsx
<NavMapContext.Provider value={{ ...ctx, focusedGroupId }}>
```

- [ ] **Step 4: Pass new deps to useGraphStyling**

Update the `useGraphStyling` call (lines 477-486) to include the new fields:

```ts
const { styledNodes, styledEdges } = useGraphStyling({
  nodes,
  edges,
  zoomedNodes,
  collapsedGroups,
  selectedNodeId: ctx.selectedNodeId,
  focusMode,
  viewMode,
  activeFlow,
  focusedGroupId,
  nodeGroupMap,
});
```

- [ ] **Step 5: Create handleGroupDoubleClick callback**

After `handleGroupToggle` (around line 132-141), add:

```ts
const handleGroupDoubleClick = useCallback(
  (groupId: string) => {
    setFocusedGroupId(prev => (prev === groupId ? null : groupId));
  },
  []
);
const handleGroupDoubleClickRef = useRef(handleGroupDoubleClick);
handleGroupDoubleClickRef.current = handleGroupDoubleClick;
```

- [ ] **Step 6: Pass onDoubleClick to group nodes during layout**

There are **two** places where `onToggle` is injected into group nodes. Both must be updated:

**Site 1** — initial layout (line 189):
```ts
// Around line 186-191
for (const node of rfNodes) {
  if (node.type === 'groupNode') {
    (node.data as Record<string, unknown>).onToggle = handleGroupToggleRef.current;
    (node.data as Record<string, unknown>).onDoubleClick = handleGroupDoubleClickRef.current;
  }
}
```

**Site 2** — re-layout on view mode change (line 339):
```ts
// Around line 337-341
for (const node of rfNodes) {
  if (node.type === 'groupNode') {
    (node.data as Record<string, unknown>).onToggle = handleGroupToggleRef.current;
    (node.data as Record<string, unknown>).onDoubleClick = handleGroupDoubleClickRef.current;
  }
}
```

**Important:** If you miss one site, switching between view modes will produce group nodes without the double-click handler.

- [ ] **Step 7: Add fitView on focus change**

Add a `useEffect` after the `focusedGroupId` state. Use a ref to track the previous value so `fitView` only fires when `focusedGroupId` actually changes (not when `nodes` array reference changes):

```ts
const prevFocusedGroupRef = useRef<string | null>(null);
useEffect(() => {
  if (focusedGroupId === prevFocusedGroupRef.current) return;
  prevFocusedGroupRef.current = focusedGroupId;
  if (!focusedGroupId) return;
  const focusedNodes = nodes
    .filter(n => {
      if (n.type === 'groupNode') {
        return (n.data as Record<string, unknown>).groupId === focusedGroupId;
      }
      return (n.data as Record<string, unknown>).group === focusedGroupId;
    })
    .map(n => ({ id: n.id }));
  if (focusedNodes.length > 0) {
    fitView({ nodes: focusedNodes, padding: 0.3, duration: 300 });
  }
}, [focusedGroupId, nodes, fitView]);
```

- [ ] **Step 8: Clear focusedGroupId on flow selection**

In the `onFlowSelect` handler (line 534), clear group focus:

```ts
onFlowSelect={idx => {
  setSelectedFlowIndex(idx);
  setFocusedGroupId(null);
}}
```

- [ ] **Step 9: Clear focusedGroupId on Reset View**

Update `onResetView` (line 535):

```ts
onResetView={() => {
  setFocusedGroupId(null);
  fitView({ padding: 0.15, duration: 300 });
}}
```

- [ ] **Step 10: Clear focusedGroupId when focused group is collapsed**

In `handleGroupToggle`, check if the collapsed group is the focused one:

```ts
const handleGroupToggle = useCallback((groupId: string, collapsed: boolean) => {
  setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (collapsed) next.add(groupId);
    else next.delete(groupId);
    return next;
  });
  if (collapsed) {
    setFocusedGroupId(prev => (prev === groupId ? null : prev));
  }
}, []);
```

- [ ] **Step 11: Add toolbar indicator for group focus**

After the existing flow/tree mode banners (around line 606), add:

```tsx
{focusedGroupId && (
  <div
    style={{
      position: 'absolute',
      top: 50,
      left: '50%',
      transform: 'translateX(-50%)',
      background: ctx.isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
      border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
      borderRadius: 8,
      padding: '6px 16px',
      zIndex: 20,
      fontSize: 13,
      fontWeight: 600,
      color: ctx.isDark ? '#7aacff' : '#3355aa',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}
  >
    Focused: {graph?.groups?.find(g => g.id === focusedGroupId)?.label ?? focusedGroupId}
    <button
      onClick={() => setFocusedGroupId(null)}
      style={{
        background: 'none',
        border: 'none',
        color: ctx.isDark ? '#555' : '#aaa',
        cursor: 'pointer',
        fontSize: 14,
        padding: 0,
        lineHeight: 1,
      }}
    >
      &#x2715;
    </button>
  </div>
)}
```

- [ ] **Step 12: Verify build and lint pass**

Run: `pnpm --filter @neonwatty/nav-map build && pnpm --filter @neonwatty/nav-map lint`
Expected: Both pass.

- [ ] **Step 13: Commit**

```bash
git add packages/core/src/components/NavMap.tsx
git commit -m "feat: wire up group focus state, fitView, toolbar indicator, exit handlers"
```

---

### Task 5: Add Escape key to clear group focus

**Files:**
- Modify: `packages/core/src/hooks/useKeyboardNav.ts`

- [ ] **Step 1: Add focusedGroupId and setter to hook params**

The hook needs to receive `focusedGroupId` and `setFocusedGroupId`. Add them to the hook's parameter interface. Check the existing interface at the top of the file and add:

```ts
focusedGroupId: string | null;
setFocusedGroupId: (id: string | null) => void;
```

- [ ] **Step 2: Update Escape handler**

In the `case 'Escape'` block (line 93-100), add group focus clearing as the first check:

```ts
case 'Escape':
  if (showSearch) setShowSearch(false);
  else if (showHelp) setShowHelp(false);
  else if (focusedGroupId) setFocusedGroupId(null);
  else {
    ctx.setSelectedNodeId(null);
    walkthrough.clear();
  }
  break;
```

- [ ] **Step 3: Pass the new params from NavMap.tsx**

In `NavMap.tsx` where `useKeyboardNav` is called (around line 421-439), add:

```ts
focusedGroupId,
setFocusedGroupId,
```

- [ ] **Step 4: Verify build and lint pass**

Run: `pnpm --filter @neonwatty/nav-map build && pnpm --filter @neonwatty/nav-map lint`
Expected: Both pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/hooks/useKeyboardNav.ts packages/core/src/components/NavMap.tsx
git commit -m "feat: Escape key clears group focus"
```

---

## Chunk 4: Build, Test, Verify

### Task 6: Full build and demo verification

- [ ] **Step 1: Full build**

Run: `pnpm --filter @neonwatty/nav-map build && pnpm --filter demo build`
Expected: Both succeed.

- [ ] **Step 2: Lint**

Run: `pnpm --filter @neonwatty/nav-map lint`
Expected: Clean.

- [ ] **Step 3: Manual testing in browser**

Start dev server: `pnpm --filter demo dev`

Test each scenario:
1. Single-click a group header → collapses/expands (with ~250ms delay)
2. Double-click a group header → other groups dim, viewport zooms to focused group, toolbar shows "Focused: {name} x"
3. Double-click same header again → exits focus, all groups return to full opacity
4. Press Escape while focused → exits focus
5. Click Reset View while focused → exits focus
6. Select a flow while focused → exits focus
7. Collapse the focused group → exits focus
8. Double-click a node with gallery data → gallery viewer opens (not broken by GroupNode changes)

- [ ] **Step 4: Final commit if any lint fixes needed**

```bash
git add -A
git commit -m "style: fix lint issues from group focus implementation"
```
