# Preview Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clear prototype/mockup/app artifact labels, a global Screenshots/Live preview preference, live/static/blocked node tabs, selected-node preview explanations, and local dogfooding checks.

**Architecture:** Store artifact and preview capability on node metadata, derive normalized preview state in a small utility, expose the global preview preference through existing NavMap state/context, and keep rendering best-effort. Screenshots remain the default; Live mode only renders inline for eligible selected nodes while non-live nodes keep screenshot fallbacks and clear labels.

**Tech Stack:** TypeScript, React 19, @xyflow/react, Vitest, Testing Library, Next.js demo app.

---

## File Structure

- Modify `packages/core/src/types.ts`: add artifact kind, preview mode, live preview status, blocked reason, and metadata fields.
- Create `packages/core/src/utils/artifactPreview.ts`: normalize artifact kind, preview status, live URL, labels, and explanation copy.
- Create `packages/core/src/utils/artifactPreview.test.ts`: focused unit tests for route, prototype, mockup, live, static, and blocked derivation.
- Modify `packages/core/src/workflowManifest.ts`: accept optional preview metadata on workflow nodes/surfaces and default artifact kinds during conversion.
- Modify `packages/core/src/workflowManifest.test.ts`: verify app/prototype/mockup metadata conversion.
- Modify `packages/core/src/hooks/useNavMap.ts`: add `previewMode` to context so nodes and panels can render consistently.
- Modify `packages/core/src/components/NavMap.tsx`: add persistent `nav-map:preview-mode` state.
- Modify `packages/core/src/components/NavMapShell.tsx`: pass preview mode through context and chrome props.
- Modify `packages/core/src/components/NavMapChrome.tsx`: pass preview mode props into the toolbar.
- Modify `packages/core/src/components/panels/NavMapToolbar.tsx`: render the global `Screenshots | Live` segmented control.
- Create `packages/core/src/components/panels/PreviewModeToggle.tsx`: focused toolbar control.
- Modify `packages/core/src/components/nodes/PageNode.tsx`: render artifact/status border tabs and keep static fallback behavior.
- Create `packages/core/src/components/nodes/PageNode.test.tsx`: verify node tabs and screenshot fallback.
- Modify `packages/core/src/components/panels/ConnectionPanel.tsx`: show preview status explanation and selected-node live iframe when eligible.
- Modify `packages/core/src/components/panels/ConnectionPanel.test.tsx`: verify copy and iframe/fallback states.
- Modify `packages/demo/public/prcard.workflow.json`: add one demo-local HTML mockup surface with live preview metadata.
- Add `packages/demo/public/mockups/prcard-quick-setup.html`: local embeddable mockup for dogfooding only.
- Modify `README.md`: document artifact kinds, preview modes, and dogfooding receipt expectations.

## Task 1: Artifact Preview Types And Utility

**Files:**
- Modify: `packages/core/src/types.ts`
- Create: `packages/core/src/utils/artifactPreview.ts`
- Create: `packages/core/src/utils/artifactPreview.test.ts`

- [ ] **Step 1: Write the failing utility tests**

Add `packages/core/src/utils/artifactPreview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NavMapGraph, NavMapNode } from '../types';
import {
  getArtifactKind,
  getNodePreviewState,
  getPreviewStatusLabel,
  getPreviewStatusMessage,
} from './artifactPreview';

const graph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Preview Demo',
    baseUrl: 'http://localhost:3000',
    generatedAt: '2026-06-19T00:00:00.000Z',
    generatedBy: 'manual',
  },
  nodes: [],
  edges: [],
  groups: [],
};

function node(overrides: Partial<NavMapNode>): NavMapNode {
  return {
    id: 'home',
    route: '/home',
    label: 'Home',
    group: 'app',
    ...overrides,
  };
}

describe('artifact preview helpers', () => {
  it('defaults route nodes to app artifacts with a derived live URL', () => {
    const state = getNodePreviewState(node({ route: '/dashboard' }), graph);

    expect(state.artifactKind).toBe('app');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('http://localhost:3000/dashboard');
    expect(getPreviewStatusLabel(state)).toBe('Live');
  });

  it('defaults prototype surface nodes to static prototype artifacts', () => {
    const prototype = node({
      id: 'concept',
      route: 'prototype://concept',
      metadata: { kind: 'prototype-surface', surfaceType: 'generated-image' },
    });

    const state = getNodePreviewState(prototype, graph);

    expect(getArtifactKind(prototype)).toBe('prototype');
    expect(state.status).toBe('static');
    expect(state.liveUrl).toBeUndefined();
    expect(getPreviewStatusMessage(state)).toBe('Static reference surface. This prototype has no live preview.');
  });

  it('maps html mockup surfaces to mockup artifacts with declared iframe URLs', () => {
    const mockup = node({
      id: 'checkout-mockup',
      route: 'prototype://checkout-mockup',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveUrl: '/mockups/checkout.html',
          liveMode: 'iframe',
          liveStatus: 'available',
          limitations: ['fixture data', 'no real auth'],
        },
      },
    });

    const state = getNodePreviewState(mockup, graph);

    expect(state.artifactKind).toBe('mockup');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('/mockups/checkout.html');
    expect(state.limitations).toEqual(['fixture data', 'no real auth']);
  });

  it('keeps blocked preview reasons explainable', () => {
    const blocked = node({
      route: '/account',
      metadata: {
        preview: {
          liveStatus: 'blocked',
          blockedReason: 'auth-required',
        },
      },
    });

    const state = getNodePreviewState(blocked, graph);

    expect(state.status).toBe('blocked');
    expect(getPreviewStatusLabel(state)).toBe('Blocked');
    expect(getPreviewStatusMessage(state)).toBe('Live preview blocked because authentication is required.');
  });
});
```

