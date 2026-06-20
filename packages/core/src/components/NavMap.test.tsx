import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NavMap } from './NavMap';
import type { NavMapGraph } from '../types';

// Mock ReactFlow to avoid layout/DOM measurement issues in tests
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reactflow">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MiniMap: () => null,
  Controls: () => null,
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  useReactFlow: () => ({
    fitView: vi.fn(),
    setCenter: vi.fn(),
    getViewport: () => ({ zoom: 1 }),
    getNodes: () => [],
  }),
  useStore: () => 1,
  useOnViewportChange: vi.fn(),
}));

const minimalGraph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [{ id: 'n1', route: '/', label: 'Home', group: 'main' }],
  edges: [],
  groups: [{ id: 'main', label: 'Main' }],
};

const flowGraph: NavMapGraph = {
  ...minimalGraph,
  flows: [
    { name: 'Primary Signup', steps: ['n1'] },
    { name: 'Secondary Signup', steps: ['n1'] },
  ],
};

const workflowGraph: NavMapGraph = {
  ...minimalGraph,
  meta: {
    ...minimalGraph.meta,
    name: 'Workflow App',
    workflow: {
      personas: [{ id: 'speaker', label: 'Speaker' }],
      layout: { sectionOrder: ['public', 'speaker'] },
    },
  },
  nodes: [
    {
      id: 'home',
      route: '/',
      label: 'Home',
      group: 'main',
      metadata: {
        section: 'public',
        authRequirement: 'public',
        personas: ['speaker'],
      },
    },
    {
      id: 'dashboard',
      route: '/dashboard',
      label: 'Dashboard',
      group: 'main',
      metadata: {
        section: 'speaker',
        authRequirement: 'speaker',
        personas: ['speaker'],
      },
    },
  ],
  edges: [{ id: 'home-dashboard', source: 'home', target: 'dashboard', type: 'link' }],
};

