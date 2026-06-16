# Agentic Workflow Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the workflow overview drivable by humans and agents: overview chips filter/highlight the graph, and the CLI can emit the same filtered workflow context as a stable agent contract.

**Architecture:** Add a small workflow filter contract shared by the React UI and scanner semantics. The core map owns transient `workflowFilter` state and passes match sets into existing graph styling, while scanner `context` gains equivalent `--section`, `--persona`, `--auth`, `--health`, and `--evidence` filters for agent-consumable contracts. Evidence remains redacted and manifest/probe-artifact based; auth storage contents are never read or printed.

**Tech Stack:** React 19, TypeScript, @xyflow/react, Vitest, Next.js demo, Playwright browser verification, existing `nav-map-agent-contract/v1` scanner contract.

---

## File Structure

- Create `packages/core/src/workflowFilters.ts`
  - Pure filter model and matching utilities for section/persona/auth/health/evidence chips.
- Create `packages/core/src/workflowFilters.test.ts`
  - Unit tests for filter options, match sets, labels, and edge inclusion.
- Modify `packages/core/src/components/panels/WorkflowOverview.tsx`
  - Render summary pills as buttons, expose active state, and call `onFilterChange`.
- Modify `packages/core/src/components/NavMapChrome.tsx`
  - Pass active workflow filter state and callbacks to `WorkflowOverview`.
- Modify `packages/core/src/components/NavMapShell.tsx`
  - Thread workflow filter props from `NavMap` into chrome and status banners.
- Modify `packages/core/src/components/NavMap.tsx`
  - Own `workflowFilter`, compute match sets, pass them into graph styling, clear incompatible focus state.
- Modify `packages/core/src/hooks/useGraphStyling.ts`
  - Accept `workflowFocusNodeIds` and `workflowFocusEdgeIds`.
- Modify `packages/core/src/utils/graphStyling.ts`
  - Add workflow focus fields to styling option types.
- Modify `packages/core/src/utils/graphNodeStyling.ts`
  - Dim unrelated nodes and highlight matched nodes for workflow filters.
- Modify `packages/core/src/utils/graphEdgeStyling.ts`
  - Dim unrelated edges and highlight matched edges for workflow filters.
- Modify `packages/core/src/components/panels/StatusBanners.tsx`
  - Show compact active filter banner with a clear action.
- Modify `packages/core/src/components/NavMap.test.tsx`
  - Integration coverage for clicking overview chips and clearing filter.
- Modify `packages/core/src/components/panels/WorkflowOverview.test.tsx`
  - Coverage for button semantics and active chip state.
- Modify `packages/scanner/src/modes/context.ts`
  - Add context filters equivalent to UI chips and include filter summaries in contracts.
- Modify `packages/scanner/src/commands/context.ts`
  - Add CLI flags for section/persona/auth/health/evidence filters.
- Modify `packages/scanner/src/__tests__/context.test.ts`
  - Coverage for filtered payloads and redaction.
- Modify `packages/scanner/src/__tests__/commands.test.ts`
  - Coverage for new context command flags.
- Modify `README.md`
  - Document clickable overview filters and agent CLI equivalents.
- Modify or create GoalBuddy board:
  - `docs/goals/nav-map-agentic-workflow-controls/goal.md`
  - `docs/goals/nav-map-agentic-workflow-controls/state.yaml`

---

## Acceptance Criteria

- Clicking `Sections`, `Personas`, `Auth`, `Health`, or `Evidence` overview chips highlights matching graph nodes and edges within 200 ms and dims unrelated nodes.
- Clicking the active chip again, pressing Escape, or clicking the active filter banner clear button restores the full graph.
- PRcard browser proof: selecting `Auth: Signed In With Github` highlights creator/setup/API nodes and leaves public-only nodes dimmed.
- Deckchecker browser proof: selecting `Auth: Speaker` highlights speaker workspace nodes and leaves admin/planner boundary nodes dimmed.
- CLI proof: `nav-map context packages/demo/public/deckchecker-speaker.workflow.json --auth speaker --format json --contract` emits only speaker-auth routes and no `.nav-map/auth`, storage-state path, cookies, tokens, or secret-shaped values.
- CLI proof: `nav-map context packages/demo/public/prcard.workflow.json --persona signed-in-with-github --evidence screenshot --format json --contract` emits screenshot-backed GitHub-connected context.
- Existing focused tests, scanner tests, build, curl, and Playwright demo proof pass.

---

## Task 1: Core Workflow Filter Model

**Files:**
- Create: `packages/core/src/workflowFilters.ts`
- Create: `packages/core/src/workflowFilters.test.ts`

- [ ] **Step 1: Write failing tests for filter options and matching**