- [ ] **Step 2: Run the focused utility test and verify it fails**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/utils/artifactPreview.test.ts
```

Expected: FAIL because `artifactPreview.ts` and new types do not exist.

- [ ] **Step 3: Add preview types**

In `packages/core/src/types.ts`, add these exports near the existing workflow/prototype types:

```ts
export type NavMapArtifactKind = 'prototype' | 'mockup' | 'app';

export type NavMapPreviewMode = 'screenshots' | 'live';

export type NavMapLivePreviewStatus = 'available' | 'static' | 'blocked';

export type NavMapLivePreviewBlockedReason =
  | 'missing-url'
  | 'not-embeddable'
  | 'auth-required'
  | 'offline'
  | 'unsupported';

export interface NavMapPreviewMetadata {
  liveUrl?: string;
  liveMode?: 'iframe' | 'browser' | 'external';
  liveStatus?: NavMapLivePreviewStatus;
  blockedReason?: NavMapLivePreviewBlockedReason;
  interactive?: boolean;
  limitations?: string[];
}
```

Extend `NavMapWorkflowMetadata`:

```ts
  artifactKind?: NavMapArtifactKind;
  preview?: NavMapPreviewMetadata;
```

- [ ] **Step 4: Implement the preview utility**

Create `packages/core/src/utils/artifactPreview.ts`:

```ts
import type {
  NavMapArtifactKind,
  NavMapGraph,
  NavMapLivePreviewBlockedReason,
  NavMapLivePreviewStatus,
  NavMapNode,
} from '../types';

export interface NavMapNodePreviewState {
  artifactKind: NavMapArtifactKind;
  status: NavMapLivePreviewStatus;
  liveUrl?: string;
  liveMode: 'iframe' | 'browser' | 'external';
  blockedReason?: NavMapLivePreviewBlockedReason;
  limitations: string[];
}

export function getArtifactKind(node: NavMapNode): NavMapArtifactKind {
  if (node.metadata?.artifactKind) return node.metadata.artifactKind;
  if (node.metadata?.surfaceType === 'html-mockup') return 'mockup';
  if (node.metadata?.kind === 'prototype-surface' || node.route.startsWith('prototype://')) {
    return 'prototype';
  }
  return 'app';
}

export function getNodePreviewState(
  node: NavMapNode,
  graph?: Pick<NavMapGraph, 'meta'>
): NavMapNodePreviewState {
  const artifactKind = getArtifactKind(node);
  const preview = node.metadata?.preview;
  const liveUrl = preview?.liveUrl ?? deriveAppLiveUrl(node, graph);
  const declaredStatus = preview?.liveStatus;
  const status =
    declaredStatus ?? (artifactKind === 'prototype' ? 'static' : liveUrl ? 'available' : 'blocked');
  const blockedReason =
    status === 'blocked' ? (preview?.blockedReason ?? (liveUrl ? 'unsupported' : 'missing-url')) : undefined;

  return {
    artifactKind,
    status,
    ...(liveUrl ? { liveUrl } : {}),
    liveMode: preview?.liveMode ?? (liveUrl ? 'iframe' : 'browser'),
    ...(blockedReason ? { blockedReason } : {}),
    limitations: Array.isArray(preview?.limitations) ? preview.limitations : [],
  };
}

export function getArtifactKindLabel(kind: NavMapArtifactKind): string {
  if (kind === 'app') return 'App';
  if (kind === 'mockup') return 'Mockup';
  return 'Prototype';
}

export function getPreviewStatusLabel(state: Pick<NavMapNodePreviewState, 'status'>): string {
  if (state.status === 'available') return 'Live';
  if (state.status === 'blocked') return 'Blocked';
  return 'Static';
}

