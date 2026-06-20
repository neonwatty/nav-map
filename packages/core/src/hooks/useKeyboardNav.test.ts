import { renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardNav } from './useKeyboardNav';

const nodes: Node[] = [
  { id: 'flow-0-step-0-home', position: { x: 10, y: 20 }, data: { nodeId: 'home' } },
  { id: 'flow-0-step-1-settings', position: { x: 300, y: 400 }, data: { nodeId: 'settings' } },
];

afterEach(() => {
  vi.restoreAllMocks();
});

function renderKeyboardNav(overrides: Partial<Parameters<typeof useKeyboardNav>[0]> = {}) {
  const deps: Parameters<typeof useKeyboardNav>[0] = {
    ctx: { selectedNodeId: 'settings', setSelectedNodeId: vi.fn() },
    graph: {
      version: '1.0',
      meta: { name: 'Keyboard Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
      nodes: [],
      edges: [],
      groups: [],
    },
    walkthrough: {
      path: ['home', 'settings'],
      goBack: vi.fn(),
      clear: vi.fn(),
    },
    nodes,
    showSearch: false,
    showHelp: false,
    showSharedNav: false,
    focusMode: false,
    setShowSearch: vi.fn(),
    setShowHelp: vi.fn(),
    setShowSharedNav: vi.fn(),
    setFocusMode: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    fitView: vi.fn(),
    setCenter: vi.fn(),
    navigateToNode: vi.fn(),
    baseEdgesRef: { current: [] },
    sharedNavEdgesRef: { current: [] },
    focusedGroupId: null,
    setFocusedGroupId: vi.fn(),
    workflowFilterActive: false,
    clearWorkflowFilter: vi.fn(),
    setShowRedirects: vi.fn(),
    undo: vi.fn(),
    canUndo: false,
    setCollapsedGroups: vi.fn(),
    setHierarchyExpandedGroups: vi.fn(),
    ...overrides,
  };

  renderHook(() => useKeyboardNav(deps));
  return deps;
}

describe('useKeyboardNav', () => {
  it('centers on a previous flow occurrence when backtracking by graph node id', () => {
    const deps = renderKeyboardNav();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

    expect(deps.walkthrough.goBack).toHaveBeenCalled();
    expect(deps.ctx.setSelectedNodeId).toHaveBeenCalledWith('home');
    expect(deps.setCenter).toHaveBeenCalledWith(100, 90, { zoom: 0.8, duration: 300 });
  });
});