Create `packages/core/src/workflowFilters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NavMapGraph } from './types';
import {
  getWorkflowFilterOptions,
  matchWorkflowFilter,
  workflowFilterKey,
} from './workflowFilters';

const graph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Test Atlas',
    generatedAt: '2026-06-15T00:00:00.000Z',
    generatedBy: 'manual',
    workflow: {
      personas: [
        { id: 'signed-out', label: 'Signed out' },
        { id: 'speaker', label: 'Speaker' },
      ],
      layout: { sectionOrder: ['public', 'speaker', 'boundary'] },
    },
  },
  groups: [{ id: 'main', label: 'Main' }],
  nodes: [
    {
      id: 'landing',
      route: '/',
      label: 'Landing',
      group: 'main',
      screenshot: 'screenshots/landing.png',
      metadata: {
        section: 'public',
        personas: ['signed-out'],
        authRequirement: 'public',
        health: { status: 'healthy' },
      },
    },
    {
      id: 'events',
      route: '/my/events',
      label: 'My Events',
      group: 'main',
      screenshot: 'screenshots/events.png',
      metadata: {
        section: 'speaker',
        personas: ['speaker'],
        authRequirement: 'speaker',
        inspect: { selector: 'main' },
        health: { status: 'warning' },
      },
    },
    {
      id: 'admin',
      route: '/admin/dashboard',
      label: 'Admin Boundary',
      group: 'main',
      metadata: {
        section: 'boundary',
        personas: ['speaker'],
        authRequirement: 'admin',
        expectedRedirects: [{ when: 'speaker', to: '/my/events' }],
      },
    },
  ],
  edges: [
    { id: 'landing-events', source: 'landing', target: 'events', type: 'link', personas: ['speaker'] },
    { id: 'events-admin', source: 'events', target: 'admin', type: 'redirect', personas: ['speaker'] },
  ],
};

describe('workflowFilters', () => {
  it('builds stable filter options from workflow metadata', () => {
    const options = getWorkflowFilterOptions(graph);
    expect(options.map(option => workflowFilterKey(option.filter))).toEqual([
      'section:public',
      'section:speaker',
      'section:boundary',
      'persona:signed-out',
      'persona:speaker',
      'auth:public',
      'auth:speaker',
      'auth:admin',
      'health:healthy',
      'health:warning',
      'evidence:screenshot',
      'evidence:inspect',
      'evidence:redirect',
    ]);
  });

  it('matches nodes and connecting edges for persona filters', () => {
    const match = matchWorkflowFilter(graph, { kind: 'persona', value: 'speaker' });
    expect([...match.nodeIds].sort()).toEqual(['admin', 'events']);
    expect([...match.edgeIds].sort()).toEqual(['events-admin', 'landing-events']);
    expect(match.label).toBe('Persona: Speaker');
  });

  it('matches evidence filters from screenshots, inspect hints, and redirects', () => {
    expect([...matchWorkflowFilter(graph, { kind: 'evidence', value: 'screenshot' }).nodeIds].sort()).toEqual([
      'events',
      'landing',
    ]);
    expect([...matchWorkflowFilter(graph, { kind: 'evidence', value: 'inspect' }).nodeIds]).toEqual(['events']);
    expect([...matchWorkflowFilter(graph, { kind: 'evidence', value: 'redirect' }).edgeIds]).toEqual([
      'events-admin',
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to confirm failure**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- workflowFilters
```

Expected: fails because `packages/core/src/workflowFilters.ts` does not exist.

- [ ] **Step 3: Implement the filter model**

Create `packages/core/src/workflowFilters.ts`:

