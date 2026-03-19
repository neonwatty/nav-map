# Group Focus Mode

Double-click a group header to zoom in and isolate that group visually. All other groups dim out while the focused group stays fully interactive.

Note: this feature is called "group focus" internally (`focusedGroupId`) to distinguish it from the existing `focusMode` boolean, which controls edge visibility on node selection (toggled with "F" key). These are independent features. Group focus is only available when no flow is selected in map view — flow highlighting takes precedence.

## Interaction

| Gesture | Current behavior | New behavior |
|---------|-----------------|--------------|
| Single-click group header | Toggle collapse/expand | Same, but debounced ~250ms to distinguish from double-click |
| Double-click group header | Two toggles (no-op) | Enter group focus for that group |
| Double-click focused header | N/A | Exit group focus |
| Escape key | Closes search/help | Also exits group focus |
| Reset View button | Resets viewport | Also exits group focus |

When group focus is active, single-click on the focused group header still collapses/expands.

If the focused group is collapsed while in group focus, exit group focus automatically.

### Debounce behavior

The debounce delays both the visual toggle (local `isCollapsed` state) and the parent callback (`onToggle`). No state change occurs until the 250ms window closes without a second click. This adds a slight delay to collapse/expand but is necessary to distinguish single from double-click.

### Double-click propagation

The GroupNode header's double-click handler must call `e.stopPropagation()` to prevent React Flow's `onNodeDoubleClick` (used by the gallery viewer) from also firing.

## Visual Treatment

- **Focused group**: fully opaque, normal rendering
- **Other groups**: dimmed to ~0.15 opacity, CSS transition ~300ms ease
- **Edges within focused group**: fully visible
- **Cross-group edges involving focused group**: 0.15 opacity
- **All other edges**: opacity 0 (hidden)
- **Viewport**: `fitView` animates to frame the focused group's nodes with padding
- **Toolbar**: shows "Focused: {GroupName} x" indicator; clicking x exits group focus
- **MiniMap**: not affected (shows all groups at normal color)

No layout recomputation. Everything stays in place, just visually de-emphasized.

## Implementation

### State

New state in `NavMapInner`:

```ts
const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
```

Exposed via `NavMapContext` so all nodes and edges can read it.

### Group membership

Group membership is determined by `nodeData.group` (e.g., `"auth"`, `"marketing"`). The `focusedGroupId` value matches these group ID strings. Node components compare `nodeData.group === focusedGroupId` to determine if they are in the focused group. For edges, a `nodeGroupMap: Map<string, string>` (node ID → group ID) is built from graph data and passed to `useGraphStyling`.

### Precedence

- Flow highlighting (selected flow in map view) takes precedence over group focus. Group focus is cleared when a flow is selected.
- The existing `focusMode` (edge visibility on node selection, "F" key) operates independently and is unaffected.

### GroupNode.tsx

Debounce single-click (~250ms). If a second click arrives within the window, cancel the pending collapse toggle and fire `onDoubleClick(groupId)` instead. The debounce delays both `setIsCollapsed` and `nodeData.onToggle` — no visual flicker on double-click.

Add `onDoubleClick` handler that calls `e.stopPropagation()`.

```ts
interface GroupNodeData {
  // ...existing fields
  onDoubleClick?: (groupId: string) => void;
}
```

### NavMap.tsx

- Add `focusedGroupId` state and pass through context
- On group double-click: set `focusedGroupId` (or clear if same group)
- On Escape: clear `focusedGroupId`
- On Reset View: clear `focusedGroupId`
- On flow selection: clear `focusedGroupId`
- On focused group collapse: clear `focusedGroupId`
- After setting focus, call `reactFlowInstance.fitView({ nodes: focusedNodeIds.map(id => ({ id })), duration: 300 })` where `focusedNodeIds` are nodes whose `data.group` matches `focusedGroupId`
- Render toolbar indicator when focused

### PageNode.tsx + CompactNode.tsx

Read `focusedGroupId` from `useNavMapContext()`. When set and `nodeData.group !== focusedGroupId`:

```ts
style={{ opacity: 0.15, transition: 'opacity 300ms ease', pointerEvents: 'none' }}
```

### Edge rendering (useGraphStyling)

Modify `useGraphStyling` to accept `focusedGroupId` and a `nodeGroupMap: Map<string, string>`. When `focusedGroupId` is set:

- Both endpoints in focused group → full opacity
- One endpoint in focused group → 0.15 opacity
- Neither endpoint in focused group → opacity 0

This logic composes with existing edge styling (flow highlighting, focusMode) by running after those passes.

### Files modified

- `packages/core/src/components/nodes/GroupNode.tsx` — debounce click, add double-click handler with stopPropagation
- `packages/core/src/components/NavMap.tsx` — focusedGroupId state, context, fitView, toolbar indicator, Escape/Reset handlers, flow selection clearing
- `packages/core/src/components/nodes/PageNode.tsx` — dim when unfocused
- `packages/core/src/components/nodes/CompactNode.tsx` — dim when unfocused
- `packages/core/src/hooks/useNavMap.ts` — add focusedGroupId to context type
- `packages/core/src/hooks/useGraphStyling.ts` — accept focusedGroupId + nodeGroupMap, apply group-based edge opacity

No new files.
