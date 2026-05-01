import { act, renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import { useNavMapContextMenu } from './useNavMapContextMenu';

const node: Node = {
  id: 'settings',
  position: { x: 0, y: 0 },
  data: { route: '/settings', filePath: 'app/settings/page.tsx' },
};

describe('useNavMapContextMenu', () => {
  it('opens context menu from a node right-click event', () => {
    const preventDefault = vi.fn();
    const { result } = renderHook(() => useNavMapContextMenu());

    act(() => {
      result.current.onNodeContextMenu(
        { preventDefault, clientX: 120, clientY: 80 } as never,
        node
      );
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.contextMenu).toEqual({
      x: 120,
      y: 80,
      nodeId: 'settings',
      route: '/settings',
      filePath: 'app/settings/page.tsx',
    });
  });

  it('defaults missing route to an empty string', () => {
    const { result } = renderHook(() => useNavMapContextMenu());

    act(() => {
      result.current.onNodeContextMenu(
        { preventDefault: vi.fn(), clientX: 1, clientY: 2 } as never,
        { ...node, data: {} }
      );
    });

    expect(result.current.contextMenu?.route).toBe('');
  });

  it('closes context menu', () => {
    const { result } = renderHook(() => useNavMapContextMenu());

    act(() => {
      result.current.onNodeContextMenu(
        { preventDefault: vi.fn(), clientX: 1, clientY: 2 } as never,
        node
      );
    });
    act(() => {
      result.current.closeContextMenu();
    });

    expect(result.current.contextMenu).toBeNull();
  });
});
