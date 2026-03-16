# Tier 2: Multi-View Mode & User Flows Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a view mode switcher (Map/Flow/Tree), collapsed group edge aggregation, and named user flows to the NavMap component.

**Architecture:** Add a `viewMode` state to NavMap with a toolbar dropdown. Each mode re-computes the layout with different ELK options or filters. User flows are defined in nav-map.json and highlighted on the graph with step numbers. Collapsed groups aggregate cross-group edges into weighted bundles.

**Tech Stack:** React, @xyflow/react, elkjs

**Spec:** Based on existing codebase at `packages/core/src/`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `packages/core/src/types.ts` | Add `flows` field to `NavMapGraph`, add `ViewMode` type | Modify |
| `packages/core/src/components/NavMap.tsx` | View mode state, toolbar dropdown, flow/tree mode rendering logic, edge aggregation | Modify |
| `packages/core/src/layout/elkLayout.ts` | Accept mode-specific layout options (horizontal flow, tree from root) | Modify |
| `packages/core/src/components/panels/FlowSelector.tsx` | Dropdown to pick a named flow when in flow mode | Create |
| `packages/core/src/components/panels/ViewModeSelector.tsx` | Segmented control for Map/Flow/Tree modes | Create |
| `packages/core/src/components/nodes/PageNode.tsx` | Render step number badge when node is part of active flow | Modify |
| `packages/core/src/components/nodes/CompactNode.tsx` | Render step number badge when node is part of active flow | Modify |
| `packages/core/src/components/edges/NavEdge.tsx` | Render edge count badge for aggregated edges | Modify |
| `packages/demo/public/bleep-app.nav-map.json` | Add sample `flows` data | Modify |
| `packages/core/src/index.ts` | Export new types and components | Modify |

---

## Task 1: Add view mode state and toolbar dropdown

### Step 1: Add types to types.ts

- [ ] **Add `NavMapFlow` interface and `flows` field to `NavMapGraph`**

**File:** `packages/core/src/types.ts`

After the `NavMapSharedNav` interface (line 30), add:

```typescript
export interface NavMapFlow {
  name: string;
  steps: string[]; // ordered array of node IDs
}

export type ViewMode = 'map' | 'flow' | 'tree';
```

Then add `flows` to the `NavMapGraph` interface, after the `sharedNav` field (line 44):

```typescript
export interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual';
    framework?: 'nextjs-app' | 'nextjs-pages' | 'generic';
  };
  nodes: NavMapNode[];
  edges: NavMapEdge[];
  groups: NavMapGroup[];
  sharedNav?: NavMapSharedNav;
  flows?: NavMapFlow[];
}
```

### Step 2: Create ViewModeSelector component

- [ ] **Create `packages/core/src/components/panels/ViewModeSelector.tsx`**

```typescript
import { useNavMapContext } from '../../hooks/useNavMap';
import type { ViewMode } from '../../types';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const modes: { value: ViewMode; label: string }[] = [
  { value: 'map', label: 'Map' },
  { value: 'flow', label: 'Flow' },
  { value: 'tree', label: 'Tree' },
];

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  const { isDark } = useNavMapContext();

  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 6,
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        overflow: 'hidden',
      }}
    >
      {modes.map((mode) => {
        const isActive = viewMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onViewModeChange(mode.value)}
            style={{
              background: isActive
                ? (isDark ? '#1e2540' : '#e0e8ff')
                : (isDark ? '#14141e' : '#fff'),
              border: 'none',
              borderRight: mode.value !== 'tree'
                ? `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`
                : 'none',
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive
                ? (isDark ? '#7aacff' : '#3355aa')
                : (isDark ? '#888' : '#666'),
              cursor: 'pointer',
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
```

### Step 3: Add view mode state to NavMap.tsx

- [ ] **Add state and import**

**File:** `packages/core/src/components/NavMap.tsx`

Add import at the top, after the existing type imports (line 18):

