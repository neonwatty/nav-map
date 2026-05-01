import { act, renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import { useNavMapNavigation } from './useNavMapNavigation';

const nodes: Node[] = [
  { id: 'home', position: { x: 10, y: 20 }, data: {} },
  { id: 'settings', position: { x: 100, y: 200 }, data: {} },
];

function renderNavigation(options: Partial<Parameters<typeof useNavMapNavigation>[0]> = {}) {
  return renderHook(props => useNavMapNavigation(props), {
    initialProps: {
      ctx: { setSelectedNodeId: vi.fn() },
      walkthrough: { push: vi.fn() },
      nodes,
      viewMode: 'map' as const,
      setTreeRootId: vi.fn(),
      setCenter: vi.fn(),
      ...options,
    },
  });
}

describe('useNavMapNavigation', () => {
  it('selects nodes and pushes walkthrough history', () => {
    const setSelectedNodeId = vi.fn();
    const push = vi.fn();
    const { result } = renderNavigation({ ctx: { setSelectedNodeId }, walkthrough: { push } });

    act(() => {
      result.current.onSelectionChange({ nodes: [nodes[0]], edges: [] });
    });

    expect(setSelectedNodeId).toHaveBeenCalledWith('home');
    expect(push).toHaveBeenCalledWith('home');
  });

  it('sets tree root when selecting in tree mode', () => {
    const setTreeRootId = vi.fn();
    const { result } = renderNavigation({ viewMode: 'tree', setTreeRootId });

    act(() => {
      result.current.onSelectionChange({ nodes: [nodes[1]], edges: [] });
    });

    expect(setTreeRootId).toHaveBeenCalledWith('settings');
  });

  it('navigates to a node and centers with default navigation zoom', () => {
    const setSelectedNodeId = vi.fn();
    const push = vi.fn();
    const setCenter = vi.fn();
    const { result } = renderNavigation({
      ctx: { setSelectedNodeId },
      walkthrough: { push },
      setCenter,
    });

    act(() => {
      result.current.navigateToNode('settings');
    });

    expect(setSelectedNodeId).toHaveBeenCalledWith('settings');
    expect(push).toHaveBeenCalledWith('settings');
    expect(setCenter).toHaveBeenCalledWith(190, 270, { zoom: 0.8, duration: 300 });
  });

  it('navigates from search with closer zoom and longer duration', () => {
    const setCenter = vi.fn();
    const { result } = renderNavigation({ setCenter });

    act(() => {
      result.current.navigateToNodeFromSearch('home');
    });

    expect(setCenter).toHaveBeenCalledWith(100, 90, { zoom: 1, duration: 600 });
  });
});
