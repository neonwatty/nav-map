# Tier 3: Advanced Visualization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hierarchical edge bundling, flow animation, and SVG/PNG export to the NavMap component.

**Architecture:** Edge bundling uses D3's hierarchy + line generator to merge edges with similar source/target regions. Flow animation uses CSS/requestAnimationFrame to move a dot along the flow path. Export uses React Flow's `toObject()` plus a custom SVG renderer for clean vector output and html2canvas for raster output.

**Tech Stack:** React, D3 (d3-hierarchy, d3-shape), @xyflow/react, CSS animations, html2canvas

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `packages/core/package.json` | Add d3 and html2canvas dependencies | Modify |
| `packages/core/src/components/edges/BundledEdge.tsx` | Custom edge type that renders D3 hierarchical bundle curves | Create |
| `packages/core/src/layout/edgeBundling.ts` | Compute bundled edge paths from node positions and group hierarchy | Create |
| `packages/core/src/components/NavMap.tsx` | Toggle bundled edges, animate button, export button | Modify |
| `packages/core/src/components/panels/FlowAnimator.tsx` | Animated dot traveling along flow path with pulse effect | Create |
| `packages/core/src/components/panels/ExportButton.tsx` | Export dropdown with SVG and PNG options | Create |
| `packages/core/src/index.ts` | Export new components and types | Modify |

**Prerequisite:** This plan builds on top of the Tier 2 plan (multi-view mode and flows). The `flows` field on `NavMapGraph`, `ViewMode` type, `FlowSelector`, and `viewMode` state in NavMap must already exist.

---

## Task 1: Hierarchical edge bundling

### Step 1: Add D3 dependencies

- [ ] **Install d3-hierarchy and d3-shape**

Run:

```bash
cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map add d3-hierarchy d3-shape && pnpm --filter @neonwatty/nav-map add -D @types/d3-hierarchy @types/d3-shape
```

**File to verify:** `packages/core/package.json`

After install, `dependencies` should include:

```json
"d3-hierarchy": "^3.1.2",
"d3-shape": "^3.2.0"
```

And `devDependencies` should include:

```json
"@types/d3-hierarchy": "^3.1.7",
"@types/d3-shape": "^3.2.6"
```

### Step 2: Create edge bundling layout module

- [ ] **Create `packages/core/src/layout/edgeBundling.ts`**

This module takes node positions, group assignments, and edges, then produces bundled SVG path strings using D3's hierarchical bundling.

