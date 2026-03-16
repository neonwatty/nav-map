# Compound Graph Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat ELK layered layout with a compound graph layout where groups are container nodes, edges route orthogonally with rounded corners, and groups can be collapsed.

**Architecture:** Restructure the ELK input to nest page nodes inside group container nodes. ELK computes orthogonal routing and returns bend points on edge sections. A custom NavEdge renderer draws rounded-corner paths from those points. NavMap manages collapsed group state and filters children/re-routes edges accordingly.

**Tech Stack:** elkjs (compound graph + orthogonal routing), @xyflow/react (parentId hierarchy, custom edges), React (state management for collapse)

**Spec:** `docs/superpowers/specs/2026-03-15-compound-graph-layout-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `packages/core/src/utils/graphHelpers.ts` | Convert NavMapGraph → React Flow nodes/edges with group hierarchy | Modify |
| `packages/core/src/layout/elkLayout.ts` | Build compound ELK graph, run layout, extract positions + edge bend points | Rewrite |
| `packages/core/src/components/edges/NavEdge.tsx` | Render edges from orthogonal bend points with rounded corners | Modify |
| `packages/core/src/components/NavMap.tsx` | Wire compound layout, collapsed groups state, semantic zoom fix | Modify |

No new files. No changes to PageNode, CompactNode, GroupNode, ConnectionPanel, analytics, scanner, or nav-map.json schema.

---

## Chunk 1: Graph Helpers + ELK Layout

### Task 1: Update graphHelpers to emit group nodes and assign parentId

**Files:**
- Modify: `packages/core/src/utils/graphHelpers.ts`

- [ ] **Step 1: Update `toReactFlowNodes` to create group nodes**

Add a new function `buildCompoundNodes` that takes `NavMapNode[]` and `NavMapGroup[]` and returns React Flow nodes with group hierarchy:

```typescript
import type { Node, Edge } from '@xyflow/react';
import type { NavMapGraph, NavMapNode, NavMapEdge, NavMapGroup } from '../types';

export interface RFNodeData {
  label: string;
  route: string;
  group: string;
  screenshot?: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

// Reuse GroupNodeData from the existing GroupNode component
import type { GroupNodeData } from '../components/nodes/GroupNode';

export function buildCompoundNodes(
  nodes: NavMapNode[],
  groups: NavMapGroup[]
): Node[] {
  const groupIds = new Set(groups.map(g => g.id));
  const groupChildCounts = new Map<string, number>();

  // Count children per group
  for (const n of nodes) {
    if (groupIds.has(n.group)) {
      groupChildCounts.set(n.group, (groupChildCounts.get(n.group) ?? 0) + 1);
    }
  }

  const rfNodes: Node[] = [];

  // Create group container nodes (skip empty groups)
  for (const g of groups) {
    const count = groupChildCounts.get(g.id) ?? 0;
    if (count === 0) continue;

    rfNodes.push({
      id: `group-${g.id}`,
      type: 'groupNode',
      position: { x: 0, y: 0 },
      data: {
        label: g.label,
        groupId: g.id,
        childCount: count,
        collapsed: false,
      } satisfies GroupNodeData,
    });
  }

  // Create page nodes with parentId
  for (const n of nodes) {
    const hasGroup = groupIds.has(n.group) && (groupChildCounts.get(n.group) ?? 0) > 0;
    rfNodes.push({
      id: n.id,
      type: n.screenshot ? 'pageNode' : 'compactNode',
      position: { x: 0, y: 0 },
      ...(hasGroup ? { parentId: `group-${n.group}` } : {}),
      data: {
        label: n.label,
        route: n.route,
        group: n.group,
        screenshot: n.screenshot,
        filePath: n.filePath,
        metadata: n.metadata,
      } satisfies RFNodeData,
    });
  }

  return rfNodes;
}

// Keep old functions for backward compatibility
export function toReactFlowNodes(nodes: NavMapNode[]): Node<RFNodeData>[] {
  return nodes.map(n => ({
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
  }));
}

export function toReactFlowEdges(edges: NavMapEdge[]): Edge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'navEdge',
    data: {
      label: e.label,
      edgeType: e.type,
    },
  }));
}

