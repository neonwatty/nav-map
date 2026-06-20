import type { Edge, Node } from '@xyflow/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyLayoutResult } from './useViewModeLayoutApply';

afterEach(() => {
  vi.useRealTimers();
});

describe('useViewModeLayoutApply', () => {
  it('can clear stale shared-nav edges when applying occurrence-based layouts', () => {
    vi.useFakeTimers();
    const nodes: Node[] = [{ id: 'flow-0-step-0-home', position: { x: 0, y: 0 }, data: {} }];
    const edges: Edge[] = [
      { id: 'flow-0-edge-0', source: 'flow-0-step-0-home', target: 'flow-0-step-0-home' },
    ];
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const fitView = vi.fn();
    const baseEdgesRef = { current: [] as Edge[] };
    const sharedNavEdgesRef = {
      current: [{ id: 'shared-home-docs', source: 'home', target: 'docs' }] as Edge[],
    };

    applyLayoutResult(nodes, edges, {
      setNodes,
      setEdges,
      baseEdgesRef,
      sharedNavEdgesRef,
      clearSharedNavEdges: true,
      fitView,
      fitViewPadding: 0.2,
    });

    expect(setNodes).toHaveBeenCalledWith(nodes);
    expect(setEdges).toHaveBeenCalledWith(edges);
    expect(baseEdgesRef.current).toBe(edges);
    expect(sharedNavEdgesRef.current).toEqual([]);

    vi.runAllTimers();
    expect(fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });
  });
});