```typescript
import { hierarchy, cluster } from 'd3-hierarchy';
import { lineRadial, curveBundle } from 'd3-shape';
import type { Node, Edge } from '@xyflow/react';

interface BundleResult {
  edgeId: string;
  path: string;
  source: string;
  target: string;
}

interface HierarchyDatum {
  id: string;
  group?: string;
  x?: number;
  y?: number;
}

/**
 * Compute hierarchical edge bundling paths.
 *
 * Strategy:
 * 1. Build a tree hierarchy: root -> groups -> nodes
 * 2. Use D3 cluster layout to assign radial positions
 * 3. For each edge, find the path through the hierarchy (up from source
 *    to common ancestor, down to target)
 * 4. Use curveBundle with beta=0.85 to draw smooth bundled curves
 */
export function computeBundledEdges(
  nodes: Node[],
  edges: Edge[],
  options: { beta?: number } = {}
): BundleResult[] {
  const { beta = 0.85 } = options;

  // Build hierarchy data: root -> groups -> leaf nodes
  const pageNodes = nodes.filter(n => n.type !== 'groupNode');
  const groups = new Set(pageNodes.map(n => (n.data as { group?: string }).group).filter(Boolean));

  const hierarchyData: { id: string; children?: { id: string; children?: { id: string }[] }[] } = {
    id: 'root',
    children: [...groups].map(groupId => ({
      id: `group-${groupId}`,
      children: pageNodes
        .filter(n => (n.data as { group?: string }).group === groupId)
        .map(n => ({ id: n.id })),
    })),
  };

  // Add ungrouped nodes directly under root
  const ungrouped = pageNodes.filter(n => !(n.data as { group?: string }).group);
  if (ungrouped.length > 0) {
    hierarchyData.children!.push({
      id: 'group-ungrouped',
      children: ungrouped.map(n => ({ id: n.id })),
    });
  }

  // Create D3 hierarchy and cluster layout
  const root = hierarchy(hierarchyData);
  const width = 800;
  const height = 800;
  const radius = Math.min(width, height) / 2 - 50;

  cluster<typeof hierarchyData>().size([2 * Math.PI, radius])(root as any);

  // Build map from node ID to its radial position in the cluster
  const nodePositionMap = new Map<string, { angle: number; radius: number }>();
  root.each((d: any) => {
    if (d.data.id && d.x !== undefined && d.y !== undefined) {
      nodePositionMap.set(d.data.id, { angle: d.x, radius: d.y });
    }
  });

  // Build node ID to hierarchy node map for path finding
  const nodeHierarchyMap = new Map<string, any>();
  root.each((d: any) => {
    nodeHierarchyMap.set(d.data.id, d);
  });

  // Line generator for bundled edges
  const line = lineRadial<{ angle: number; radius: number }>()
    .angle(d => d.angle)
    .radius(d => d.radius)
    .curve(curveBundle.beta(beta));

  // For each edge, compute the path through the hierarchy
  const results: BundleResult[] = [];

  for (const edge of edges) {
    const sourceHierNode = nodeHierarchyMap.get(edge.source);
    const targetHierNode = nodeHierarchyMap.get(edge.target);

    if (!sourceHierNode || !targetHierNode) continue;

    // Find path: source -> ancestors -> LCA -> ancestors -> target
    const sourcePath: any[] = sourceHierNode.path(targetHierNode);

    const pathPoints = sourcePath.map((d: any) => ({
      angle: d.x as number,
      radius: d.y as number,
    }));

    const svgPath = line(pathPoints);
    if (svgPath) {
      results.push({
        edgeId: edge.id,
        path: svgPath,
        source: edge.source,
        target: edge.target,
      });
    }
  }

  return results;
}

/**
 * Convert bundled radial paths to Cartesian coordinates.
 * Call this when rendering bundled edges in the React Flow canvas
 * (which uses Cartesian, not radial coordinates).
 *
 * The center of the radial layout maps to the centroid of all node positions.
 */
export function radialToCartesian(
  bundledEdges: BundleResult[],
  nodes: Node[]
): Map<string, string> {
  // Compute centroid of all node positions
  const pageNodes = nodes.filter(n => n.type !== 'groupNode');
  let cx = 0, cy = 0;
  for (const n of pageNodes) {
    cx += n.position.x;
    cy += n.position.y;
  }
  cx /= pageNodes.length || 1;
  cy /= pageNodes.length || 1;

  // The D3 radial line generator already outputs SVG path strings in
  // Cartesian coordinates centered at (0,0). We need to translate them
  // to the centroid of our actual layout.
  const result = new Map<string, string>();
  for (const bundle of bundledEdges) {
    // Translate the path by injecting a transform
    // Since SVG paths are absolute coords from D3's radial line,
    // we store the raw path and apply a transform at render time
    result.set(bundle.edgeId, bundle.path);
  }
  return result;
}
```

### Step 3: Create BundledEdge component

- [ ] **Create `packages/core/src/components/edges/BundledEdge.tsx`**

