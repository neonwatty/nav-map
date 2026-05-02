import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../types';
import { useFlowAutoSelection } from './useFlowAutoSelection';

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Flow Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [{ id: 'home', route: '/', label: 'Home', group: 'root' }],
  edges: [],
  groups: [{ id: 'root', label: 'Root' }],
  flows: [{ name: 'Happy Path', steps: ['home'] }],
};

describe('useFlowAutoSelection', () => {
  it('selects the first flow when entering flow mode with no selection', () => {
    const setSelectedFlowIndex = vi.fn();

    renderHook(() =>
      useFlowAutoSelection({
        graph,
        viewMode: 'flow',
        selectedFlowIndex: null,
        setSelectedFlowIndex,
      })
    );

    expect(setSelectedFlowIndex).toHaveBeenCalledWith(0);
  });

  it('clears stale selections when no flows are available', () => {
    const setSelectedFlowIndex = vi.fn();

    renderHook(() =>
      useFlowAutoSelection({
        graph: { ...graph, flows: [] },
        viewMode: 'map',
        selectedFlowIndex: 2,
        setSelectedFlowIndex,
      })
    );

    expect(setSelectedFlowIndex).toHaveBeenCalledWith(null);
  });
});
