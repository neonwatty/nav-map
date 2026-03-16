# Tier 1: Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three small changes that dramatically improve graph readability: left-to-right layout, always-visible screenshots, and edges-on-demand (focus mode).

**Architecture:** Change the default ELK direction, lower the semantic zoom threshold, and add a `focusMode` toggle that hides edges until a node is selected.

**Tech Stack:** React, @xyflow/react, elkjs

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `packages/core/src/layout/elkLayout.ts` | ELK layout default direction | Modify (1 line) |
| `packages/core/src/hooks/useSemanticZoom.ts` | Zoom threshold for screenshot visibility | Modify (1 line) |
| `packages/core/src/components/NavMap.tsx` | Focus mode state, edge visibility, toolbar button | Modify |

---

## Task 1: Switch default layout direction to LEFT-TO-RIGHT

**Files:**
- Modify: `packages/core/src/layout/elkLayout.ts:33`

- [ ] **Step 1: Change the default direction**

In `elkLayout.ts` line 33, change:
```typescript
    direction = 'DOWN',
```
To:
```typescript
    direction = 'RIGHT',
```

- [ ] **Step 2: Build to verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds.

- [ ] **Step 3: Start demo and verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`
Open http://localhost:3000. Verify: groups arranged left-to-right instead of top-to-bottom. The graph should fit within the viewport width better.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/layout/elkLayout.ts
git commit -m "feat: switch default layout direction to left-to-right"
```

---

## Task 2: Lower semantic zoom threshold to always show screenshots

**Files:**
- Modify: `packages/core/src/hooks/useSemanticZoom.ts:4`

- [ ] **Step 1: Lower the zoom threshold**

In `useSemanticZoom.ts` line 4, change:
```typescript
const ZOOM_THRESHOLD = 0.5;
```
To:
```typescript
const ZOOM_THRESHOLD = 0.15;
```

This means screenshots (PageNode) are visible until the user zooms out to 15% — effectively always visible at normal viewing levels. CompactNode only appears at extreme zoom-out.

- [ ] **Step 2: Build to verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds.

- [ ] **Step 3: Start demo and verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`
Open http://localhost:3000. Verify: nodes show screenshot thumbnails at the default fit-to-view zoom level. Only extreme zoom-out switches to compact.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/hooks/useSemanticZoom.ts
git commit -m "feat: lower semantic zoom threshold to show screenshots by default"
```

---

## Task 3: Add focus mode — edges hidden until node selected

**Files:**
- Modify: `packages/core/src/components/NavMap.tsx`

This is the most impactful change. In focus mode, all edges are hidden when no node is selected. When a node is selected, only its connected edges appear (the current dimming behavior, but non-connected edges are fully hidden instead of 15% opacity).

- [ ] **Step 1: Add `focusMode` state**

After the existing `showSharedNav` state declaration (~line 103), add:
```typescript
const [focusMode, setFocusMode] = useState(true); // default ON
```

- [ ] **Step 2: Update `styledEdges` memo to hide edges in focus mode**

Find the `styledEdges` memo (~line 457). Change from:
```typescript
  const styledEdges = useMemo(() => {
    if (!ctx.selectedNodeId) return visibleEdges;

    return visibleEdges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity:
          edge.source === ctx.selectedNodeId || edge.target === ctx.selectedNodeId
            ? 1
            : 0.15,
        transition: 'opacity 0.2s',
      },
    }));
  }, [visibleEdges, ctx.selectedNodeId]);
```

To:
```typescript
  const styledEdges = useMemo(() => {
    // Focus mode: hide all edges when nothing is selected
    if (focusMode && !ctx.selectedNodeId) {
      return visibleEdges.map(edge => ({
        ...edge,
        style: { ...edge.style, opacity: 0, pointerEvents: 'none' as const, transition: 'opacity 0.2s' },
      }));
    }

    if (!ctx.selectedNodeId) return visibleEdges;

    return visibleEdges.map(edge => {
      const isConnected = edge.source === ctx.selectedNodeId || edge.target === ctx.selectedNodeId;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isConnected ? 1 : (focusMode ? 0 : 0.15),
          pointerEvents: (isConnected || !focusMode ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
          transition: 'opacity 0.2s',
        },
      };
    });
  }, [visibleEdges, ctx.selectedNodeId, focusMode]);
```

- [ ] **Step 3: Add focus mode toggle button to toolbar**

Find the toolbar section (~line 498). After the "Show Shared Nav" button, add:
```typescript
            <button
              onClick={() => setFocusMode(prev => !prev)}
              style={toolbarButtonStyle(ctx.isDark, focusMode)}
              title="Focus Mode: edges visible on selection only"
            >
              {focusMode ? 'Show Edges' : 'Focus Mode'}
            </button>
```

- [ ] **Step 4: Add `focusMode` to keyboard handler dependencies**

Find the keyboard handler `useEffect` dependency array (~line 367). Add `focusMode` to the array.

Also add a keyboard shortcut — in the `switch (e.key)` block, add before the closing `}`:
```typescript
        case 'f':
        case 'F':
          setFocusMode(prev => !prev);
          break;
```

- [ ] **Step 5: Update HelpOverlay with the new shortcut**

In `packages/core/src/components/panels/HelpOverlay.tsx`, add to the `shortcuts` array:
```typescript
  { key: 'F', label: 'Toggle focus mode' },
```

- [ ] **Step 6: Build to verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds.

- [ ] **Step 7: Start demo and verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`
Open http://localhost:3000. Verify:
1. Default view shows NO edges — just clean group containers with screenshot nodes
2. Click a node → its connected edges appear, rest remain hidden
3. Press Escape → edges disappear again
4. Click "Show Edges" button → all edges visible (focus mode off)
5. Press F → toggles focus mode back on

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/NavMap.tsx packages/core/src/components/panels/HelpOverlay.tsx
git commit -m "feat: add focus mode — edges hidden until node selected"
```

---

## Task 4: Final build and push

- [ ] **Step 1: Final build**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds.

- [ ] **Step 2: Start demo and full verification**

Verify all three changes together:
1. Graph layout is left-to-right (groups in columns)
2. Screenshot thumbnails visible on all nodes with screenshots
3. Focus mode ON by default — clean graph with no edges
4. Click node → connected edges appear with labels
5. All existing features still work: search, keyboard nav, walkthrough, presentation mode

- [ ] **Step 3: Push**

```bash
git push origin main
```