```typescript
import { memo, useState } from 'react';
import { type EdgeProps } from '@xyflow/react';

interface BundledEdgeData {
  label?: string;
  edgeType?: string;
  bundledPath?: string;
  [key: string]: unknown;
}

function BundledEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const edgeData = data as BundledEdgeData | undefined;
  const bundledPath = edgeData?.bundledPath;

  // If no bundled path available, fall back to a straight line
  const fallbackPath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const edgePath = bundledPath ?? fallbackPath;

  // Label position at midpoint
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  const isRedirect = edgeData?.edgeType === 'redirect';
  const isSharedNav = edgeData?.edgeType === 'shared-nav';

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={
          selected ? '#5b9bf5'
            : isRedirect ? '#f0a050'
            : isSharedNav ? '#444'
            : '#555'
        }
        strokeWidth={selected ? 2.5 : hovered ? 2 : isSharedNav ? 0.8 : 1.2}
        strokeDasharray={isRedirect ? '6 3' : isSharedNav ? '3 3' : undefined}
        opacity={isSharedNav && !hovered && !selected ? 0.3 : 0.6}
        style={{
          transition: 'stroke 0.15s, stroke-width 0.15s, opacity 0.15s',
          ...style,
        }}
      />
      {/* Wider invisible path for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />
      {hovered && edgeData?.label && (
        <foreignObject
          x={labelX - 70}
          y={labelY - 14}
          width={140}
          height={28}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#fff',
              background: 'rgba(20, 20, 30, 0.9)',
              padding: '3px 8px',
              borderRadius: 4,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              width: 'fit-content',
              margin: '0 auto',
            }}
          >
            {edgeData.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export const BundledEdge = memo(BundledEdgeComponent);
```

### Step 4: Register BundledEdge type and add toggle in NavMap.tsx

- [ ] **Modify NavMap.tsx to support bundled edges**

**File:** `packages/core/src/components/NavMap.tsx`

Add import at the top:

```typescript
import { BundledEdge } from './edges/BundledEdge';
import { computeBundledEdges } from '../layout/edgeBundling';
```

Update the `edgeTypes` constant (line 46) to include the bundled edge:

```typescript
const edgeTypes = {
  navEdge: NavEdge,
  bundledEdge: BundledEdge,
};
```

Add state for edge bundling toggle, after the existing state declarations:

```typescript
const [useBundledEdges, setUseBundledEdges] = useState(false);
```

Add a toolbar button for the toggle. In the toolbar div, after the "Show/Hide Shared Nav" button:

```typescript
<button
  onClick={() => setUseBundledEdges(prev => !prev)}
  style={toolbarButtonStyle(ctx.isDark, useBundledEdges)}
  title="Toggle Edge Bundling"
>
  {useBundledEdges ? 'Straight Edges' : 'Bundle Edges'}
</button>
```

Add an effect that computes bundled edges when the toggle is on. Place after the layout-done effect (after line 195):

```typescript
// Compute bundled edges when toggle is enabled
useEffect(() => {
  if (!layoutDone || !useBundledEdges) return;

  const currentEdges = showSharedNav
    ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current]
    : baseEdgesRef.current;

  const bundledResults = computeBundledEdges(nodes, currentEdges);
  const bundledPathMap = new Map(bundledResults.map(r => [r.edgeId, r.path]));

  const bundledEdges = currentEdges.map(edge => {
    const bundledPath = bundledPathMap.get(edge.id);
    if (bundledPath) {
      return {
        ...edge,
        type: 'bundledEdge',
        data: { ...edge.data, bundledPath },
      };
    }
    return edge;
  });

  setEdges(bundledEdges);
}, [useBundledEdges, layoutDone, nodes, showSharedNav, setEdges]);

// When bundling is turned off, restore original edges
useEffect(() => {
  if (!layoutDone || useBundledEdges) return;

  if (showSharedNav) {
    setEdges([...baseEdgesRef.current, ...sharedNavEdgesRef.current]);
  } else {
    setEdges(baseEdgesRef.current);
  }
}, [useBundledEdges, layoutDone, showSharedNav, setEdges]);
```