```typescript
import type { NavMapGraph, ViewMode } from '../types';
import { ViewModeSelector } from './panels/ViewModeSelector';
import { FlowSelector } from './panels/FlowSelector';
```

Remove the existing `import type { NavMapGraph } from '../types';` line.

Inside `NavMapInner`, after the existing state declarations (after line 117 `hoverPreview` state), add:

```typescript
const [viewMode, setViewMode] = useState<ViewMode>('map');
const [selectedFlowIndex, setSelectedFlowIndex] = useState<number | null>(null);
const [treeRootId, setTreeRootId] = useState<string | null>(null);
```

### Step 4: Add ViewModeSelector to the toolbar

- [ ] **Insert ViewModeSelector into the toolbar div**

**File:** `packages/core/src/components/NavMap.tsx`

In the toolbar div (the `div` starting around line 493 with `position: 'absolute', top: 12, right: 12`), add the ViewModeSelector as the first child:

```typescript
<ViewModeSelector
  viewMode={viewMode}
  onViewModeChange={(mode) => {
    setViewMode(mode);
    if (mode !== 'flow') setSelectedFlowIndex(null);
    if (mode !== 'tree') setTreeRootId(null);
  }}
/>
```

This goes before the "Reset View" button (line 503).

### Step 5: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds (FlowSelector not yet created, so this step will fail until Task 2 Step 1 is complete. Complete Tasks 1-2 together before building).

### Step 6: Commit

```bash
git add packages/core/src/types.ts packages/core/src/components/panels/ViewModeSelector.tsx packages/core/src/components/NavMap.tsx
git commit -m "feat: add view mode state and toolbar selector (map/flow/tree)"
```

---

## Task 2: Flow View mode

### Step 1: Create FlowSelector component

- [ ] **Create `packages/core/src/components/panels/FlowSelector.tsx`**

```typescript
import { useNavMapContext } from '../../hooks/useNavMap';
import type { NavMapFlow } from '../../types';

interface FlowSelectorProps {
  flows: NavMapFlow[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

export function FlowSelector({ flows, selectedIndex, onSelect }: FlowSelectorProps) {
  const { isDark } = useNavMapContext();

  if (flows.length === 0) return null;

  return (
    <select
      value={selectedIndex ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        onSelect(val === '' ? null : Number(val));
      }}
      style={{
        background: isDark ? '#14141e' : '#fff',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 12,
        color: isDark ? '#888' : '#666',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <option value="">Select flow...</option>
      {flows.map((flow, i) => (
        <option key={i} value={i}>
          {flow.name}
        </option>
      ))}
    </select>
  );
}
```

### Step 2: Add sample flows to bleep-app.nav-map.json

- [ ] **Add `flows` array to the demo JSON**

**File:** `packages/demo/public/bleep-app.nav-map.json`

Add after the `sharedNav` block (after the closing `}` on line 74, before the final `}`):

```json
  "flows": [
    {
      "name": "New User Signup",
      "steps": ["home", "bleep", "signup", "studio", "studio-project"]
    },
    {
      "name": "Blog to Conversion",
      "steps": ["blog", "blog-post", "home", "bleep", "premium"]
    },
    {
      "name": "Educator Onboarding",
      "steps": ["for-educators", "premium-edu", "signup", "studio"]
    },
    {
      "name": "Password Reset",
      "steps": ["login", "reset-pw", "update-pw", "login", "studio"]
    }
  ]
```

### Step 3: Filter nodes/edges and layout horizontally in flow mode

- [ ] **Add flow filtering logic to NavMap.tsx**

**File:** `packages/core/src/components/NavMap.tsx`

Add a new `useEffect` after the existing layout effect (after line 185). This effect triggers when `viewMode` or `selectedFlowIndex` changes and the graph exists:

```typescript
// Re-layout when view mode changes
useEffect(() => {
  if (!graph || !layoutDone) return;

  if (viewMode === 'flow' && selectedFlowIndex !== null) {
    const flow = graph.flows?.[selectedFlowIndex];
    if (!flow) return;

    const flowStepSet = new Set(flow.steps);

    // Build flow-only edges: consecutive steps in the flow
    const flowEdges: Edge[] = [];
    for (let i = 0; i < flow.steps.length - 1; i++) {
      const src = flow.steps[i];
      const tgt = flow.steps[i + 1];
      // Try to find a matching graph edge, otherwise create a synthetic one
      const existingEdge = graph.edges.find(e => e.source === src && e.target === tgt);
      flowEdges.push({
        id: existingEdge?.id ?? `flow-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: 'navEdge',
        data: {
          label: existingEdge?.label ?? `Step ${i + 1} -> ${i + 2}`,
          edgeType: existingEdge?.type ?? 'link',
        },
      });
    }

    // Build flow-only nodes (no groups in flow mode)
    const flowNodes: Node[] = flow.steps.map((stepId, index) => {
      const graphNode = graph.nodes.find(n => n.id === stepId);
      return {
        id: stepId,
        type: graphNode?.screenshot ? 'pageNode' : 'compactNode',
        position: { x: 0, y: 0 },
        // No parentId — flat layout in flow mode
        data: {
          label: graphNode?.label ?? stepId,
          route: graphNode?.route ?? '',
          group: graphNode?.group ?? '',
          screenshot: graphNode?.screenshot,
          filePath: graphNode?.filePath,
          metadata: graphNode?.metadata,
          flowStepNumber: index + 1,
        },
      };
    });

    computeElkLayout(flowNodes, flowEdges, { direction: 'RIGHT', spacing: 120 }).then(
      ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        baseEdgesRef.current = layoutedEdges;
        setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
      }
    );
  } else if (viewMode === 'map') {
    // Re-run full layout
    const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);
    for (const node of rfNodes) {
      if (node.type === 'groupNode') {
        (node.data as Record<string, unknown>).onToggle = handleGroupToggleRef.current;
      }
    }
    computeElkLayout(rfNodes, rfEdges).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      baseEdgesRef.current = layoutedEdges;
      sharedNavEdgesRef.current = buildSharedNavEdges(graph);
      setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
    });
  }
  // Tree mode handled in Task 3
}, [viewMode, selectedFlowIndex]);
```

### Step 4: Show FlowSelector in toolbar when mode is 'flow'

- [ ] **Add FlowSelector conditionally in the toolbar**

**File:** `packages/core/src/components/NavMap.tsx`

In the toolbar div, after the `ViewModeSelector`, add:

```typescript
{viewMode === 'flow' && graph?.flows && (
  <FlowSelector
    flows={graph.flows}
    selectedIndex={selectedFlowIndex}
    onSelect={setSelectedFlowIndex}
  />
)}
```

### Step 5: Show flow name in walkthrough bar area

- [ ] **Add flow name display below the toolbar**

**File:** `packages/core/src/components/NavMap.tsx`

Add after the toolbar div (after the closing `</div>` of the toolbar around line 540), before the WalkthroughBar:

```typescript
{/* Flow name banner */}
{viewMode === 'flow' && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex] && (
  <div
    style={{
      position: 'absolute',
      top: 50,
      left: '50%',
      transform: 'translateX(-50%)',
      background: isDark ? 'rgba(16, 16, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
      border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
      borderRadius: 8,
      padding: '6px 16px',
      zIndex: 20,
      fontSize: 13,
      fontWeight: 600,
      color: isDark ? '#7aacff' : '#3355aa',
    }}
  >
    Flow: {graph.flows[selectedFlowIndex].name}
  </div>
)}
```

Note: reference `isDark` from `ctx.isDark` (it is already available as `const { isDark } = ctx` can be destructured, or use `ctx.isDark` directly).

### Step 6: Add step number badge to PageNode

- [ ] **Modify PageNode to show step number**

**File:** `packages/core/src/components/nodes/PageNode.tsx`

In `PageNodeComponent`, after destructuring `nodeData` (line 7), add:

```typescript
const flowStepNumber = (data as Record<string, unknown>).flowStepNumber as number | undefined;
```

Then in the JSX, right after the opening `<div>` (the root wrapper), add a step number badge:

```typescript
{flowStepNumber != null && (
  <div
    style={{
      position: 'absolute',
      top: -10,
      left: -10,
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: '#3355aa',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
      border: '2px solid #fff',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}
  >
    {flowStepNumber}
  </div>
)}
```

Also add `position: 'relative'` to the root div's style so the absolute badge is positioned correctly. Change the root div style from:

```typescript
style={{
  width: 180,
  borderRadius: 8,
```

to:

```typescript
style={{
  width: 180,
  borderRadius: 8,
  position: 'relative',
```

### Step 7: Add step number badge to CompactNode

- [ ] **Modify CompactNode to show step number**

**File:** `packages/core/src/components/nodes/CompactNode.tsx`

Same pattern. After destructuring `nodeData` (line 7), add:

```typescript
const flowStepNumber = (data as Record<string, unknown>).flowStepNumber as number | undefined;
```

Add `position: 'relative'` to the root div's style. Then add the badge inside the root div:

```typescript
{flowStepNumber != null && (
  <div
    style={{
      position: 'absolute',
      top: -10,
      left: -10,
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#3355aa',
      color: '#fff',
      fontSize: 11,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
      border: '2px solid #fff',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}
  >
    {flowStepNumber}
  </div>
)}
```

### Step 8: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds.

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`

Verify:
1. Click "Flow" in the view mode selector
2. A flow selector dropdown appears with the 4 sample flows
3. Selecting "New User Signup" shows only 5 nodes laid out horizontally
4. Each node has a blue circle step number badge (1 through 5)
5. The flow name banner appears at the top center
6. Switching back to "Map" restores the full graph

### Step 9: Commit

```bash
git add packages/core/src/types.ts packages/core/src/components/panels/FlowSelector.tsx packages/core/src/components/nodes/PageNode.tsx packages/core/src/components/nodes/CompactNode.tsx packages/core/src/components/NavMap.tsx packages/demo/public/bleep-app.nav-map.json
git commit -m "feat: add flow view mode with named user flows and step number badges"
```

---

## Task 3: Tree View mode

### Step 1: Add tree mode logic to NavMap.tsx

- [ ] **Add tree root selection on node click in tree mode**

**File:** `packages/core/src/components/NavMap.tsx`

Modify the `onSelectionChange` callback (around line 215). After the existing `ctxRef.current.setSelectedNodeId(selected.id)` line, add tree root logic:

```typescript
const onSelectionChange = useCallback(
  ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
    const selected = selectedNodes[0];
    if (selected) {
      ctxRef.current.setSelectedNodeId(selected.id);
      walkthroughRef.current.push(selected.id);
      // In tree mode, clicking a node sets it as the tree root
      if (viewModeRef.current === 'tree') {
        setTreeRootId(selected.id);
      }
    }
  },
  []
);
```

Add a `viewModeRef` near the other refs (around line 207):

```typescript
const viewModeRef = useRef(viewMode);
viewModeRef.current = viewMode;
```

### Step 2: Add BFS tree discovery and layout

- [ ] **Add tree layout effect in the view mode useEffect**

**File:** `packages/core/src/components/NavMap.tsx`

In the view mode `useEffect` (from Task 2 Step 3), add the tree mode case. Replace the `// Tree mode handled in Task 3` comment with:

```typescript
else if (viewMode === 'tree' && treeRootId) {
  // BFS from root to discover reachable nodes
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const existing = adjacency.get(edge.source) ?? [];
    existing.push(edge.target);
    adjacency.set(edge.source, existing);
  }

  const visited = new Set<string>();
  const queue = [treeRootId];
  visited.add(treeRootId);
  const treeEdges: Edge[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        const existingEdge = graph.edges.find(
          e => e.source === current && e.target === neighbor
        );
        treeEdges.push({
          id: existingEdge?.id ?? `tree-${current}-${neighbor}`,
          source: current,
          target: neighbor,
          type: 'navEdge',
          data: {
            label: existingEdge?.label ?? '',
            edgeType: existingEdge?.type ?? 'link',
          },
        });
      }
    }
  }

  // Build tree nodes (no groups — flat layout)
  const treeNodes: Node[] = graph.nodes
    .map((n) => ({
      id: n.id,
      type: n.screenshot ? 'pageNode' : 'compactNode',
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        route: n.route,
        group: n.group,
        screenshot: n.screenshot,
        filePath: n.filePath,
        metadata: n.metadata,
      },
      style: {
        opacity: visited.has(n.id) ? 1 : 0.1,
        transition: 'opacity 0.3s',
      },
    }));

  computeElkLayout(
    treeNodes.filter(n => visited.has(n.id)),
    treeEdges,
    { direction: 'RIGHT', spacing: 100 }
  ).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
    // Add back the dimmed non-reachable nodes off to the side
    const nonReachable = treeNodes
      .filter(n => !visited.has(n.id))
      .map((n, i) => ({
        ...n,
        position: { x: -300, y: i * 60 },
      }));
    setNodes([...layoutedNodes, ...nonReachable]);
    setEdges(layoutedEdges);
    baseEdgesRef.current = layoutedEdges;
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  });
}
```

Also add `treeRootId` to the dependency array of the `useEffect`:

```typescript
}, [viewMode, selectedFlowIndex, treeRootId]);
```

### Step 3: Show tree mode instructions

- [ ] **Add tree mode hint banner**

**File:** `packages/core/src/components/NavMap.tsx`

After the flow name banner JSX (added in Task 2 Step 5), add:

```typescript
{/* Tree mode hint */}
{viewMode === 'tree' && !treeRootId && (
  <div
    style={{
      position: 'absolute',
      top: 50,
      left: '50%',
      transform: 'translateX(-50%)',
      background: ctx.isDark ? 'rgba(16, 16, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
      border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
      borderRadius: 8,
      padding: '6px 16px',
      zIndex: 20,
      fontSize: 13,
      color: ctx.isDark ? '#888' : '#666',
    }}
  >
    Click any node to set it as tree root
  </div>
)}
{viewMode === 'tree' && treeRootId && (
  <div
    style={{
      position: 'absolute',
      top: 50,
      left: '50%',
      transform: 'translateX(-50%)',
      background: ctx.isDark ? 'rgba(16, 16, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
      border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
      borderRadius: 8,
      padding: '6px 16px',
      zIndex: 20,
      fontSize: 13,
      fontWeight: 600,
      color: ctx.isDark ? '#7aacff' : '#3355aa',
    }}
  >
    Tree from: {graph?.nodes.find(n => n.id === treeRootId)?.label ?? treeRootId}
  </div>
)}
```

### Step 4: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds.

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`

Verify:
1. Click "Tree" in the view mode selector
2. Banner says "Click any node to set it as tree root"
3. Click "Home" node -- graph re-lays out as a tree from Home, direction=RIGHT
4. Nodes reachable from Home are fully opaque; unreachable ones are at 10% opacity
5. Click a different node to change the tree root
6. Switching back to "Map" restores the full graph

### Step 5: Commit

```bash
git add packages/core/src/components/NavMap.tsx
git commit -m "feat: add tree view mode with BFS discovery and dimmed non-reachable nodes"
```

---

## Task 4: Collapsed group edge aggregation

### Step 1: Replace individual re-routed edges with merged weighted edges

- [ ] **Modify the `visibleEdges` memo in NavMap.tsx**

**File:** `packages/core/src/components/NavMap.tsx`

Replace the existing `visibleEdges` memo (around line 415-435) with an enhanced version that deduplicates edges targeting the same group pair and adds a count:

```typescript
const visibleEdges = useMemo(() => {
  if (collapsedGroups.size === 0) return edges;

  const collapsedChildIds = new Set(
    nodes
      .filter(n => n.parentId && collapsedGroups.has(n.parentId.slice('group-'.length)))
      .map(n => n.id)
  );

  // First pass: re-route edges to group nodes
  const reroutedEdges = edges.map(edge => {
    let { source, target } = edge;
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);
    if (sourceNode?.parentId && collapsedChildIds.has(source)) {
      source = sourceNode.parentId;
    }
    if (targetNode?.parentId && collapsedChildIds.has(target)) {
      target = targetNode.parentId;
    }
    if (source === edge.source && target === edge.target) return edge;
    return { ...edge, source, target, id: `${edge.id}-rerouted` };
  });

  // Second pass: merge edges with same source+target (group-to-group bundles)
  const edgeBuckets = new Map<string, Edge[]>();
  for (const edge of reroutedEdges) {
    const key = `${edge.source}->${edge.target}`;
    const bucket = edgeBuckets.get(key) ?? [];
    bucket.push(edge);
    edgeBuckets.set(key, bucket);
  }

  const mergedEdges: Edge[] = [];
  for (const [key, bucket] of edgeBuckets) {
    if (bucket.length === 1) {
      mergedEdges.push(bucket[0]);
    } else {
      // Merge into a single weighted edge
      const representative = bucket[0];
      mergedEdges.push({
        ...representative,
        id: `merged-${key}`,
        data: {
          ...representative.data,
          label: `${bucket.length} connections`,
          edgeCount: bucket.length,
          edgeType: 'link',
        },
      });
    }
  }

  // Filter out self-loops (source === target after rerouting)
  return mergedEdges.filter(e => e.source !== e.target);
}, [edges, nodes, collapsedGroups]);
```

### Step 2: Show edge count badge on NavEdge

- [ ] **Modify NavEdge to render a count badge for aggregated edges**

**File:** `packages/core/src/components/edges/NavEdge.tsx`

Update the `NavEdgeData` interface to include `edgeCount`:

```typescript
interface NavEdgeData {
  label?: string;
  edgeType?: string;
  alwaysShowLabel?: boolean;
  edgeCount?: number;
  [key: string]: unknown;
}
```

Then in the JSX, after the label `foreignObject` block (after the `showLabel` conditional around line 96-121), add:

```typescript
{edgeData?.edgeCount && edgeData.edgeCount > 1 && (
  <foreignObject
    x={labelX - 14}
    y={labelY - 14}
    width={28}
    height={28}
    style={{ overflow: 'visible', pointerEvents: 'none' }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#3355aa',
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }}
    >
      {edgeData.edgeCount}
    </div>
  </foreignObject>
)}
```

### Step 3: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds.

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`

Verify:
1. In Map mode, collapse the "Marketing" group by clicking its header
2. All edges from/to marketing nodes are now single weighted edges pointing to/from the group node
3. The merged edge shows a blue count badge (e.g., "3" if 3 edges were merged)
4. No self-loop edges appear (edges within the same collapsed group are hidden)
5. Expanding the group restores the individual edges

### Step 4: Commit

```bash
git add packages/core/src/components/NavMap.tsx packages/core/src/components/edges/NavEdge.tsx
git commit -m "feat: aggregate collapsed group edges into weighted bundles with count badges"
```

---

## Task 5: Named user flows in JSON + flow highlighting in map mode

### Step 1: Add flow highlighting when a flow is selected in map mode

- [ ] **Support flow highlighting even in map mode (optional overlay)**

**File:** `packages/core/src/components/NavMap.tsx`

Modify the `styledNodes` memo (around line 438) to support flow highlighting in addition to selection dimming. The flow highlighting takes priority:

```typescript
const activeFlow = (selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex]) ?? null;

const styledNodes = useMemo(() => {
  // Flow highlighting in map mode
  if (viewMode === 'map' && activeFlow) {
    const flowStepSet = new Set(activeFlow.steps);
    const flowStepMap = new Map(activeFlow.steps.map((id, i) => [id, i + 1]));

    return visibleNodes.map(node => {
      const isFlowNode = flowStepSet.has(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          ...(isFlowNode ? { flowStepNumber: flowStepMap.get(node.id) } : {}),
        },
        style: {
          ...node.style,
          opacity: isFlowNode ? 1 : 0.2,
          transition: 'opacity 0.2s',
          ...(isFlowNode ? {
            boxShadow: '0 0 0 3px #3355aa',
            borderRadius: 8,
          } : {}),
        },
      };
    });
  }

  // Normal selection dimming
  if (!ctx.selectedNodeId) return visibleNodes;

  const connectedNodeIds = new Set<string>([ctx.selectedNodeId]);
  for (const edge of visibleEdges) {
    if (edge.source === ctx.selectedNodeId) connectedNodeIds.add(edge.target);
    if (edge.target === ctx.selectedNodeId) connectedNodeIds.add(edge.source);
  }

  return visibleNodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      opacity: connectedNodeIds.has(node.id) ? 1 : 0.25,
      transition: 'opacity 0.2s',
    },
  }));
}, [visibleNodes, visibleEdges, ctx.selectedNodeId, viewMode, activeFlow]);
```

Note: `activeFlow` should be computed outside the memo with `useMemo`:

```typescript
const activeFlow = useMemo(() => {
  if (selectedFlowIndex === null || !graph?.flows) return null;
  return graph.flows[selectedFlowIndex] ?? null;
}, [selectedFlowIndex, graph?.flows]);
```

Place this right before the `styledNodes` memo.

### Step 2: Also dim non-flow edges in map mode

- [ ] **Update styledEdges memo for flow highlighting**

**File:** `packages/core/src/components/NavMap.tsx`

Modify the `styledEdges` memo (around line 457):

```typescript
const styledEdges = useMemo(() => {
  // Flow highlighting in map mode
  if (viewMode === 'map' && activeFlow) {
    const flowEdgePairs = new Set<string>();
    for (let i = 0; i < activeFlow.steps.length - 1; i++) {
      flowEdgePairs.add(`${activeFlow.steps[i]}->${activeFlow.steps[i + 1]}`);
    }
    return visibleEdges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: flowEdgePairs.has(`${edge.source}->${edge.target}`) ? 1 : 0.1,
        stroke: flowEdgePairs.has(`${edge.source}->${edge.target}`) ? '#3355aa' : undefined,
        strokeWidth: flowEdgePairs.has(`${edge.source}->${edge.target}`) ? 2.5 : undefined,
        transition: 'opacity 0.2s',
      },
    }));
  }

  // Normal selection dimming
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
}, [visibleEdges, ctx.selectedNodeId, viewMode, activeFlow]);
```

### Step 3: Allow flow selection from map mode toolbar too

- [ ] **Show FlowSelector in map mode when flows exist**

**File:** `packages/core/src/components/NavMap.tsx`

Update the FlowSelector conditional in the toolbar from:

```typescript
{viewMode === 'flow' && graph?.flows && (
```

to:

```typescript
{(viewMode === 'flow' || viewMode === 'map') && graph?.flows && graph.flows.length > 0 && (
```

### Step 4: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds.

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`

Verify:
1. In Map mode, the flow selector dropdown is visible
2. Selecting "New User Signup" highlights those 5 nodes with step number badges and colored borders
3. Non-flow nodes are dimmed to 20% opacity
4. Flow edges are highlighted in blue (#3355aa), non-flow edges dimmed to 10%
5. Deselecting the flow (back to "Select flow...") restores normal view
6. Switching to Flow mode + selecting a flow shows the isolated horizontal layout

### Step 5: Update exports in index.ts

- [ ] **Add new exports**

**File:** `packages/core/src/index.ts`

Add the new exports:

```typescript
// After the existing component exports
export { ViewModeSelector } from './components/panels/ViewModeSelector';
export { FlowSelector } from './components/panels/FlowSelector';

// After the existing type exports
export type { NavMapFlow, ViewMode } from './types';
```

### Step 6: Final build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds with no errors.

### Step 7: Commit

```bash
git add packages/core/src/components/NavMap.tsx packages/core/src/index.ts
git commit -m "feat: flow highlighting in map mode with step badges and dimming"
```
