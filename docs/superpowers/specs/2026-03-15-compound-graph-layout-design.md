# Compound Graph Layout Design

## Problem

The current flat ELK layered layout produces overlapping edges and scattered group members. With 19 nodes, 24 edges, and 6 groups, the graph is hard to read at a glance. The primary use case — full site overview — requires all edges visible, nodes spatially grouped, and minimal edge crossings.

## Solution

Switch to ELK's compound graph layout where each group becomes a container node with child page nodes inside. Use orthogonal edge routing with rounded corners for clean, non-crossing connections.

## Design

### 1. ELK Compound Graph Structure

Restructure the ELK layout call to use nested `children` within group parent nodes:

```
root
├── Marketing (group)  → Home, Blog, Blog Post, Educators, Email Prefs
├── Product (group)    → Bleep, Sampler
├── Studio (group)     → Studio, Project, Settings
├── Premium (group)    → Premium, Edu Plans
├── Auth (group)       → Login, Signup, Reset PW, Update PW, Waitlist
├── Legal (group)      → Terms, Privacy
└── [ungrouped nodes]  → placed directly at root level, siblings of group containers
```

**Ungrouped nodes:** Any page node whose `group` field doesn't match a group in `graph.groups` is placed directly at root level as a sibling of the group containers. This prevents crashes when a node has no valid group.

**Empty groups:** Groups with zero member nodes are omitted from the ELK compound graph input. They're filtered out before the layout call.

ELK layout options:
- Root level: `elk.algorithm: 'layered'`, `elk.edgeRouting: 'ORTHOGONAL'`, `elk.spacing.edgeEdge: '20'`
- Group level: `elk.algorithm: 'layered'`, `elk.direction: 'RIGHT'` (children flow left-to-right within group)
- Cross-group edges are "lifted" to the lowest common ancestor (root) by ELK and routed around containers automatically

### 2. React Flow Node Hierarchy

- Create a React Flow group node for each non-empty `graph.groups` entry, using the existing `GroupNode` component (colored header bar, child count badge, expand/collapse chevron)
- Set `parentId` on each page node pointing to its group's node ID — React Flow positions children relative to the parent
- ELK returns all positions relative to each node's parent. Group nodes get positions relative to root. Child nodes get positions relative to their group container. These map directly to React Flow's coordinate system.

**Position extraction:** The current `elkLayout.ts` only walks `graph.children` one level deep. The rewrite must **recursively traverse** the ELK output to collect positions at every nesting level — group positions from `root.children`, page positions from `root.children[i].children`, plus any ungrouped nodes directly under root.

**Collapsed groups:**
- `NavMap.tsx` maintains a `collapsedGroups: Set<string>` state
- `onToggle` callback is injected into each group node's `data` at construction time, calling `setCollapsedGroups`
- When collapsed: child nodes are filtered out of the rendered array, cross-group edges targeting collapsed children are re-routed to point at the group node, count badge shows connection count
- `onToggle` must be stored as a stable ref to survive React Flow's node state updates

### 3. Edge Rendering — Orthogonal with Rounded Corners

**ELK edge output format:** With orthogonal routing, ELK stores routing information on `edge.sections[]`. Each section has `startPoint`, `endPoint`, and `bendPoints[]`. Cross-container edges may have multiple sections. The layout code must:

1. Extract `edge.sections` from the ELK output during layout computation
2. Flatten each edge's section points into a single `points: {x,y}[]` array (startPoint → bendPoints → endPoint for each section, concatenated)
3. Attach `data.points` to the corresponding React Flow edge object

**NavEdge renderer changes:**
- If `data.points` exists, draw an SVG path from the points array with 8px arc radius at each corner for rounded feel
- If `data.points` is absent (fallback), use `getBezierPath` as today — this ensures backward compatibility
- Edge visual hierarchy is entirely in the style object and survives the path generator change unchanged:
  - Solid lines for `link` edges
  - Dashed for `redirect` edges
  - Thinner/more transparent for `shared-nav` edges
  - Hover shows label tooltip, selected edges highlight blue

Intra-group edges route within the group container. Cross-group edges route through inter-group channels reserved by ELK.

### 4. Semantic Zoom Fix

The current semantic zoom in `NavMap.tsx` maps ALL nodes to `type: 'compactNode'` when zoomed out. With compound layout, this would corrupt group container nodes. The zoom map must **skip nodes where `node.type === 'groupNode'`** — only page nodes swap between `pageNode` and `compactNode`.

### 5. Files Changed

| File | Change |
|------|--------|
| `layout/elkLayout.ts` | Rewrite: build compound graph structure, set orthogonal routing, recursively extract positions, extract edge section bend points and attach to edge data |
| `components/edges/NavEdge.tsx` | Replace `getBezierPath` with custom path builder reading `data.points` + rounded corners. Fallback to bezier if no points. |
| `components/NavMap.tsx` | Create group nodes from `graph.groups`, assign `parentId`, add `collapsedGroups` state with `onToggle` wiring, fix semantic zoom to skip group nodes |
| `utils/graphHelpers.ts` | Update `toReactFlowNodes` to emit group nodes, set `parentId`, filter empty groups, handle ungrouped nodes at root level |

**No changes to:** PageNode, CompactNode, GroupNode components, ConnectionPanel, analytics, scanner CLI, nav-map.json schema.

## Verification

1. `pnpm dev` → graph renders with 6 colored group containers, each containing its member nodes
2. Edges route orthogonally around containers with rounded corners — no crossings
3. Click a group header → collapses, children hidden, edges re-route to group node
4. Semantic zoom at low zoom → page nodes swap to compact, group containers remain
5. All existing features still work: search, keyboard nav, walkthrough, presentation mode, shared nav toggle