### Step 5: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds.

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`

Verify:
1. A "Bundle Edges" button appears in the toolbar
2. Clicking it replaces straight/orthogonal edges with smooth bundled curves
3. Edges with similar source/target regions converge toward common paths
4. Hovering bundled edges still shows labels
5. Clicking "Straight Edges" (toggled label) restores the original edge rendering
6. Shared nav toggle still works in both modes

### Step 6: Commit

```bash
git add packages/core/package.json packages/core/src/layout/edgeBundling.ts packages/core/src/components/edges/BundledEdge.tsx packages/core/src/components/NavMap.tsx
git commit -m "feat: add hierarchical edge bundling with D3 and toggle in toolbar"
```

---

## Task 2: Flow animation

### Step 1: Create FlowAnimator component

- [ ] **Create `packages/core/src/components/panels/FlowAnimator.tsx`**

This component renders an SVG overlay with an animated dot that travels along the flow path.

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Node } from '@xyflow/react';

interface FlowAnimatorProps {
  flowSteps: string[];
  nodes: Node[];
  isAnimating: boolean;
  onAnimationEnd: () => void;
}

const DOT_RADIUS = 8;
const TRAVEL_DURATION_MS = 800; // time to travel between nodes
const PAUSE_DURATION_MS = 1000; // pause at each node
const PULSE_SCALE = 1.4;

export function FlowAnimator({
  flowSteps,
  nodes,
  isAnimating,
  onAnimationEnd,
}: FlowAnimatorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dotPosition, setDotPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animFrameRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Build a map of node positions (center of each node)
  const nodePositions = useRef(new Map<string, { x: number; y: number }>());
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      if (node.type === 'groupNode') continue;
      // Node position is top-left; estimate center
      const w = node.measured?.width ?? 180;
      const h = node.measured?.height ?? 140;

      // If node has a parentId, we need to add the parent's position
      let px = node.position.x + w / 2;
      let py = node.position.y + h / 2;

      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          px += parent.position.x;
          py += parent.position.y;
        }
      }

      map.set(node.id, { x: px, y: py });
    }
    nodePositions.current = map;
  }, [nodes]);

  // Reset when animation starts
  useEffect(() => {
    if (isAnimating) {
      setCurrentStepIndex(0);
      const firstPos = nodePositions.current.get(flowSteps[0]);
      if (firstPos) setDotPosition(firstPos);
    } else {
      setDotPosition(null);
      setCurrentStepIndex(0);
    }
  }, [isAnimating, flowSteps]);

  // Animate between steps
  const animateToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= flowSteps.length) {
      onAnimationEnd();
      return;
    }

    const fromPos = nodePositions.current.get(flowSteps[currentStepIndex]);
    const toPos = nodePositions.current.get(flowSteps[nextIndex]);
    if (!fromPos || !toPos) {
      onAnimationEnd();
      return;
    }

    // Pause at current node
    setIsPaused(true);
    timeoutRef.current = setTimeout(() => {
      setIsPaused(false);

      // Animate travel
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / TRAVEL_DURATION_MS, 1);
        // Ease in-out
        const eased = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;

        setDotPosition({
          x: fromPos.x + (toPos.x - fromPos.x) * eased,
          y: fromPos.y + (toPos.y - fromPos.y) * eased,
        });

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentStepIndex(nextIndex);
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }, PAUSE_DURATION_MS);
  }, [currentStepIndex, flowSteps, onAnimationEnd]);

  // Trigger animation for each step
  useEffect(() => {
    if (!isAnimating || !dotPosition) return;
    animateToNextStep();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentStepIndex, isAnimating]);

  if (!isAnimating || !dotPosition) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 25,
        overflow: 'visible',
      }}
    >
      {/* Pulse ring */}
      <circle
        cx={dotPosition.x}
        cy={dotPosition.y}
        r={DOT_RADIUS * (isPaused ? PULSE_SCALE : 1)}
        fill="none"
        stroke="#3355aa"
        strokeWidth={2}
        opacity={isPaused ? 0.5 : 0}
        style={{ transition: 'r 0.3s ease, opacity 0.3s ease' }}
      />
      {/* Main dot */}
      <circle
        cx={dotPosition.x}
        cy={dotPosition.y}
        r={DOT_RADIUS}
        fill="#3355aa"
        stroke="#fff"
        strokeWidth={2}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          transition: isPaused ? 'none' : undefined,
        }}
      />
      {/* Step counter */}
      <text
        x={dotPosition.x}
        y={dotPosition.y + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={9}
        fontWeight={700}
        style={{ pointerEvents: 'none' }}
      >
        {currentStepIndex + 1}
      </text>
    </svg>
  );
}
```