export function getConnectedNodes(
  nodeId: string,
  edges: NavMapEdge[]
): { incoming: NavMapEdge[]; outgoing: NavMapEdge[] } {
  return {
    incoming: edges.filter(e => e.target === nodeId),
    outgoing: edges.filter(e => e.source === nodeId),
  };
}

export function buildGraphFromJson(graph: NavMapGraph) {
  return {
    nodes: buildCompoundNodes(graph.nodes, graph.groups),
    edges: toReactFlowEdges(graph.edges),
  };
}
```

- [ ] **Step 2: Build core to verify no type errors**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/utils/graphHelpers.ts
git commit -m "feat: add compound node builder with group hierarchy and parentId"
```

---

### Task 2: Rewrite elkLayout for compound graph + orthogonal routing

**Files:**
- Rewrite: `packages/core/src/layout/elkLayout.ts`

- [ ] **Step 1: Rewrite elkLayout.ts**

Replace the entire file. The new version must:
1. Accept React Flow nodes (which now include group nodes) and edges
2. Build a compound ELK graph: group nodes as ELK parent containers, page nodes nested as children, ungrouped nodes at root level
3. Set `elk.edgeRouting: 'ORTHOGONAL'` at root level
4. Set per-group layout options (`elk.direction: 'RIGHT'`)
5. After layout, **recursively traverse** the ELK output to extract positions at every nesting level
6. Extract `edge.sections[].startPoint`, `bendPoints[]`, `endPoint` and flatten into a `points` array on each React Flow edge's `data`