describe('NavMap props', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();

    // ResizeObserver must be a proper constructor (called with `new`)
    const ResizeObserverMock = vi.fn(function (this: Record<string, unknown>) {
      this.observe = vi.fn();
      this.disconnect = vi.fn();
      this.unobserve = vi.fn();
    });
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    // jsdom does not implement matchMedia — provide a minimal stub
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  });

  it('renders without crashing with minimal props', () => {
    render(<NavMap graph={minimalGraph} />);
    expect(screen.getByTestId('reactflow')).toBeTruthy();
  });

  it('calls onValidationError for invalid graph', async () => {
    const onError = vi.fn();
    const badGraph = { ...minimalGraph, nodes: [] };
    render(<NavMap graph={badGraph} onValidationError={onError} />);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ field: 'nodes' })])
      );
    });
  });

  it('does not call onValidationError for valid graph', async () => {
    const onError = vi.fn();
    render(<NavMap graph={minimalGraph} onValidationError={onError} />);
    // Give effects time to run
    await waitFor(() => {
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it('hides toolbar when hideToolbar is true', () => {
    const { container } = render(<NavMap graph={minimalGraph} hideToolbar />);
    // ViewModeSelector renders mode buttons — if toolbar is hidden, these won't exist
    expect(screen.queryByText('Hierarchy')).toBeNull();
    expect(screen.queryByText('Map')).toBeNull();
    // container must still render
    expect(container.firstChild).toBeTruthy();
  });

  it('can open the help overlay on initial render', () => {
    render(<NavMap graph={minimalGraph} defaultShowHelp />);

    expect(screen.getByText('Start Here')).toBeTruthy();
    expect(screen.getByText('Inspect structure')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Explore map' })).toBeTruthy();
  });

  it('does not show initial help when help is hidden', () => {
    render(<NavMap graph={minimalGraph} defaultShowHelp hideHelp />);

    expect(screen.queryByText('Start Here')).toBeNull();
  });

  it('notifies consumers when the help overlay closes', () => {
    const onHelpClose = vi.fn();
    render(<NavMap graph={minimalGraph} defaultShowHelp onHelpClose={onHelpClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Explore map' }));

    expect(onHelpClose).toHaveBeenCalledOnce();
    expect(screen.queryByText('Start Here')).toBeNull();
  });

  it('selects the first flow when flow mode is active', async () => {
    render(<NavMap graph={flowGraph} defaultViewMode="flow" />);

    expect(await screen.findByText('Flow: Primary Signup')).toBeTruthy();
    expect(screen.getByDisplayValue('Primary Signup')).toBeTruthy();
  });

  it('uses workflow layout default view mode when no prop is provided', async () => {
    render(
      <NavMap
        graph={{
          ...flowGraph,
          meta: {
            ...flowGraph.meta,
            workflow: {
              layout: { defaultViewMode: 'flow', defaultTreeRootId: 'n1' },
            },
          },
        }}
      />
    );

    expect(await screen.findByText('Flow: Primary Signup')).toBeTruthy();
    expect(screen.getByDisplayValue('Primary Signup')).toBeTruthy();
  });

  it('shows and clears an active workflow filter after clicking an overview chip', () => {
    render(<NavMap graph={workflowGraph} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter workflow by auth: Speaker' }));

    expect(screen.getByText('Workflow filter: Auth: Speaker')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear workflow filter' }));

    expect(screen.queryByText('Workflow filter: Auth: Speaker')).toBeNull();
  });

  it('clears an active workflow filter with Escape', () => {
    render(<NavMap graph={workflowGraph} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter workflow by auth: Speaker' }));
    expect(screen.getByText('Workflow filter: Auth: Speaker')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByText('Workflow filter: Auth: Speaker')).toBeNull();
  });

  it('stacks workflow filter banners below flow banners', async () => {
    render(
      <NavMap
        graph={{
          ...workflowGraph,
          flows: [{ name: 'Speaker Flow', steps: ['home', 'dashboard'] }],
        }}
        defaultViewMode="flow"
      />
    );

    const flowBanner = await screen.findByText('Flow: Speaker Flow');
    fireEvent.click(screen.getByRole('button', { name: 'Filter workflow by auth: Speaker' }));

    expect(flowBanner.style.top).toBe('50px');
    expect(screen.getByText('Workflow filter: Auth: Speaker').style.top).toBe('88px');
  });

  it('closes active search when applying a workflow filter', () => {
    render(<NavMap graph={workflowGraph} />);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.change(screen.getByPlaceholderText('Search pages...'), {
      target: { value: 'dashboard' },
    });
    expect(
      screen.getByText('Search is highlighting matching routes and dimming the rest.')
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Filter workflow by auth: Speaker' }));

    expect(screen.getByText('Workflow filter: Auth: Speaker')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Search pages...')).toBeNull();
    expect(
      screen.queryByText('Search is highlighting matching routes and dimming the rest.')
    ).toBeNull();
  });

  it('renders a global preview mode toggle', async () => {
    render(<NavMap graph={minimalGraph} />);

    expect(await screen.findByRole('group', { name: 'Preview render mode' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Render saved screenshots and static surface images' })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Render live app or mockup previews where available' })
    ).toBeTruthy();
  });

  it('keeps the preview mode toolbar above workflow chrome', async () => {
    const { container } = render(<NavMap graph={flowGraph} defaultViewMode="flow" />);

    const previewModeGroup = await screen.findByRole('group', { name: 'Preview render mode' });
    const flowBanner = Array.from(container.querySelectorAll('div')).find(
      element => element.textContent === 'Flow: Primary Signup'
    );
    if (!flowBanner) throw new Error('Expected flow status banner to render');

    const toolbar = previewModeGroup.parentElement;

    expect(toolbar?.style.zIndex).toBe('60');
    expect(flowBanner.style.zIndex).toBe('20');
    expect(Number(toolbar?.style.zIndex)).toBeGreaterThan(Number(flowBanner.style.zIndex));
  });

  it('persists the live preview mode preference', async () => {
    render(<NavMap graph={minimalGraph} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Render live app or mockup previews where available',
      })
    );

    expect(window.localStorage.getItem('nav-map:preview-mode')).toBe('"live"');
  });

  it('runs a scoped live readiness preflight from the Live toggle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 200 })))
    );

    render(
      <NavMap
        graph={{
          ...minimalGraph,
          meta: {
            ...minimalGraph.meta,
            baseUrl: 'http://localhost:3000',
          },
          nodes: [
            { id: 'n1', route: '/', label: 'Home', group: 'main' },
            {
              id: 'concept',
              route: 'prototype://concept',
              label: 'Concept',
              group: 'main',
              metadata: { kind: 'prototype-surface', surfaceType: 'generated-image' },
            },
          ],
        }}
      />
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Render live app or mockup previews where available',
      })
    );

    const summary = await screen.findByLabelText('Live readiness summary');

    await waitFor(() => {
      expect(summary.textContent).toContain('1 ready');
      expect(summary.textContent).toContain('1 static');
    });
  });

  it('loads the persisted live preview mode preference', async () => {
    window.localStorage.setItem('nav-map:preview-mode', '"live"');

    const { unmount } = render(<NavMap graph={minimalGraph} />);
    unmount();
    render(<NavMap graph={minimalGraph} />);

    expect(
      (
        await screen.findByRole('button', {
          name: 'Render live app or mockup previews where available',
        })
      ).getAttribute('aria-pressed')
    ).toBe('true');
  });
});
