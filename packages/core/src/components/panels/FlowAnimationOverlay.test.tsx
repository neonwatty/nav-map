import { fireEvent, render, screen } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../../types';
import { FlowAnimationOverlay } from './FlowAnimationOverlay';

vi.mock('./FlowAnimator', () => ({
  FlowAnimator: ({ flowSteps }: { flowSteps: string[] }) => (
    <div data-testid="flow-animator">{flowSteps.join(' → ')}</div>
  ),
}));

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Flow Animation Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    { id: 'signup', route: '/signup', label: 'Signup', group: 'root' },
  ],
  edges: [],
  groups: [{ id: 'root', label: 'Root' }],
  flows: [{ name: 'Signup Journey', steps: ['home', 'signup'] }],
};

function renderOverlay(overrides: Partial<React.ComponentProps<typeof FlowAnimationOverlay>> = {}) {
  const props: React.ComponentProps<typeof FlowAnimationOverlay> = {
    isDark: false,
    isAnimatingFlow: true,
    selectedFlowIndex: 0,
    graph,
    layoutDone: true,
    nodes: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    onAnimationEnd: vi.fn(),
    onStop: vi.fn(),
    ...overrides,
  };

  render(<FlowAnimationOverlay {...props} />);
  return props;
}

describe('FlowAnimationOverlay', () => {
  it('announces the selected flow while rendering the animator', () => {
    renderOverlay();

    expect(screen.getByRole('status').textContent).toContain('Animating: Signup Journey');
    expect(screen.getByTestId('flow-animator').textContent).toContain('home → signup');
  });

  it('shows a preparing status when no flow can be rendered', () => {
    renderOverlay({ selectedFlowIndex: null, layoutDone: false });

    expect(screen.getByRole('status').textContent).toContain('Preparing flow animation...');
    expect(screen.queryByTestId('flow-animator')).toBeNull();
  });

  it('passes rendered occurrence ids to the animator for repeated flow nodes', () => {
    const loopingGraph: NavMapGraph = {
      ...graph,
      flows: [{ name: 'Looping Journey', steps: ['home', 'signup', 'home'] }],
    };
    const nodes: Node[] = [
      {
        id: 'flow-0-step-0-home',
        position: { x: 0, y: 0 },
        data: { nodeId: 'home', flowStepNumber: 1 },
      },
      {
        id: 'flow-0-step-1-signup',
        position: { x: 100, y: 0 },
        data: { nodeId: 'signup', flowStepNumber: 2 },
      },
      {
        id: 'flow-0-step-2-home',
        position: { x: 200, y: 0 },
        data: { nodeId: 'home', flowStepNumber: 3 },
      },
    ];

    renderOverlay({ graph: loopingGraph, nodes });

    expect(screen.getByTestId('flow-animator').textContent).toBe(
      'flow-0-step-0-home → flow-0-step-1-signup → flow-0-step-2-home'
    );
  });

  it('lets users stop the animation', () => {
    const onStop = vi.fn();
    renderOverlay({ onStop });

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    expect(onStop).toHaveBeenCalledOnce();
  });
});