```ts
import type { NavMapGraph, NavMapHealthStatus } from './types';

export type WorkflowFilterKind = 'section' | 'persona' | 'auth' | 'health' | 'evidence';
export type WorkflowEvidenceKind = 'screenshot' | 'inspect' | 'source-hint' | 'redirect';

export interface WorkflowFilter {
  kind: WorkflowFilterKind;
  value: string;
}

export interface WorkflowFilterOption {
  filter: WorkflowFilter;
  label: string;
  count: number;
}

export interface WorkflowFilterMatch {
  filter: WorkflowFilter;
  label: string;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

const healthOrder: NavMapHealthStatus[] = ['failing', 'warning', 'healthy', 'unchecked', 'unknown'];
const evidenceOrder: WorkflowEvidenceKind[] = ['screenshot', 'inspect', 'source-hint', 'redirect'];

export function workflowFilterKey(filter: WorkflowFilter): string {
  return `${filter.kind}:${filter.value}`;
}

export function workflowFilterLabel(filter: WorkflowFilter): string {
  const prefix =
    filter.kind === 'persona'
      ? 'Persona'
      : filter.kind === 'auth'
        ? 'Auth'
        : filter.kind === 'health'
          ? 'Health'
          : filter.kind === 'evidence'
            ? 'Evidence'
            : 'Section';
  return `${prefix}: ${formatLabel(filter.value)}`;
}

export function workflowFiltersEqual(a: WorkflowFilter | null, b: WorkflowFilter | null): boolean {
  if (!a || !b) return a === b;
  return a.kind === b.kind && a.value === b.value;
}

export function getWorkflowFilterOptions(graph: NavMapGraph | null): WorkflowFilterOption[] {
  if (!graph) return [];

  return [
    ...itemsFromCounts('section', countSections(graph), graph.meta.workflow?.layout?.sectionOrder),
    ...itemsFromCounts('persona', countPersonas(graph), graph.meta.workflow?.personas?.map(p => p.id)),
    ...itemsFromCounts('auth', countAuth(graph)),
    ...itemsFromCounts('health', countHealth(graph), healthOrder),
    ...itemsFromCounts('evidence', countEvidence(graph), evidenceOrder),
  ];
}

export function matchWorkflowFilter(
  graph: NavMapGraph | null,
  filter: WorkflowFilter | null
): WorkflowFilterMatch | null {
  if (!graph || !filter) return null;

  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of graph.nodes) {
    const metadata = node.metadata;
    if (filter.kind === 'section' && metadata?.section === filter.value) nodeIds.add(node.id);
    if (filter.kind === 'persona' && metadata?.personas?.includes(filter.value)) nodeIds.add(node.id);
    if (filter.kind === 'auth' && metadata?.authRequirement === filter.value) nodeIds.add(node.id);
    if (filter.kind === 'health' && metadata?.health?.status === filter.value) nodeIds.add(node.id);
    if (filter.kind === 'evidence' && nodeHasEvidence(node, filter.value)) nodeIds.add(node.id);
  }

  for (const edge of graph.edges) {
    const sourceIn = nodeIds.has(edge.source);
    const targetIn = nodeIds.has(edge.target);
    if (filter.kind === 'persona' && edge.personas?.includes(filter.value)) edgeIds.add(edge.id);
    if (filter.kind === 'evidence' && filter.value === 'redirect' && edge.type === 'redirect') edgeIds.add(edge.id);
    if (sourceIn && targetIn) edgeIds.add(edge.id);
  }

  return { filter, label: workflowFilterLabel(filter), nodeIds, edgeIds };
}

function itemsFromCounts(
  kind: WorkflowFilterKind,
  counts: Map<string, number>,
  preferredOrder: readonly string[] = []
): WorkflowFilterOption[] {
  const order = new Map(preferredOrder.map((value, index) => [value, index]));
  return [...counts.entries()]
    .sort(([a, aCount], [b, bCount]) => {
      const aOrder = order.get(a);
      const bOrder = order.get(b);
      if (aOrder !== undefined || bOrder !== undefined) {
        return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
      }
      if (bCount !== aCount) return bCount - aCount;
      return a.localeCompare(b);
    })
    .map(([value, count]) => ({ filter: { kind, value }, label: formatLabel(value), count }));
}

function countSections(graph: NavMapGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) incrementIf(counts, node.metadata?.section);
  return counts;
}

function countPersonas(graph: NavMapGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) {
    for (const persona of node.metadata?.personas ?? []) incrementIf(counts, persona);
  }
  for (const edge of graph.edges) {
    for (const persona of edge.personas ?? []) incrementIf(counts, persona);
  }
  return counts;
}

function countAuth(graph: NavMapGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) incrementIf(counts, node.metadata?.authRequirement);
  return counts;
}

function countHealth(graph: NavMapGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) incrementIf(counts, node.metadata?.health?.status);
  return counts;
}

function countEvidence(graph: NavMapGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) {
    if (node.screenshot) incrementIf(counts, 'screenshot');
    if (node.metadata?.inspect) incrementIf(counts, 'inspect');
    if (node.metadata?.sourceHints?.length) incrementIf(counts, 'source-hint');
    if (node.metadata?.expectedRedirects?.length) incrementIf(counts, 'redirect');
  }
  for (const edge of graph.edges) {
    if (edge.type === 'redirect') incrementIf(counts, 'redirect');
  }
  return counts;
}

function nodeHasEvidence(node: NavMapGraph['nodes'][number], value: string): boolean {
  if (value === 'screenshot') return Boolean(node.screenshot);
  if (value === 'inspect') return Boolean(node.metadata?.inspect);
  if (value === 'source-hint') return Boolean(node.metadata?.sourceHints?.length);
  if (value === 'redirect') return Boolean(node.metadata?.expectedRedirects?.length);
  return false;
}

function incrementIf(map: Map<string, number>, value?: string) {
  if (!value) return;
  map.set(value, (map.get(value) ?? 0) + 1);
}

function formatLabel(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase());
}
```

- [ ] **Step 4: Run the filter tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- workflowFilters
```

Expected: all `workflowFilters` tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/workflowFilters.ts packages/core/src/workflowFilters.test.ts
git commit -m "feat: add workflow filter model"
```

---

## Task 2: Graph Styling for Workflow Filters

**Files:**
- Modify: `packages/core/src/hooks/useGraphStyling.ts`
- Modify: `packages/core/src/utils/graphStyling.ts`
- Modify: `packages/core/src/utils/graphNodeStyling.ts`
- Modify: `packages/core/src/utils/graphEdgeStyling.ts`
- Modify: `packages/core/src/utils/graphHelpers.test.ts` or create focused styling tests if current test structure prefers it.

- [ ] **Step 1: Add failing styling tests**

Add tests near existing graph styling tests:

```ts
it('dims nodes outside a workflow focus set', () => {
  const styled = styleNodes({
    visibleNodes: [
      { id: 'landing', position: { x: 0, y: 0 }, data: {} },
      { id: 'events', position: { x: 0, y: 0 }, data: {} },
    ],
    filteredEdges: [],
    selectedNodeId: null,
    focusMode: false,
    viewMode: 'map',
    activeFlow: null,
    focusedGroupId: null,
    searchMatchIds: null,
    auditFocusNodeIds: null,
    workflowFocusNodeIds: new Set(['events']),
  });

  expect(styled.find(node => node.id === 'events')?.style?.opacity).toBe(1);
  expect(styled.find(node => node.id === 'landing')?.style?.opacity).toBe(0.14);
});
```

Add equivalent edge test:

```ts
it('highlights workflow focused edges', () => {
  const styled = styleEdges({
    filteredEdges: [{ id: 'events-admin', source: 'events', target: 'admin', type: 'default' }],
    selectedNodeId: null,
    focusMode: false,
    viewMode: 'map',
    activeFlow: null,
    focusedGroupId: null,
    nodeGroupMap: new Map(),
    auditFocusNodeIds: null,
    workflowFocusEdgeIds: new Set(['events-admin']),
  });

  expect(styled[0].style?.opacity).toBe(1);
  expect(styled[0].style?.stroke).toBe('#2563eb');
});
```

- [ ] **Step 2: Run styling tests to confirm failure**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- graphStyling graphHelpers
```

Expected: TypeScript/test failure because `workflowFocusNodeIds` and `workflowFocusEdgeIds` are not accepted.

- [ ] **Step 3: Extend styling option types and hook**

In `packages/core/src/utils/graphStyling.ts`, add:

```ts
  workflowFocusNodeIds: Set<string> | null;
```

to `StyleNodesOptions`, and:

```ts
  workflowFocusEdgeIds: Set<string> | null;
```

to `StyleEdgesOptions`.

In `packages/core/src/hooks/useGraphStyling.ts`, add the same fields to `GraphStylingDeps`, destructure them, pass `workflowFocusNodeIds` into `styleNodes`, pass `workflowFocusEdgeIds` into `styleEdges`, and include them in dependency arrays.

- [ ] **Step 4: Implement workflow focus styling**

In `packages/core/src/utils/graphNodeStyling.ts`, add this branch after search and audit, before flow styling:

```ts
  if (workflowFocusNodeIds && workflowFocusNodeIds.size > 0) {
    return visibleNodes.map(node => styleWorkflowNode(node, workflowFocusNodeIds));
  }
```

Add helper:

```ts
function styleWorkflowNode(node: Node, workflowFocusNodeIds: Set<string>): Node {
  const isFocused = workflowFocusNodeIds.has(node.id);
  return {
    ...node,
    style: {
      ...node.style,
      opacity: isFocused ? 1 : 0.14,
      pointerEvents: (isFocused ? 'auto' : 'none') as CSSProperties['pointerEvents'],
      transition: 'opacity 200ms ease, filter 200ms ease',
      ...(isFocused ? { filter: 'drop-shadow(0 0 7px rgba(37,99,235,0.45))' } : {}),
    },
  };
}
```

In `packages/core/src/utils/graphEdgeStyling.ts`, add this branch after audit:

```ts
  if (workflowFocusEdgeIds && workflowFocusEdgeIds.size > 0) {
    return filteredEdges.map(edge => styleWorkflowEdge(edge, workflowFocusEdgeIds));
  }
```

Add helper:

```ts
function styleWorkflowEdge(edge: Edge, workflowFocusEdgeIds: Set<string>): Edge {
  const isFocused = workflowFocusEdgeIds.has(edge.id);
  return {
    ...edge,
    style: {
      ...edge.style,
      opacity: isFocused ? 1 : 0.08,
      stroke: isFocused ? '#2563eb' : undefined,
      strokeWidth: isFocused ? 2.5 : undefined,
      pointerEvents: (isFocused ? 'auto' : 'none') as CSSProperties['pointerEvents'],
      transition: 'opacity 200ms ease',
    },
  };
}
```

- [ ] **Step 5: Run styling tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- graphStyling graphHelpers
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/hooks/useGraphStyling.ts packages/core/src/utils/graphStyling.ts packages/core/src/utils/graphNodeStyling.ts packages/core/src/utils/graphEdgeStyling.ts packages/core/src/utils/graphHelpers.test.ts
git commit -m "feat: style workflow-filtered graph slices"
```

---

## Task 3: Clickable Overview Chips

**Files:**
- Modify: `packages/core/src/components/panels/WorkflowOverview.tsx`
- Modify: `packages/core/src/components/NavMapChrome.tsx`
- Modify: `packages/core/src/components/NavMapShell.tsx`
- Modify: `packages/core/src/components/NavMap.tsx`
- Modify: `packages/core/src/components/panels/WorkflowOverview.test.tsx`
- Modify: `packages/core/src/components/NavMap.test.tsx`

- [ ] **Step 1: Add failing overview interaction tests**

Extend `packages/core/src/components/panels/WorkflowOverview.test.tsx`:

```ts
import { fireEvent } from '@testing-library/react';

it('calls onFilterChange when a workflow chip is clicked', () => {
  const onFilterChange = vi.fn();
  render(
    <WorkflowOverview
      graph={workflowGraph}
      isDark
      viewMode="flow"
      selectedFlowIndex={0}
      activeFilter={null}
      onFilterChange={onFilterChange}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Filter by section Public, 1 node' }));

  expect(onFilterChange).toHaveBeenCalledWith({ kind: 'section', value: 'public' });
});

it('clears an active chip when clicked again', () => {
  const onFilterChange = vi.fn();
  render(
    <WorkflowOverview
      graph={workflowGraph}
      isDark
      viewMode="flow"
      selectedFlowIndex={0}
      activeFilter={{ kind: 'section', value: 'public' }}
      onFilterChange={onFilterChange}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Clear section Public filter' }));

  expect(onFilterChange).toHaveBeenCalledWith(null);
});
```

- [ ] **Step 2: Run overview tests to confirm failure**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- WorkflowOverview
```

Expected: TypeScript/test failure because `activeFilter` and `onFilterChange` props do not exist.

- [ ] **Step 3: Make overview chips real buttons**

In `WorkflowOverview.tsx`, import:

```ts
import {
  getWorkflowFilterOptions,
  workflowFilterKey,
  workflowFiltersEqual,
  type WorkflowFilter,
} from '../../workflowFilters';
```

Extend props:

```ts
  activeFilter: WorkflowFilter | null;
  onFilterChange: (filter: WorkflowFilter | null) => void;
```

Replace `ItemRow` inputs with `WorkflowFilterOption[]` for sections/personas/auth/health/evidence, and render buttons:

```tsx
<button
  type="button"
  key={workflowFilterKey(item.filter)}
  aria-pressed={isActive}
  aria-label={
    isActive
      ? `Clear ${item.filter.kind} ${item.label} filter`
      : `Filter by ${item.filter.kind} ${item.label}, ${item.count} ${item.count === 1 ? 'node' : 'nodes'}`
  }
  onClick={() => onFilterChange(isActive ? null : item.filter)}
  style={pillButtonStyle(isDark, isActive, colorsById?.[item.filter.value])}
>
  {item.label} <strong>{item.count}</strong>
</button>
```

Keep metric cards non-clickable for this slice; only labeled chips drive filters.

- [ ] **Step 4: Own workflow filter state in NavMap**

In `NavMap.tsx`, import:

```ts
import {
  matchWorkflowFilter,
  type WorkflowFilter,
} from '../workflowFilters';
```

Add state:

```ts
const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter | null>(null);
const workflowFilterMatch = matchWorkflowFilter(graph, workflowFilter);
```

Pass into `useGraphStyling`:

```ts
workflowFocusNodeIds: workflowFilterMatch?.nodeIds ?? null,
workflowFocusEdgeIds: workflowFilterMatch?.edgeIds ?? null,
```

Pass through shell props:

```ts
workflowFilter,
workflowFilterLabel: workflowFilterMatch?.label ?? null,
setWorkflowFilter,
```

- [ ] **Step 5: Thread props through shell and chrome**

In `NavMapShell.tsx`, add props:

```ts
workflowFilter: WorkflowFilter | null;
workflowFilterLabel: string | null;
setWorkflowFilter: Dispatch<SetStateAction<WorkflowFilter | null>>;
```

Pass into `NavMapChrome`.

In `NavMapChrome.tsx`, pass:

```tsx
<WorkflowOverview
  graph={graph}
  isDark={isDark}
  viewMode={viewMode}
  selectedFlowIndex={selectedFlowIndex}
  activeFilter={workflowFilter}
  onFilterChange={onWorkflowFilterChange}