export function getPreviewStatusMessage(state: NavMapNodePreviewState): string {
  if (state.status === 'available' && state.artifactKind === 'app') {
    return 'Live app route preview is available.';
  }
  if (state.status === 'available' && state.artifactKind === 'mockup') {
    return 'Live mockup preview is available.';
  }
  if (state.status === 'static' && state.artifactKind === 'prototype') {
    return 'Static reference surface. This prototype has no live preview.';
  }
  if (state.status === 'static') {
    return 'Static screenshot preview only.';
  }
  return `Live preview blocked because ${formatBlockedReason(state.blockedReason)}.`;
}

function deriveAppLiveUrl(node: NavMapNode, graph?: Pick<NavMapGraph, 'meta'>): string | undefined {
  if (node.route.startsWith('prototype://')) return undefined;
  if (!node.route.startsWith('/')) return undefined;
  if (!graph?.meta.baseUrl) return undefined;
  return `${graph.meta.baseUrl.replace(/\/$/, '')}${node.route}`;
}

function formatBlockedReason(reason?: NavMapLivePreviewBlockedReason): string {
  if (reason === 'auth-required') return 'authentication is required';
  if (reason === 'not-embeddable') return 'the page cannot be embedded inline';
  if (reason === 'offline') return 'the local target is offline';
  if (reason === 'missing-url') return 'no live URL is configured';
  return 'this artifact is unsupported for inline live preview';
}
```

- [ ] **Step 5: Run the focused utility test and verify it passes**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/utils/artifactPreview.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add packages/core/src/types.ts packages/core/src/utils/artifactPreview.ts packages/core/src/utils/artifactPreview.test.ts
git commit -m "feat: derive nav map preview states"
```

## Task 2: Manifest Preview Metadata Conversion

**Files:**
- Modify: `packages/core/src/workflowManifest.ts`
- Modify: `packages/core/src/workflowManifest.test.ts`

- [ ] **Step 1: Write the failing manifest conversion assertions**

In `packages/core/src/workflowManifest.test.ts`, extend `converts prototype surfaces into reusable workflow graph nodes` with a second surface:

```ts
        {
          id: 'dashboard-html-mockup',
          label: 'Dashboard HTML Mockup',
          type: 'html-mockup',
          section: 'prototype',
          screenshot: 'screenshots/prototypes/dashboard-html-mockup.png',
          metadata: {
            preview: {
              liveUrl: '/mockups/dashboard.html',
              liveMode: 'iframe',
              liveStatus: 'available',
              limitations: ['fixture data', 'no real auth'],
            },
          },
        },
```

Update expectations:

```ts
    expect(graph.nodes.map(node => node.id)).toEqual([
      'dashboard',
      'dashboard-concept',
      'dashboard-html-mockup',
    ]);
    expect(graph.nodes[0].metadata?.artifactKind).toBe('app');
    expect(graph.nodes[1].metadata?.artifactKind).toBe('prototype');
    expect(graph.nodes[2]).toMatchObject({
      id: 'dashboard-html-mockup',
      route: 'prototype://dashboard-html-mockup',
      metadata: {
        artifactKind: 'mockup',
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveUrl: '/mockups/dashboard.html',
          liveMode: 'iframe',
          liveStatus: 'available',
          limitations: ['fixture data', 'no real auth'],
        },
      },
    });
```