```typescript
import ELK, {
  type ElkNode,
  type ElkExtendedEdge,
  type ElkPort,
} from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 140;
const COMPACT_NODE_WIDTH = 120;
const COMPACT_NODE_HEIGHT = 50;
const GROUP_PADDING_TOP = 40;
const GROUP_PADDING = 20;

export interface LayoutOptions {
  direction?: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';
  spacing?: number;
  nodeSpacing?: number;
}

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export async function computeElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Promise<LayoutResult> {
  const {
    direction = 'DOWN',
    spacing = 80,
    nodeSpacing = 50,
  } = options;

  // Separate group nodes from page nodes
  const groupNodes = nodes.filter(n => n.type === 'groupNode');
  const pageNodes = nodes.filter(n => n.type !== 'groupNode');

  // Build group ID → child nodes map
  const groupChildren = new Map<string, ElkNode[]>();
  const ungroupedNodes: ElkNode[] = [];

  for (const node of pageNodes) {
    const parentGroupId = node.parentId; // e.g. "group-marketing"
    const isCompact = node.type === 'compactNode';
    const elkNode: ElkNode = {
      id: node.id,
      width: isCompact ? COMPACT_NODE_WIDTH : DEFAULT_NODE_WIDTH,
      height: isCompact ? COMPACT_NODE_HEIGHT : DEFAULT_NODE_HEIGHT,
    };

    if (parentGroupId) {
      const children = groupChildren.get(parentGroupId) ?? [];
      children.push(elkNode);
      groupChildren.set(parentGroupId, children);
    } else {
      ungroupedNodes.push(elkNode);
    }
  }

  // Build ELK group container nodes
  const elkGroupNodes: ElkNode[] = groupNodes
    .filter(g => (groupChildren.get(g.id)?.length ?? 0) > 0)
    .map(g => ({
      id: g.id,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': String(nodeSpacing),
        'elk.padding': `[top=${GROUP_PADDING_TOP},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
      },
      children: groupChildren.get(g.id) ?? [],
    }));

  // Build ELK edges — split intra-group edges to their group's edges array
  // ELK requires edges at the level of their lowest common ancestor
  const nodeToGroup = new Map<string, string>(); // nodeId → groupNodeId
  for (const node of pageNodes) {
    if (node.parentId) nodeToGroup.set(node.id, node.parentId);
  }

  const rootEdges: ElkExtendedEdge[] = [];
  const groupEdgesMap = new Map<string, ElkExtendedEdge[]>();

  for (const edge of edges) {
    const srcGroup = nodeToGroup.get(edge.source);
    const tgtGroup = nodeToGroup.get(edge.target);
    const elkEdge: ElkExtendedEdge = {
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    };

    if (srcGroup && tgtGroup && srcGroup === tgtGroup) {
      // Intra-group edge: place inside the group
      const existing = groupEdgesMap.get(srcGroup) ?? [];
      existing.push(elkEdge);
      groupEdgesMap.set(srcGroup, existing);
    } else {
      // Cross-group or ungrouped: place at root
      rootEdges.push(elkEdge);
    }
  }

  // Attach intra-group edges to their group ELK nodes
  for (const groupNode of elkGroupNodes) {
    groupNode.edges = groupEdgesMap.get(groupNode.id);
  }

  // Run layout
  const graph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.spacing.edgeEdge': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing),
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: [...elkGroupNodes, ...ungroupedNodes],
    edges: rootEdges,
  });

  // Recursively extract positions
  const positionMap = new Map<string, { x: number; y: number }>();
  const sizeMap = new Map<string, { width: number; height: number }>();

  function extractPositions(elkNode: ElkNode) {
    positionMap.set(elkNode.id, { x: elkNode.x ?? 0, y: elkNode.y ?? 0 });
    if (elkNode.width && elkNode.height) {
      sizeMap.set(elkNode.id, { width: elkNode.width, height: elkNode.height });
    }
    for (const child of elkNode.children ?? []) {
      extractPositions(child);
    }
  }
  for (const child of graph.children ?? []) {
    extractPositions(child);
  }

  // Apply positions to React Flow nodes
  const layoutedNodes = nodes.map(node => {
    const pos = positionMap.get(node.id);
    const size = sizeMap.get(node.id);
    return {
      ...node,
      position: pos ?? node.position,
      ...(node.type === 'groupNode' && size
        ? { style: { ...node.style, width: size.width, height: size.height } }
        : {}),
    };
  });

  // Extract edge bend points from sections (both root edges and intra-group edges)
  const edgePointsMap = new Map<string, { x: number; y: number }[]>();
  function extractEdgePoints(elkEdges: any[]) {
    for (const elkEdge of elkEdges) {
      const points: { x: number; y: number }[] = [];
      for (const section of elkEdge.sections ?? []) {
        if (section.startPoint) points.push(section.startPoint);
        for (const bp of section.bendPoints ?? []) {
          points.push(bp);
        }
        if (section.endPoint) points.push(section.endPoint);
      }
      if (points.length > 0) {
        edgePointsMap.set(elkEdge.id, points);
      }
    }
  }
  // Root-level edges
  extractEdgePoints(graph.edges ?? []);
  // Intra-group edges (inside each group's children)
  for (const child of graph.children ?? []) {
    if (child.edges) extractEdgePoints(child.edges);
  }
  // Attach points to React Flow edges
  const layoutedEdges = edges.map(edge => {
    const points = edgePointsMap.get(edge.id);
    if (points) {
      return {
        ...edge,
        data: { ...edge.data, points },
      };
    }
    return edge;
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
```

- [ ] **Step 2: Build core to verify no type errors**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: **Build will fail** with type errors in NavMap.tsx because the return type changed from `Promise<Node[]>` to `Promise<LayoutResult>`. This is expected — Task 4 fixes NavMap.tsx. Skip to Task 3 (NavEdge) and Task 4 (NavMap) before the next successful build.

- [ ] **Step 3: Commit (layout file only)**

```bash
git add packages/core/src/layout/elkLayout.ts
git commit -m "feat: rewrite ELK layout for compound graph with orthogonal routing"
```

---

## Chunk 2: Edge Renderer + NavMap Integration

### Task 3: Update NavEdge to render orthogonal paths with rounded corners

**Files:**
- Modify: `packages/core/src/components/edges/NavEdge.tsx`

- [ ] **Step 1: Add orthogonal path builder function**

Add a helper function that converts an array of `{x,y}` points into an SVG path string with rounded corners (8px arc radius):

```typescript
function buildOrthogonalPath(
  points: { x: number; y: number }[],
  radius = 8
): string {
  if (points.length < 2) return '';

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Direction vectors
    const dx1 = Math.sign(curr.x - prev.x);
    const dy1 = Math.sign(curr.y - prev.y);
    const dx2 = Math.sign(next.x - curr.x);
    const dy2 = Math.sign(next.y - curr.y);

    // Clamp radius to half the shortest segment
    const seg1 = Math.max(Math.abs(curr.x - prev.x), Math.abs(curr.y - prev.y));
    const seg2 = Math.max(Math.abs(next.x - curr.x), Math.abs(next.y - curr.y));
    const r = Math.min(radius, seg1 / 2, seg2 / 2);

    // Line to start of arc
    const arcStartX = curr.x - dx1 * r;
    const arcStartY = curr.y - dy1 * r;
    parts.push(`L ${arcStartX} ${arcStartY}`);

    // Arc to end point
    const arcEndX = curr.x + dx2 * r;
    const arcEndY = curr.y + dy2 * r;
    parts.push(`Q ${curr.x} ${curr.y} ${arcEndX} ${arcEndY}`);
  }

  // Line to last point
  const last = points[points.length - 1];
  parts.push(`L ${last.x} ${last.y}`);

  return parts.join(' ');
}
```

- [ ] **Step 2: Update NavEdgeComponent to use orthogonal path when points exist**

In the component body, before the bezier path computation, add:

```typescript
const edgeData = data as NavEdgeData | undefined;
const orthogonalPoints = edgeData?.points as { x: number; y: number }[] | undefined;

// Use orthogonal path if ELK provided bend points, otherwise fallback to bezier
let edgePath: string;
let labelX: number;
let labelY: number;

if (orthogonalPoints && orthogonalPoints.length >= 2) {
  edgePath = buildOrthogonalPath(orthogonalPoints);
  // Label at midpoint of path
  const mid = orthogonalPoints[Math.floor(orthogonalPoints.length / 2)];
  labelX = mid.x;
  labelY = mid.y;
} else {
  [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });
}
```

Remove the old `const [edgePath, labelX, labelY] = getBezierPath(...)` line and replace with the above. Keep all existing style logic unchanged.

- [ ] **Step 3: Update NavEdgeData interface**

Add `points` to the interface:

```typescript
interface NavEdgeData {
  label?: string;
  edgeType?: string;
  alwaysShowLabel?: boolean;
  points?: { x: number; y: number }[];
  [key: string]: unknown;
}
```

- [ ] **Step 4: Build core to verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/edges/NavEdge.tsx
git commit -m "feat: add orthogonal edge rendering with rounded corners"
```

