import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('NavMap props', () => {
  beforeEach(() => {
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
});