- [ ] **Step 2: Run the focused manifest test and verify it fails**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/workflowManifest.test.ts
```

Expected: FAIL because route nodes and surfaces do not default `metadata.artifactKind`.

- [ ] **Step 3: Default artifact kinds in manifest conversion**

In `packages/core/src/workflowManifest.ts`, add an app artifact default to route node metadata while preserving explicit manifest metadata:

```ts
    const metadata: NavMapWorkflowMetadata = {
      ...(node.purpose ? { purpose: node.purpose } : {}),
      ...(node.metadata ?? {}),
      artifactKind: node.metadata?.artifactKind ?? 'app',
```

Keep the existing metadata fields in place; the final route metadata block should still include `section`, personas, auth, health, inspect, tags, expectations, and source hints.

In the surface metadata block, add artifact kind after `surfaceType` while preserving explicit manifest metadata:

```ts
      artifactKind:
        surface.metadata?.artifactKind ?? (surface.type === 'html-mockup' ? 'mockup' : 'prototype'),
```

This preserves any `surface.metadata.preview` payload because the existing spread remains first, while the artifact kind receives a predictable default.

- [ ] **Step 4: Run the focused manifest test and verify it passes**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/workflowManifest.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add packages/core/src/workflowManifest.ts packages/core/src/workflowManifest.test.ts
git commit -m "feat: map workflow artifacts to preview metadata"
```

## Task 3: Global Preview Mode State And Toolbar Toggle

**Files:**
- Modify: `packages/core/src/hooks/useNavMap.ts`
- Modify: `packages/core/src/components/NavMap.tsx`
- Modify: `packages/core/src/components/NavMapShell.tsx`
- Modify: `packages/core/src/components/NavMapChrome.tsx`
- Modify: `packages/core/src/components/panels/NavMapToolbar.tsx`
- Create: `packages/core/src/components/panels/PreviewModeToggle.tsx`
- Modify: `packages/core/src/components/NavMap.test.tsx`

- [ ] **Step 1: Write the failing UI test**

In `packages/core/src/components/NavMap.test.tsx`, add:

```ts
  it('renders a global preview mode toggle', async () => {
    render(<NavMap graph={minimalGraph} />);

    expect(await screen.findByRole('button', { name: 'Use screenshot previews' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use live previews where available' })).toBeTruthy();
  });

  it('persists the live preview mode preference', async () => {
    render(<NavMap graph={minimalGraph} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Use live previews where available' }));

    expect(window.localStorage.getItem('nav-map:preview-mode')).toBe('"live"');
  });
```

- [ ] **Step 2: Run the focused NavMap test and verify it fails**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/components/NavMap.test.tsx
```

Expected: FAIL because the preview mode buttons are not rendered.

- [ ] **Step 3: Add preview mode to context**

In `packages/core/src/hooks/useNavMap.ts`, import `NavMapPreviewMode` and extend context:

```ts
import type { NavMapGraph, GroupColors, EdgeMode, NavMapTheme, NavMapPreviewMode } from '../types';
```

Add to `NavMapContextValue`:

```ts
  previewMode: NavMapPreviewMode;
```

Add to `defaultContext`:

```ts
  previewMode: 'screenshots',
```

Update `useNavMapState` return type omission:

```ts
): Omit<NavMapContextValue, 'focusedGroupId' | 'edgeMode' | 'showCoverage' | 'previewMode'> {
```

- [ ] **Step 4: Add PreviewModeToggle**

Create `packages/core/src/components/panels/PreviewModeToggle.tsx`:

```tsx
import type { NavMapPreviewMode } from '../../types';

interface PreviewModeToggleProps {
  value: NavMapPreviewMode;
  isDark: boolean;
  onChange: (mode: NavMapPreviewMode) => void;
}

export function PreviewModeToggle({ value, isDark, onChange }: PreviewModeToggleProps) {
  return (
    <div
      aria-label="Preview mode"
      style={{
        display: 'flex',
        padding: 2,
        borderRadius: 7,
        background: isDark ? '#101018' : '#eef1f6',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
      }}
    >
      <PreviewButton
        label="Screenshots"
        active={value === 'screenshots'}
        isDark={isDark}
        title="Use screenshot previews"
        onClick={() => onChange('screenshots')}
      />
      <PreviewButton
        label="Live"
        active={value === 'live'}
        isDark={isDark}
        title="Use live previews where available"
        onClick={() => onChange('live')}
      />
    </div>
  );
}

function PreviewButton({
  label,
  active,
  isDark,
  title,
  onClick,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      style={{
        border: 0,
        borderRadius: 5,
        padding: '5px 9px',
        fontSize: 12,
        color: active ? '#fff' : isDark ? '#b8bdcc' : '#4f5b6d',
        background: active ? '#3355aa' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 5: Wire preview mode through NavMap**

In `packages/core/src/components/NavMap.tsx`, import `NavMapPreviewMode` and add state near edge mode:

```ts
  const [previewMode, setPreviewMode] = usePersistentState<NavMapPreviewMode>(
    'nav-map:preview-mode',
    'screenshots'
  );
```

Pass `previewMode` and `setPreviewMode` into `NavMapShell`.

In `packages/core/src/components/NavMapShell.tsx`, add props:

```ts
  previewMode: NavMapPreviewMode;
  setPreviewMode: Dispatch<SetStateAction<NavMapPreviewMode>>;
```

Include preview mode in context:

```tsx
<NavMapContext.Provider value={{ ...ctx, focusedGroupId, edgeMode, showCoverage, previewMode: props.previewMode }}>
```

Pass toolbar props through `NavMapChrome`:

```tsx
previewMode={props.previewMode}
onPreviewModeChange={props.setPreviewMode}
```

- [ ] **Step 6: Wire preview mode through chrome and toolbar**

In `packages/core/src/components/NavMapChrome.tsx`, add `previewMode` and `onPreviewModeChange` props and pass them to `NavMapToolbar`.

In `packages/core/src/components/panels/NavMapToolbar.tsx`, import `NavMapPreviewMode` and `PreviewModeToggle`, add props:

```ts
  previewMode: NavMapPreviewMode;
  onPreviewModeChange: (mode: NavMapPreviewMode) => void;
```

Render the toggle after `ViewModeSelector`:

```tsx
      <PreviewModeToggle
        value={previewMode}
        isDark={isDark}
        onChange={onPreviewModeChange}
      />
```

- [ ] **Step 7: Update test contexts**

Add `previewMode: 'screenshots'` to any `NavMapContextValue` test object that TypeScript flags, including:

```ts
  previewMode: 'screenshots',
```

- [ ] **Step 8: Run the focused NavMap test and verify it passes**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/components/NavMap.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

Run:

```bash
git add packages/core/src/hooks/useNavMap.ts packages/core/src/components/NavMap.tsx packages/core/src/components/NavMapShell.tsx packages/core/src/components/NavMapChrome.tsx packages/core/src/components/panels/NavMapToolbar.tsx packages/core/src/components/panels/PreviewModeToggle.tsx packages/core/src/components/NavMap.test.tsx
git commit -m "feat: add global preview mode toggle"
```

## Task 4: Node Border Tabs

**Files:**
- Modify: `packages/core/src/components/nodes/PageNode.tsx`
- Create: `packages/core/src/components/nodes/PageNode.test.tsx`

- [ ] **Step 1: Write failing PageNode tests**

Create `packages/core/src/components/nodes/PageNode.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NodeProps } from '@xyflow/react';
import { NavMapContext, type NavMapContextValue } from '../../hooks/useNavMap';
import { PageNode } from './PageNode';

const context: NavMapContextValue = {
  graph: {
    version: '1.0',
    meta: {
      name: 'Preview Demo',
      baseUrl: 'http://localhost:3000',
      generatedAt: '2026-06-19T00:00:00.000Z',
      generatedBy: 'manual',
    },
    nodes: [],
    edges: [],
    groups: [],
  },
  selectedNodeId: null,
  setSelectedNodeId: vi.fn(),
  isDark: false,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#eef2ff', border: '#3355aa', text: '#222' }),
  focusedGroupId: null,
  edgeMode: 'smooth',
  showCoverage: false,
  previewMode: 'screenshots',
};

function renderPageNode(data: Record<string, unknown>) {
  const props = {
    id: String(data.id ?? 'node'),
    data: {
      id: 'node',
      route: '/node',
      label: 'Node',
      group: 'main',
      ...data,
    },
    selected: false,
    dragging: false,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as unknown as NodeProps;

  return render(
    <NavMapContext.Provider value={context}>
      <PageNode {...props} />
    </NavMapContext.Provider>
  );
}

describe('PageNode preview tabs', () => {
  it('labels app nodes with live availability', () => {
    renderPageNode({ route: '/dashboard', label: 'Dashboard' });

    expect(screen.getByText('App')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('labels generated-image prototype nodes as static', () => {
    renderPageNode({
      route: 'prototype://dashboard-concept',
      label: 'Dashboard Concept',
      metadata: { kind: 'prototype-surface', surfaceType: 'generated-image' },
    });

    expect(screen.getByText('Prototype')).toBeTruthy();
    expect(screen.getByText('Static')).toBeTruthy();
  });

  it('labels blocked app nodes with blocked status', () => {
    renderPageNode({
      route: '/account',
      label: 'Account',
      metadata: { preview: { liveStatus: 'blocked', blockedReason: 'auth-required' } },
    });

    expect(screen.getByText('App')).toBeTruthy();
    expect(screen.getByText('Blocked')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the focused PageNode test and verify it fails**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/components/nodes/PageNode.test.tsx
```

Expected: FAIL because `PageNode` does not render artifact/status tabs.

- [ ] **Step 3: Render artifact/status tabs**

In `packages/core/src/components/nodes/PageNode.tsx`, import:

```ts
import {
  getArtifactKindLabel,
  getNodePreviewState,
  getPreviewStatusLabel,
} from '../../utils/artifactPreview';
```

Read graph from context:

```ts
  const { graph, isDark, getGroupColors, screenshotBasePath, showCoverage } = useNavMapContext();
```

Update the component signature to include the React Flow node id:

```ts
function PageNodeComponent({ id, data, selected }: NodeProps) {
```

Compute preview state with a full node-shaped object:

```ts
  const previewNode = {
    id,
    route: nodeData.route,
    label: nodeData.label,
    group: nodeData.group,
    ...(nodeData.screenshot ? { screenshot: nodeData.screenshot } : {}),
    ...(nodeData.filePath ? { filePath: nodeData.filePath } : {}),
    ...(nodeData.metadata ? { metadata: nodeData.metadata } : {}),
    ...(nodeData.coverage ? { coverage: nodeData.coverage } : {}),
  };
  const previewState = getNodePreviewState(previewNode, graph ?? undefined);
```

Render tabs after flow step number and before the image container:

```tsx
      <div
        style={{
          position: 'absolute',
          top: -10,
          left: 10,
          zIndex: 4,
          display: 'flex',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        <NodeTab isDark={isDark} tone="kind" label={getArtifactKindLabel(previewState.artifactKind)} />
        <NodeTab isDark={isDark} tone={previewState.status} label={getPreviewStatusLabel(previewState)} />
      </div>
```

Add helper below `NodeBadge`:

```tsx
function NodeTab({
  isDark,
  label,
  tone,
}: {
  isDark: boolean;
  label: string;
  tone: 'kind' | 'available' | 'static' | 'blocked';
}) {
  const colors = {
    kind: isDark ? ['#20202c', '#aeb4c8'] : ['#eef1f6', '#4b5565'],
    available: ['#153d2a', '#72e0a4'],
    static: ['#2a2d37', '#bac2d6'],
    blocked: ['#462123', '#ff9a9f'],
  }[tone];

  return (
    <span
      style={{
        height: 18,
        padding: '0 7px',
        borderRadius: 5,
        fontSize: 9,
        lineHeight: '18px',
        fontWeight: 700,
        background: colors[0],
        color: colors[1],
        border: `1px solid ${isDark ? '#333448' : '#cfd6e3'}`,
        boxShadow: '0 2px 5px rgba(0,0,0,0.22)',
      }}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run the PageNode test and verify it passes**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/components/nodes/PageNode.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add packages/core/src/components/nodes/PageNode.tsx packages/core/src/components/nodes/PageNode.test.tsx
git commit -m "feat: label node preview availability"
```

## Task 5: Selected Node Preview Explanation And Live Frame

**Files:**
- Modify: `packages/core/src/components/panels/ConnectionPanel.tsx`
- Modify: `packages/core/src/components/panels/ConnectionPanel.test.tsx`

- [ ] **Step 1: Write failing details panel tests**

In `packages/core/src/components/panels/ConnectionPanel.test.tsx`, add tests:

```tsx
  it('explains static prototype preview status', () => {
    const surfaceNode: NavMapNode = {
      id: 'quick-setup-concept',
      route: 'prototype://quick-setup-concept',
      label: 'Quick Setup Concept',
      group: 'prototype',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'generated-image',
        artifactKind: 'prototype',
      },
    };

    render(
      <NavMapContext.Provider value={context}>
        <ConnectionPanel node={surfaceNode} nodes={[surfaceNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    expect(screen.getByText('Preview Status')).toBeTruthy();
    expect(screen.getByText('Static reference surface. This prototype has no live preview.')).toBeTruthy();
  });

  it('renders selected live mockup iframe in live preview mode', () => {
    const liveContext: NavMapContextValue = {
      ...context,
      previewMode: 'live',
    };
    const mockupNode: NavMapNode = {
      id: 'quick-setup-mockup',
      route: 'prototype://quick-setup-mockup',
      label: 'Quick Setup Mockup',
      group: 'prototype',
      screenshot: 'screenshots/mockup.png',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        artifactKind: 'mockup',
        preview: {
          liveUrl: '/mockups/quick-setup.html',
          liveMode: 'iframe',
          liveStatus: 'available',
          limitations: ['fixture data', 'no real auth'],
        },
      },
    };

    render(
      <NavMapContext.Provider value={liveContext}>
        <ConnectionPanel node={mockupNode} nodes={[mockupNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    expect(screen.getByTitle('Live preview: Quick Setup Mockup').getAttribute('src')).toBe('/mockups/quick-setup.html');
    expect(screen.getByText('Fixture Data')).toBeTruthy();
    expect(screen.getByText('No Real Auth')).toBeTruthy();
  });
```

- [ ] **Step 2: Run the focused ConnectionPanel test and verify it fails**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/components/panels/ConnectionPanel.test.tsx
```

Expected: FAIL because preview status and iframe are not rendered.

- [ ] **Step 3: Render preview explanation and live frame**

In `packages/core/src/components/panels/ConnectionPanel.tsx`, import:

```ts
import {
  getArtifactKindLabel,
  getNodePreviewState,
  getPreviewStatusLabel,
  getPreviewStatusMessage,
} from '../../utils/artifactPreview';
```

Read `previewMode` and graph from context:

```ts
  const { graph, isDark, getGroupColors, screenshotBasePath, previewMode } = useNavMapContext();
```

Compute state:

```ts
  const previewState = getNodePreviewState(node, graph ?? undefined);
```

Replace the screenshot preview body with:

```tsx
        {previewMode === 'live' &&
        previewState.status === 'available' &&
        previewState.liveMode === 'iframe' &&
        previewState.liveUrl ? (
          <iframe
            title={`Live preview: ${node.label}`}
            src={previewState.liveUrl}
            style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
          />
        ) : screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={node.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
```

Inside `WorkflowMetadataSection`, pass `previewState`:

```tsx
        <WorkflowMetadataSection metadata={workflowMetadata} previewState={previewState} isDark={isDark} />
```

Update the function signature and render this block before Purpose:

```tsx
      <PanelBlock label="Preview Status" isDark={isDark}>
        <div style={{ display: 'grid', gap: 8 }}>
          <MetadataRow
            label={getArtifactKindLabel(previewState.artifactKind)}
            value={getPreviewStatusLabel(previewState)}
            isDark={isDark}
          />
          <div style={{ fontSize: 13, lineHeight: 1.45, color: isDark ? '#d0d4e0' : '#333b4a' }}>
            {getPreviewStatusMessage(previewState)}
          </div>
          {previewState.limitations.length > 0 && (
            <BadgeList values={previewState.limitations} isDark={isDark} />
          )}
        </div>
      </PanelBlock>
```

- [ ] **Step 4: Run the focused ConnectionPanel test and verify it passes**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/components/panels/ConnectionPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add packages/core/src/components/panels/ConnectionPanel.tsx packages/core/src/components/panels/ConnectionPanel.test.tsx
git commit -m "feat: explain selected node preview status"
```

## Task 6: Demo Mockup Dogfood Fixture And Docs

**Files:**
- Modify: `packages/demo/public/prcard.workflow.json`
- Add: `packages/demo/public/mockups/prcard-quick-setup.html`
- Modify: `README.md`

- [ ] **Step 1: Add demo-local HTML mockup fixture**

Create `packages/demo/public/mockups/prcard-quick-setup.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PRcard Quick Setup Mockup</title>
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f7fb;
        color: #1f2937;
      }
      main {
        padding: 28px;
        display: grid;
        gap: 18px;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      h1 {
        margin: 0;
        font-size: 24px;
      }
      .panel {
        background: white;
        border: 1px solid #dfe4ee;
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 10px 28px rgba(17, 24, 39, 0.08);
      }
      .steps {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .step {
        border: 1px solid #d6ddeb;
        border-radius: 8px;
        padding: 12px;
        background: #fbfcff;
      }
      button {
        border: 0;
        border-radius: 6px;
        padding: 10px 14px;
        background: #3355aa;
        color: white;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Quick Setup Mockup</h1>
        <button>Preview Card</button>
      </header>
      <section class="panel">
        <p>This local mockup uses fixture data and no real authentication.</p>
        <div class="steps">
          <div class="step"><strong>1. Connect</strong><br />Choose GitHub source.</div>
          <div class="step"><strong>2. Review</strong><br />Inspect generated proof.</div>
          <div class="step"><strong>3. Publish</strong><br />Open creator studio.</div>
        </div>
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Add the mockup surface to the demo manifest**

In `packages/demo/public/prcard.workflow.json`, add a surface after `quick-setup-concept`:

```json
    {
      "id": "quick-setup-html-mockup",
      "label": "Quick Setup HTML Mockup",
      "type": "html-mockup",
      "section": "prototype",
      "purpose": "Local embeddable mockup used to dogfood live preview behavior with fixture data.",
      "screenshot": "screenshots/prcard/quick-setup.webp",
      "sourceHints": ["packages/demo/public/mockups/prcard-quick-setup.html"],
      "metadata": {
        "fidelity": "html-mockup",
        "preview": {
          "liveUrl": "/mockups/prcard-quick-setup.html",
          "liveMode": "iframe",
          "liveStatus": "available",
          "limitations": ["fixture data", "no real auth", "not production"]
        }
      }
    },
```

Add an edge:

```json
    {
      "source": "quick-setup-html-mockup",
      "target": "quick-setup",
      "action": "Mockup realized by route",
      "type": "test-transition",
      "personas": ["signed-in"]
    },
```

Add it to the `GitHub-connected creator` flow immediately after `quick-setup-concept`:

```json
        "quick-setup-concept",
        "quick-setup-html-mockup",
        "quick-setup",
```

- [ ] **Step 3: Update README preview mode docs**

Add a short section near the current prototype surfaces docs:

```md
### Preview Modes

Nav Map distinguishes artifact kind from preview mode. Nodes can represent app routes, mockup artifacts, or prototype surfaces. The global preview toggle chooses whether the map prefers saved screenshots or live previews where available.

- `App · Live`: functioning route with an embeddable or openable live URL.
- `Mockup · Live`: HTML mockup, Storybook story, component harness, or equivalent local artifact.
- `Prototype · Static`: generated image, concept screen, keyframe, video, or component reference with no live page.
- `App · Blocked`: live target exists or is implied, but inline rendering is unavailable because of auth, embedding policy, missing URL, offline target, or unsupported artifact type.

Live mode is best-effort. Nodes that cannot render live keep screenshot fallbacks and explain why in the selected-node panel.
```

Add dogfood receipt guidance:

```md
Preview-mode changes should be dogfooded against a local mockup and a running local app route. Receipts should record commands run, local URLs checked, routes tested, screenshots captured, auth state id if used, failures, warnings, and known limitations. Do not inspect or print Playwright auth storage, cookies, tokens, environment values, or secrets.
```

- [ ] **Step 4: Run formatter check for edited docs and JSON**

Run:

```bash
pnpm format:check
```

Expected: PASS. If it fails only on edited files, run `pnpm format`, review the diff, and keep unrelated generated-file changes out of the commit.

- [ ] **Step 5: Commit Task 6**

Run:

```bash
git add packages/demo/public/prcard.workflow.json packages/demo/public/mockups/prcard-quick-setup.html README.md
git commit -m "docs: add preview mode dogfood fixture"
```

## Task 7: Local Dogfooding Verification

**Files:**
- No code files.
- Record receipts in the final PR description or a follow-up note under `docs/superpowers/plans/2026-06-19-preview-modes-implementation.md` if the implementation worker needs a durable local receipt.

- [ ] **Step 1: Build packages before running the demo**

Run:

```bash
pnpm --filter @neonwatty/nav-map build
pnpm --filter demo build
```

Expected: both commands PASS.

- [ ] **Step 2: Start the demo on an available port**

Run:

```bash
pnpm --dir packages/demo exec next dev -p 3001
```

Expected: Next reports `Ready` and `http://localhost:3001`.

- [ ] **Step 3: Verify the local app URL with HTTP**

Run:

```bash
curl -I 'http://localhost:3001/?dataset=prcard'
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 4: Verify the local mockup URL with HTTP**

Run:

```bash
curl -I 'http://localhost:3001/mockups/prcard-quick-setup.html'
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 5: Dogfood in browser**

Use browser automation or Chrome to open:

```text
http://localhost:3001/?dataset=prcard
```

Verify:

- `Preview: Screenshots | Live` is visible.
- `GitHub-connected creator` flow includes `Quick Setup HTML Mockup`.
- Screenshot mode shows saved images.
- Live mode shows the mockup iframe for `Quick Setup HTML Mockup` when selected.
- `Quick Setup HTML Mockup` node shows `Mockup · Live`.
- `Quick Setup Concept` node shows `Prototype · Static`.
- `/quick-setup` app route shows `App · Live` or `App · Blocked` with the correct explanation based on current embedding/auth behavior.
- Browser console has no new validation errors.

- [ ] **Step 6: Stop the demo server**

Stop the dev server with `Ctrl-C` in the running session.

Expected: no lingering listener on port 3001:

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

Expected output: no rows.

- [ ] **Step 7: Commit dogfood receipt if a durable note was added**

If a receipt file was added, commit it:

```bash
git add docs/superpowers/plans/2026-06-19-preview-modes-implementation.md
git commit -m "test: record preview mode dogfood receipt"
```

If no receipt file was added, include the dogfood receipt in the PR description.

## Task 8: Final Verification

**Files:**
- No new files unless prior tasks changed docs or receipts.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- src/utils/artifactPreview.test.ts src/workflowManifest.test.ts src/components/NavMap.test.tsx src/components/nodes/PageNode.test.tsx src/components/panels/ConnectionPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run package tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map test
```

Expected: PASS.

- [ ] **Step 3: Run full validation**

Run:

```bash
pnpm validate
```

Expected: PASS with existing lint warnings only.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat main...HEAD
```

Expected: only preview-mode implementation, docs, tests, and demo fixture changes are present. `packages/demo/next-env.d.ts` remains unstaged unless the user explicitly asks to include it.

- [ ] **Step 5: Prepare PR**

Run:

```bash
git push -u origin codex/nav-map-preview-modes-spec
gh pr create --title "[codex] add nav map preview modes" --body-file /tmp/nav-map-preview-modes-pr.md
```

PR body should include:

```md
## Summary
- add artifact kind and live preview metadata for prototype, mockup, and app nodes
- add global Screenshots/Live preview toggle and node border tabs
- add selected-node preview explanations and demo mockup dogfood fixture

## Tests
- pnpm --filter @neonwatty/nav-map test -- src/utils/artifactPreview.test.ts src/workflowManifest.test.ts src/components/NavMap.test.tsx src/components/nodes/PageNode.test.tsx src/components/panels/ConnectionPanel.test.tsx
- pnpm --filter @neonwatty/nav-map test
- pnpm validate

## Dogfood
- local demo URL checked: http://localhost:3001/?dataset=prcard
- local mockup URL checked: http://localhost:3001/mockups/prcard-quick-setup.html
- verified Screenshots mode, Live mode, Mockup · Live, Prototype · Static, and app route preview state
- auth storage, cookies, tokens, env values, and secrets were not inspected or printed
```