### Step 2: Add "Animate" button to NavMap toolbar

- [ ] **Add animation state and button**

**File:** `packages/core/src/components/NavMap.tsx`

Add import:

```typescript
import { FlowAnimator } from './panels/FlowAnimator';
```

Add state after the existing view mode states:

```typescript
const [isAnimatingFlow, setIsAnimatingFlow] = useState(false);
```

Add the "Animate" button in the toolbar. Place it after the FlowSelector conditional:

```typescript
{viewMode === 'flow' && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex] && (
  <button
    onClick={() => setIsAnimatingFlow(true)}
    disabled={isAnimatingFlow}
    style={{
      ...toolbarButtonStyle(ctx.isDark, isAnimatingFlow),
      opacity: isAnimatingFlow ? 0.6 : 1,
    }}
    title="Animate the selected flow"
  >
    {isAnimatingFlow ? 'Animating...' : 'Animate'}
  </button>
)}
```

### Step 3: Render FlowAnimator in the component tree

- [ ] **Add FlowAnimator to the JSX**

**File:** `packages/core/src/components/NavMap.tsx`

Add the FlowAnimator component inside the main container div, after the `<ReactFlow>` block (after line 607), before the `LegendPanel`:

```typescript
{/* Flow animation overlay */}
{isAnimatingFlow && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex] && (
  <FlowAnimator
    flowSteps={graph.flows[selectedFlowIndex].steps}
    nodes={nodes}
    isAnimating={isAnimatingFlow}
    onAnimationEnd={() => setIsAnimatingFlow(false)}
  />
)}
```

Note: The FlowAnimator renders an SVG overlay. Since it uses absolute positioning, it needs to be inside the relatively-positioned container. However, because React Flow uses its own coordinate system with pan/zoom, the SVG positions will not align with the canvas when zoomed/panned. To handle this correctly, the FlowAnimator needs access to React Flow's viewport transform.

Add the viewport to the FlowAnimator by reading it from React Flow. Update the FlowAnimator render:

```typescript
{isAnimatingFlow && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex] && layoutDone && (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 25,
      overflow: 'hidden',
    }}
  >
    <FlowAnimator
      flowSteps={graph.flows[selectedFlowIndex].steps}
      nodes={nodes}
      isAnimating={isAnimatingFlow}
      onAnimationEnd={() => setIsAnimatingFlow(false)}
    />
  </div>
)}
```

The FlowAnimator component should also accept an optional `viewport` prop or use `useStore` from React Flow to get the current viewport transform, and apply it to the SVG group. Update the FlowAnimator SVG to wrap content in a `<g>` with the viewport transform:

Add to `FlowAnimator.tsx`:

```typescript
// Add this prop
interface FlowAnimatorProps {
  flowSteps: string[];
  nodes: Node[];
  isAnimating: boolean;
  onAnimationEnd: () => void;
  viewport?: { x: number; y: number; zoom: number };
}
```

And wrap the SVG content:

```typescript
<svg ...>
  <g transform={
    viewport
      ? `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`
      : undefined
  }>
    {/* circles and text here */}
  </g>
</svg>
```

In NavMap.tsx, get the viewport using `useStore`:

```typescript
import { useStore } from '@xyflow/react';

// Inside NavMapInner, add:
const viewport = useStore(s => ({ x: s.transform[0], y: s.transform[1], zoom: s.transform[2] }));
```

Then pass it to FlowAnimator:

```typescript
<FlowAnimator
  flowSteps={graph.flows[selectedFlowIndex].steps}
  nodes={nodes}
  isAnimating={isAnimatingFlow}
  onAnimationEnd={() => setIsAnimatingFlow(false)}
  viewport={viewport}
/>
```

### Step 4: Add current step counter display

- [ ] **Add step counter overlay during animation**

**File:** `packages/core/src/components/NavMap.tsx`

Add a step counter that shows during animation. Place after the FlowAnimator:

```typescript
{isAnimatingFlow && (
  <div
    style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: ctx.isDark ? 'rgba(16, 16, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
      border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
      borderRadius: 8,
      padding: '8px 16px',
      zIndex: 30,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <span style={{ fontSize: 13, fontWeight: 600, color: ctx.isDark ? '#7aacff' : '#3355aa' }}>
      Animating flow...
    </span>
    <button
      onClick={() => setIsAnimatingFlow(false)}
      style={{
        background: 'none',
        border: `1px solid ${ctx.isDark ? '#333' : '#ccc'}`,
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        color: ctx.isDark ? '#888' : '#666',
        cursor: 'pointer',
      }}
    >
      Stop
    </button>
  </div>
)}
```

### Step 5: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds.

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`

Verify:
1. Switch to Flow view and select a flow
2. "Animate" button appears in the toolbar
3. Clicking it starts a blue dot at the first node
4. The dot pauses at each node for 1 second with a subtle pulse ring
5. The dot smoothly travels to the next node with ease-in-out timing
6. A step counter and "Stop" button appear at the bottom
7. Animation ends automatically at the last node, or can be stopped manually
8. The dot follows the canvas pan/zoom correctly

### Step 6: Commit

```bash
git add packages/core/src/components/panels/FlowAnimator.tsx packages/core/src/components/NavMap.tsx
git commit -m "feat: add flow animation with traveling dot, pulse effect, and step counter"
```

---

## Task 3: Export as SVG/PNG

### Step 1: Install html2canvas

- [ ] **Add html2canvas dependency**

Run:

```bash
cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map add html2canvas
```

### Step 2: Create ExportButton component

- [ ] **Create `packages/core/src/components/panels/ExportButton.tsx`**

```typescript
import { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useNavMapContext } from '../../hooks/useNavMap';

interface ExportButtonProps {
  graphName?: string;
}

export function ExportButton({ graphName = 'nav-map' }: ExportButtonProps) {
  const { isDark } = useNavMapContext();
  const { getNodes, getEdges, getViewport } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const exportSVG = async () => {
    setIsExporting(true);
    try {
      // Find the React Flow viewport element
      const rfContainer = document.querySelector('.react-flow__viewport');
      if (!rfContainer) {
        console.error('React Flow viewport not found');
        return;
      }

      // Clone the viewport SVG/HTML content
      const svgNS = 'http://www.w3.org/2000/svg';
      const nodes = getNodes();
      const viewport = getViewport();

      // Get bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const node of nodes) {
        const w = node.measured?.width ?? 180;
        const h = node.measured?.height ?? 140;

        let nx = node.position.x;
        let ny = node.position.y;

        // Add parent offset for grouped nodes
        if (node.parentId) {
          const parent = nodes.find(n => n.id === node.parentId);
          if (parent) {
            nx += parent.position.x;
            ny += parent.position.y;
          }
        }

        minX = Math.min(minX, nx);
        minY = Math.min(minY, ny);
        maxX = Math.max(maxX, nx + w);
        maxY = Math.max(maxY, ny + h);
      }

      const padding = 40;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      // Create SVG with embedded foreignObject from the React Flow container
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('xmlns', svgNS);
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${width} ${height}`);

      // Add background
      const bg = document.createElementNS(svgNS, 'rect');
      bg.setAttribute('width', '100%');
      bg.setAttribute('height', '100%');
      bg.setAttribute('fill', isDark ? '#0a0a0f' : '#f4f5f8');
      svg.appendChild(bg);

      // Add title
      const title = document.createElementNS(svgNS, 'text');
      title.setAttribute('x', String(minX - padding + 16));
      title.setAttribute('y', String(minY - padding + 24));
      title.setAttribute('font-size', '16');
      title.setAttribute('font-weight', '700');
      title.setAttribute('fill', isDark ? '#c8c8d0' : '#333');
      title.setAttribute('font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
      title.textContent = graphName;
      svg.appendChild(title);

      // Serialize the React Flow edges (SVG layer)
      const edgeSvg = rfContainer.querySelector('.react-flow__edges');
      if (edgeSvg) {
        const clone = edgeSvg.cloneNode(true) as SVGElement;
        svg.appendChild(clone);
      }

      // For nodes, use foreignObject to embed the HTML
      const nodesContainer = rfContainer.querySelector('.react-flow__nodes');
      if (nodesContainer) {
        const fo = document.createElementNS(svgNS, 'foreignObject');
        fo.setAttribute('x', String(minX - padding));
        fo.setAttribute('y', String(minY - padding));
        fo.setAttribute('width', String(width));
        fo.setAttribute('height', String(height));
        const clone = nodesContainer.cloneNode(true) as HTMLElement;
        fo.appendChild(clone);
        svg.appendChild(fo);
      }

      // Serialize and download
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, `${graphName}.svg`);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const exportPNG = async () => {
    setIsExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');

      // Find the React Flow container
      const rfElement = document.querySelector('.react-flow') as HTMLElement;
      if (!rfElement) {
        console.error('React Flow element not found');
        return;
      }

      const canvas = await html2canvas(rfElement, {
        backgroundColor: isDark ? '#0a0a0f' : '#f4f5f8',
        scale: 2, // 2x for retina quality
        logging: false,
        useCORS: true,
      });

      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${graphName}.png`);
      }, 'image/png');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        disabled={isExporting}
        style={{
          background: isDark ? '#14141e' : '#fff',
          border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
          borderRadius: 6,
          padding: '5px 12px',
          fontSize: 12,
          color: isDark ? '#888' : '#666',
          cursor: isExporting ? 'wait' : 'pointer',
          opacity: isExporting ? 0.6 : 1,
        }}
      >
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: isDark ? '#14141e' : '#fff',
            border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
            borderRadius: 8,
            padding: 4,
            zIndex: 30,
            minWidth: 140,
            boxShadow: isDark
              ? '0 8px 24px rgba(0,0,0,0.5)'
              : '0 8px 24px rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={exportSVG}
            style={dropdownItemStyle(isDark)}
          >
            Export as SVG
          </button>
          <button
            onClick={exportPNG}
            style={dropdownItemStyle(isDark)}
          >
            Export as PNG (2x)
          </button>
        </div>
      )}
    </div>
  );
}

