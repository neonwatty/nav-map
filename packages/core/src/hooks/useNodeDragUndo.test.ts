import { act, renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import { useNodeDragUndo } from './useNodeDragUndo';

const nodes: Node[] = [
  { id: 'home', position: { x: 10, y: 20 }, parentId: 'root', data: {} },
  { id: 'settings', position: { x: 100, y: 200 }, data: {} },
];

function createNodesRef(current: Node[]): MutableRefObject<Node[]> {
  return { current };
}

describe('useNodeDragUndo', () => {
  it('captures node positions on drag start and pushes them on drag stop', () => {
    const pushSnapshot = vi.fn();
    const nodesRef = createNodesRef(nodes);
    const { result } = renderHook(() => useNodeDragUndo({ nodesRef, pushSnapshot }));

    act(() => {
      result.current.onNodeDragStart();
    });
    nodesRef.current = [{ ...nodes[0], position: { x: 999, y: 999 } }];
    act(() => {
      result.current.onNodeDragStop();
    });

    expect(pushSnapshot).toHaveBeenCalledWith({
      type: 'node-drag',
      nodePositions: [
        { id: 'home', position: { x: 10, y: 20 }, parentId: 'root' },
        { id: 'settings', position: { x: 100, y: 200 }, parentId: undefined },
      ],
    });
  });

  it('does not push a snapshot when drag stop happens without drag start', () => {
    const pushSnapshot = vi.fn();
    const { result } = renderHook(() =>
      useNodeDragUndo({ nodesRef: createNodesRef(nodes), pushSnapshot })
    );

    act(() => {
      result.current.onNodeDragStop();
    });

    expect(pushSnapshot).not.toHaveBeenCalled();
  });

  it('pushes a captured snapshot only once', () => {
    const pushSnapshot = vi.fn();
    const { result } = renderHook(() =>
      useNodeDragUndo({ nodesRef: createNodesRef(nodes), pushSnapshot })
    );

    act(() => {
      result.current.onNodeDragStart();
      result.current.onNodeDragStop();
      result.current.onNodeDragStop();
    });

    expect(pushSnapshot).toHaveBeenCalledTimes(1);
  });
});