/>
```

- [ ] **Step 6: Add active filter banner**

In `StatusBanners.tsx`, add props:

```ts
workflowFilterLabel?: string | null;
onClearWorkflowFilter?: () => void;
```

Render above explanation banners:

```tsx
{workflowFilterLabel && (
  <div style={{ ...bannerBase(isDark, explanationTop), fontWeight: 600, color: accent }}>
    Workflow filter: {workflowFilterLabel}
    <button onClick={onClearWorkflowFilter} aria-label="Clear workflow filter" style={clearButtonStyle(isDark)}>
      <span aria-hidden="true">&#x2715;</span>
    </button>
  </div>
)}
```

Adjust `explanationTop` so search/focus/coverage text appears below this banner when both are visible.

- [ ] **Step 7: Add NavMap integration test**

Extend `NavMap.test.tsx` with a workflow graph containing public and signed-in nodes:

```ts
it('filters the graph when a workflow overview chip is clicked', async () => {
  render(<NavMap graph={workflowGraph} />);

  fireEvent.click(await screen.findByRole('button', { name: /Filter by auth Signed In/i }));

  expect(screen.getByText('Workflow filter: Auth: Signed In')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Clear workflow filter' }));

  expect(screen.queryByText('Workflow filter: Auth: Signed In')).toBeNull();
});
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- WorkflowOverview NavMap graphStyling
```

Expected: tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/components/panels/WorkflowOverview.tsx packages/core/src/components/NavMapChrome.tsx packages/core/src/components/NavMapShell.tsx packages/core/src/components/NavMap.tsx packages/core/src/components/panels/StatusBanners.tsx packages/core/src/components/panels/WorkflowOverview.test.tsx packages/core/src/components/NavMap.test.tsx
git commit -m "feat: make workflow overview chips filter the map"
```

---

## Task 4: Agent CLI Filters for Matching Context

**Files:**
- Modify: `packages/scanner/src/modes/context.ts`
- Modify: `packages/scanner/src/commands/context.ts`
- Modify: `packages/scanner/src/__tests__/context.test.ts`
- Modify: `packages/scanner/src/__tests__/commands.test.ts`

- [ ] **Step 1: Add failing context tests**

In `packages/scanner/src/__tests__/context.test.ts`, add:

```ts
it('filters context by auth state without exposing auth storage paths', () => {
  const output = renderWorkflowContextContract(manifest, {
    format: 'json',
    focus: [],
    auth: ['speaker'],
    section: [],
    persona: [],
    health: [],
    evidence: [],
    lineBudget: 250,
    manifestPath: 'deckchecker-speaker.workflow.json',
  });
  const contract = JSON.parse(output);

  expect(contract.summary.filters).toEqual({ auth: ['speaker'] });
  expect(contract.data.routes.map((route: { id: string }) => route.id)).toEqual(['speaker-events']);
  expect(JSON.stringify(contract)).not.toContain('.nav-map/auth');
  expect(JSON.stringify(contract)).not.toContain('storageStatePath');
});

it('filters context by screenshot evidence', () => {
  const payload = buildWorkflowContextPayload(manifest, {
    format: 'json',
    focus: [],
    auth: [],
    section: [],
    persona: ['signed-in-with-github'],
    health: [],
    evidence: ['screenshot'],
    lineBudget: 250,
  });

  expect(payload.routes.every(route => route.personas.includes('signed-in-with-github'))).toBe(true);
  expect(payload.routes.every(route => route.evidence.includes('screenshot'))).toBe(true);
});
```

Update fixture route shapes in the test manifest so at least one route has `screenshot`, `inspect`, `sourceHints`, `health`, and `expectedRedirects`.

- [ ] **Step 2: Add failing command flag tests**

In `packages/scanner/src/__tests__/commands.test.ts`, extend the `context` command option assertion:

```ts
expect(optionFlags(command)).toEqual([
  '--auth-state',
  '--focus',
  '--section',
  '--persona',
  '--auth',
  '--health',
  '--evidence',
  '--format',
  '--line-budget',
  '--contract',
  '--output',
]);
```

- [ ] **Step 3: Run scanner tests to confirm failure**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- context commands
```

Expected: failures because new options and payload fields do not exist.

- [ ] **Step 4: Extend ContextOptions and payload**

In `context.ts`, extend `ContextOptions`:

```ts
  section: string[];
  persona: string[];
  auth: string[];
  health: string[];
  evidence: string[];
```

Extend `WorkflowContextNode` with:

```ts
  screenshot?: string;
  health?: string | { status?: string; message?: string };
  inspect?: unknown;
```

Extend `ContextRoute` with:

```ts
  health?: string;
  evidence: string[];
```

Add filter logic:

```ts
function matchesContextFilters(node: WorkflowContextNode, options: ContextOptions): boolean {
  return (
    matchesAny(options.section, node.section) &&
    matchesAny(options.persona, ...(node.personas ?? [])) &&
    matchesAny(options.auth, node.authRequirement) &&
    matchesAny(options.health, getHealthStatus(node)) &&
    matchesAny(options.evidence, ...getEvidenceKinds(node))
  );
}

function matchesAny(filters: readonly string[], ...values: (string | undefined)[]): boolean {
  if (filters.length === 0) return true;
  return values.some(value => value !== undefined && filters.includes(value));
}

function getHealthStatus(node: WorkflowContextNode): string | undefined {
  if (typeof node.health === 'string') return node.health;
  return node.health?.status;
}

function getEvidenceKinds(node: WorkflowContextNode): string[] {
  return [
    node.screenshot ? 'screenshot' : null,
    node.inspect ? 'inspect' : null,
    node.sourceHints?.length ? 'source-hint' : null,
    node.expectedRedirects?.length ? 'redirect' : null,
  ].filter((value): value is string => Boolean(value));
}
```

Use it in `buildWorkflowContextPayload`:

```ts
const focusedNodes = manifest.nodes.filter(node => {
  const nodeId = getNodeId(node);
  const focusMatches =
    options.focus.length === 0 || options.focus.includes(node.section ?? '') || options.focus.includes(nodeId);
  return focusMatches && matchesContextFilters(node, options);
});
```

Include filters in contract summary:

```ts
filters: compactFilters(options),
```

- [ ] **Step 5: Add CLI flags**

In `commands/context.ts`, add:

```ts
.option('--section <section...>', 'Only include workflow sections')
.option('--persona <persona...>', 'Only include routes for personas or auth states')
.option('--auth <auth...>', 'Only include routes with matching auth requirements')
.option('--health <health...>', 'Only include routes with matching health status')
.option('--evidence <kind...>', 'Only include routes with evidence kinds: screenshot, inspect, source-hint, redirect')
```

Build options with arrays:

```ts
const contextOptions = {
  format,
  focus: opts.focus ?? [],
  authState: opts.authState,
  section: opts.section ?? [],
  persona: opts.persona ?? [],
  auth: opts.auth ?? [],
  health: opts.health ?? [],
  evidence: opts.evidence ?? [],
  lineBudget: Number(opts.lineBudget ?? 250),
  manifestPath,
};
```

- [ ] **Step 6: Run scanner tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- context commands
```

Expected: tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/scanner/src/modes/context.ts packages/scanner/src/commands/context.ts packages/scanner/src/__tests__/context.test.ts packages/scanner/src/__tests__/commands.test.ts
git commit -m "feat: filter workflow context contracts"
```

---

## Task 5: Documentation, Demo Proof, and GoalBuddy Board

**Files:**
- Modify: `README.md`
- Create: `docs/goals/nav-map-agentic-workflow-controls/goal.md`
- Create: `docs/goals/nav-map-agentic-workflow-controls/state.yaml`

- [ ] **Step 1: Document the user and agent workflow**

Add to `README.md` under Workflow Atlas Manifests:

````md
### Workflow Filters

Workflow overview chips are interactive when the graph includes workflow metadata. Click a
section, persona, auth, health, or evidence chip to focus matching nodes and connecting edges.
Click the active chip again, press Escape, or clear the workflow filter banner to return to the
full map.

The scanner CLI accepts the same dimensions for agent context:

```bash
nav-map context packages/demo/public/deckchecker-speaker.workflow.json \
  --auth speaker \
  --format json \
  --contract

nav-map context packages/demo/public/prcard.workflow.json \
  --persona signed-in-with-github \
  --evidence screenshot \
  --format json \
  --contract
```

Auth filters are semantic manifest filters. They do not read or print Playwright storage-state
files, cookies, tokens, or session values.
````

- [ ] **Step 2: Create GoalBuddy board**

Create `docs/goals/nav-map-agentic-workflow-controls/goal.md`:

```md
# Nav Map Agentic Workflow Controls

Make workflow overview chips actionable and expose equivalent CLI context filters so users and
agents can reason about the same product slice.

## Oracle

PRcard and Deckchecker demos support clickable workflow filters with browser proof, and
`nav-map context` can emit matching filtered `nav-map-agent-contract/v1` JSON without exposing
auth storage-state paths or secrets.
```

Create `docs/goals/nav-map-agentic-workflow-controls/state.yaml` using GoalBuddy v2 with:

```yaml
version: 2

goal:
  title: 'Nav Map Agentic Workflow Controls'
  slug: 'nav-map-agentic-workflow-controls'
  kind: existing_plan
  tranche: 'Make overview chips interactive and expose equivalent filtered agent context.'
  status: active
  oracle:
    signal: 'PRcard and Deckchecker browser proofs show clicked overview chips focusing the graph, and scanner context contracts match the same filters.'
    cadence: 'after each Worker package and final audit'
    final_proof: 'Focused tests, scanner tests, build, local demo Playwright screenshots, and contract redaction checks.'
  intake:
    original_request: 'Plan the next slice after workflow overview: clickable filters and agent context.'
    interpreted_outcome: 'Implement drivable workflow map filters and agent-consumable equivalents.'
    input_shape: existing_plan
    audience: 'product reviewers, app developers, and coding agents'
    authority: approved_before_execution
    proof_type: demo
    completion_proof: 'Human-clicked and CLI-filtered workflow slices agree for PRcard and Deckchecker.'

active_task: T001

tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: active
    objective: 'Implement Tasks 1-3 from docs/superpowers/plans/2026-06-15-agentic-workflow-controls.md.'
    allowed_files:
      - 'packages/core/src/workflowFilters.ts'
      - 'packages/core/src/workflowFilters.test.ts'
      - 'packages/core/src/components/panels/WorkflowOverview.tsx'
      - 'packages/core/src/components/panels/WorkflowOverview.test.tsx'
      - 'packages/core/src/components/NavMapChrome.tsx'
      - 'packages/core/src/components/NavMapShell.tsx'
      - 'packages/core/src/components/NavMap.tsx'
      - 'packages/core/src/hooks/useGraphStyling.ts'
      - 'packages/core/src/utils/graphStyling.ts'
      - 'packages/core/src/utils/graphNodeStyling.ts'
      - 'packages/core/src/utils/graphEdgeStyling.ts'
      - 'packages/core/src/components/panels/StatusBanners.tsx'
      - 'packages/core/src/components/NavMap.test.tsx'
      - 'docs/goals/nav-map-agentic-workflow-controls/state.yaml'
    verify:
      - 'pnpm --filter @neonwatty/nav-map test -- workflowFilters WorkflowOverview NavMap graphStyling'
      - 'pnpm build'
      - 'Playwright browser proof for PRcard and Deckchecker clicked filters'
    stop_if:
      - 'Need app-specific PRcard or Deckchecker logic in core.'
      - 'Need to inspect auth storage-state contents or secrets.'
      - 'Filter UI overlaps toolbar or makes graph unusable.'
    receipt: null
  - id: T002
    type: worker
    assignee: Worker
    status: queued
    objective: 'Implement Task 4 scanner CLI filters and contract proof.'
    allowed_files:
      - 'packages/scanner/src/modes/context.ts'
      - 'packages/scanner/src/commands/context.ts'
      - 'packages/scanner/src/__tests__/context.test.ts'
      - 'packages/scanner/src/__tests__/commands.test.ts'
      - 'docs/goals/nav-map-agentic-workflow-controls/state.yaml'
    verify:
      - 'pnpm --filter @neonwatty/nav-map-scanner test -- context commands'
      - 'pnpm --filter @neonwatty/nav-map-scanner build'
      - 'node packages/scanner/dist/cli.js context packages/demo/public/deckchecker-speaker.workflow.json --auth speaker --format json --contract -o /tmp/deckchecker-speaker-context-filter.contract.json'
      - 'secret-pattern scan across generated contract'
    stop_if:
      - 'Contract output exposes storage-state paths, cookies, tokens, passwords, or secret-shaped values.'
    receipt: null
  - id: T003
    type: worker
    assignee: Worker
    status: queued
    objective: 'Implement Task 5 docs, browser receipts, and final verification.'
    allowed_files:
      - 'README.md'
      - 'docs/goals/nav-map-agentic-workflow-controls/goal.md'
      - 'docs/goals/nav-map-agentic-workflow-controls/state.yaml'
    verify:
      - 'pnpm build'
      - 'GoalBuddy checker for docs/goals/nav-map-agentic-workflow-controls/state.yaml'
    stop_if:
      - 'Final proof lacks either PRcard or Deckchecker browser receipt.'
    receipt: null
  - id: T999
    type: judge
    assignee: Judge
    status: queued
    objective: 'Final audit for agentic workflow controls.'
    expected_output:
      - 'complete | not_complete'
      - 'full_outcome_complete: true | false'
    receipt: null
```

- [ ] **Step 3: Verify full implementation**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- workflowFilters WorkflowOverview NavMap graphStyling
pnpm --filter @neonwatty/nav-map-scanner test -- context commands
pnpm build
pnpm --filter demo dev --hostname 127.0.0.1 --port 41739
curl -I http://127.0.0.1:41739/
```

Browser proof:

- PRcard: load local demo, click `Auth: Signed In With Github`, confirm matching nodes are highlighted and public-only nodes are dimmed.
- Deckchecker: select Deckchecker speaker dataset, click `Auth: Speaker`, confirm speaker workspace nodes are highlighted and admin/planner boundary nodes are dimmed.
- Capture screenshots to `/tmp/nav-map-prcard-auth-filter.png` and `/tmp/nav-map-deckchecker-speaker-auth-filter.png`.

CLI proof:

```bash
node packages/scanner/dist/cli.js context packages/demo/public/deckchecker-speaker.workflow.json \
  --auth speaker \
  --format json \
  --contract \
  -o /tmp/deckchecker-speaker-context-filter.contract.json

node packages/scanner/dist/cli.js context packages/demo/public/prcard.workflow.json \
  --persona signed-in-with-github \
  --evidence screenshot \
  --format json \
  --contract \
  -o /tmp/prcard-github-screenshot-context-filter.contract.json

rg -i "access_token|refresh_token|id_token|bearer |authorization: basic|cookie|set-cookie|localStorage|BEGIN .*PRIVATE KEY|whsec_|postgres://|postgresql://|password|api_key|secret|storageStatePath|.nav-map/auth" \
  /tmp/deckchecker-speaker-context-filter.contract.json \
  /tmp/prcard-github-screenshot-context-filter.contract.json || true
```

Expected: no secret-shaped strings in either contract.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/goals/nav-map-agentic-workflow-controls
git commit -m "docs: plan agentic workflow controls"
```

---

## Rollout Notes

- Keep chip filtering read-only in the UI. Do not mutate graph layout, route data, manifests, or screenshots.
- Treat auth filters as semantic labels from manifests. Do not open `.nav-map/auth/*.storage.json`.
- Use the existing `nav-map-agent-contract/v1` envelope. Do not introduce another contract version unless the contract shape becomes incompatible.
- Keep PRcard and Deckchecker as fixtures/proof apps only.
- A later Agent Explorer board can consume filtered context plus probe/diff contracts to propose manifest updates.

## Self-Review

- Spec coverage: clickable visual filters, agent context filters, auth-safe handling, evidence grounding, PRcard/Deckchecker proof, and docs are all covered.
- Placeholder scan: no task uses unfinished placeholder language; every code-bearing step includes concrete snippets and expected commands.
- Type consistency: `WorkflowFilter`, `WorkflowFilterOption`, `WorkflowFilterMatch`, and CLI filter fields are named consistently across tasks.