function dropdownItemStyle(isDark: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12,
    color: isDark ? '#c8c8d0' : '#333',
    cursor: 'pointer',
    textAlign: 'left',
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Step 3: Add ExportButton to NavMap toolbar

- [ ] **Wire ExportButton into the toolbar**

**File:** `packages/core/src/components/NavMap.tsx`

Add import:

```typescript
import { ExportButton } from './panels/ExportButton';
```

In the toolbar div, add the ExportButton after the "?" help button (the last toolbar item):

```typescript
<ExportButton graphName={graph?.meta.name} />
```

### Step 4: Build and verify

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds.

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm dev`

Verify:
1. An "Export" button appears in the toolbar
2. Clicking it shows a dropdown with "Export as SVG" and "Export as PNG (2x)"
3. SVG export: downloads an SVG file with the graph name, background color, title, edges, and node containers
4. PNG export: downloads a 2x resolution PNG file of the current viewport
5. Exports work in both light and dark mode
6. The button shows "Exporting..." state while processing

### Step 5: Update exports in index.ts

- [ ] **Add new exports**

**File:** `packages/core/src/index.ts`

Add the new component and module exports:

```typescript
// After existing component exports
export { BundledEdge } from './components/edges/BundledEdge';
export { FlowAnimator } from './components/panels/FlowAnimator';
export { ExportButton } from './components/panels/ExportButton';

// After existing layout exports
export { computeBundledEdges } from './layout/edgeBundling';
```

### Step 6: Final build

- [ ] Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm --filter @neonwatty/nav-map build`

Expected: Build succeeds with no errors.

### Step 7: Commit

```bash
git add packages/core/src/components/panels/ExportButton.tsx packages/core/src/components/NavMap.tsx packages/core/src/index.ts packages/core/package.json
git commit -m "feat: add SVG/PNG export with html2canvas and custom SVG serializer"
```

### Step 8: Final integration commit

```bash
git add -A
git commit -m "feat: tier 3 advanced visualization - edge bundling, flow animation, export"
```