---

### Task 4: Update NavMap to use compound layout + collapsed groups + semantic zoom fix

**Files:**
- Modify: `packages/core/src/components/NavMap.tsx`

This is the integration task. Three changes in one file:

- [ ] **Step 1: Update the layout effect to use `LayoutResult` return type**

The current code at ~line 157:
```typescript
const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);
computeElkLayout(rfNodes, rfEdges).then(layoutedNodes => {
  setNodes(layoutedNodes);
  setEdges(rfEdges);
```

Change to:
```typescript
const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);
computeElkLayout(rfNodes, rfEdges).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
  setNodes(layoutedNodes);
  setEdges(layoutedEdges);
  baseEdgesRef.current = layoutedEdges;
```

Also update the `case 'l':` keyboard handler (~line 312). Change from:
```typescript
computeElkLayout(nodes, currentEdges, { direction: e.shiftKey ? 'RIGHT' : 'DOWN' }).then(layoutedNodes => {
  setNodes(layoutedNodes);
  setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
});
```
To:
```typescript
computeElkLayout(nodes, currentEdges, { direction: e.shiftKey ? 'RIGHT' : 'DOWN' }).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
  setNodes(layoutedNodes);
  setEdges(layoutedEdges);
  baseEdgesRef.current = layoutedEdges;
  setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
});
```

- [ ] **Step 2: Add `collapsedGroups` state and `onToggle` wiring**

After the existing state declarations, add:

```typescript
const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

const handleGroupToggle = useCallback((groupId: string, collapsed: boolean) => {
  setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (collapsed) next.add(groupId);
    else next.delete(groupId);
    return next;
  });
}, []);
const handleGroupToggleRef = useRef(handleGroupToggle);
handleGroupToggleRef.current = handleGroupToggle;
```

Then, after building compound nodes, inject `onToggle` into each group node's data:

```typescript
// In the layout effect, after buildGraphFromJson:
for (const node of rfNodes) {
  if (node.type === 'groupNode') {
    (node.data as any).onToggle = handleGroupToggleRef.current;
  }
}
```

- [ ] **Step 3: Filter collapsed children and re-route edges**

Add these two new memos **after** `zoomedNodes` but **before** `styledNodes`. The chain is: `nodes` → `zoomedNodes` → `visibleNodes` → `styledNodes` (dimming). Then `edges` → `visibleEdges` → `styledEdges` (dimming).

Filter out children of collapsed groups:

```typescript
const visibleNodes = useMemo(() => {
  if (collapsedGroups.size === 0) return zoomedNodes;
  return zoomedNodes.filter(node => {
    if (!node.parentId) return true;
    const groupId = node.parentId.slice('group-'.length);
    return !collapsedGroups.has(groupId);
  });
}, [zoomedNodes, collapsedGroups]);
```

For edges, re-route edges targeting collapsed children to the group node:

```typescript
const visibleEdges = useMemo(() => {
  if (collapsedGroups.size === 0) return edges;
  const collapsedChildIds = new Set(
    nodes
      .filter(n => n.parentId && collapsedGroups.has(n.parentId.replace('group-', '')))
      .map(n => n.id)
  );
  return edges.map(edge => {
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
}, [edges, nodes, collapsedGroups]);
```

Use `visibleNodes` and `visibleEdges` in the dimming memos and in the `<ReactFlow>` props instead of `styledNodes`/`styledEdges`.

- [ ] **Step 4: Fix semantic zoom to skip group nodes**

Change the `zoomedNodes` memo from:

```typescript
const zoomedNodes = useMemo(() => {
  if (showDetail) return nodes;
  return nodes.map(node => ({
    ...node,
    type: 'compactNode',
  }));
}, [nodes, showDetail]);
```

To:

```typescript
const zoomedNodes = useMemo(() => {
  if (showDetail) return nodes;
  return nodes.map(node => {
    if (node.type === 'groupNode') return node;
    return { ...node, type: 'compactNode' };
  });
}, [nodes, showDetail]);
```

- [ ] **Step 5: Build core to verify**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds.

- [ ] **Step 6: Start demo and verify in browser**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`
Open http://localhost:3000. Verify:
1. Graph shows 6 colored group containers with member nodes inside
2. Edges route orthogonally around containers with rounded corners
3. Click group header → collapses, children hidden
4. Zoom out → page nodes swap to compact, group containers remain
5. Search, keyboard nav, walkthrough, presentation mode all still work

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/NavMap.tsx
git commit -m "feat: integrate compound layout, collapsed groups, semantic zoom fix"
```

---

## Chunk 3: Update Exports + Final Verification

### Task 5: Update barrel exports and do final build

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add new exports**

Add to the exports:

```typescript
export { buildCompoundNodes } from './utils/graphHelpers';
export type { GroupNodeData } from './components/nodes/GroupNode';
export type { LayoutResult } from './layout/elkLayout';
```

- [ ] **Step 2: Final build of both packages**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`
Expected: Build succeeds.

- [ ] **Step 3: Start demo and run full verification**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`
Verify all items from the spec's Verification section:
1. Graph renders with 6 colored group containers, each containing its member nodes
2. Edges route orthogonally around containers with rounded corners — no crossings
3. Click a group header → collapses, children hidden, edges re-route to group node
4. Semantic zoom at low zoom → page nodes swap to compact, group containers remain
5. All existing features still work: search, keyboard nav, walkthrough, presentation mode, shared nav toggle

- [ ] **Step 4: Commit and push**

```bash
git add packages/core/src/index.ts
git commit -m "feat: export compound layout types, final verification"
git push origin main
```
