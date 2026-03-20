import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoHistory } from './useUndoHistory';

describe('useUndoHistory', () => {
  it('starts with canUndo false and empty stack', () => {
    const { result } = renderHook(() => useUndoHistory());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.undo()).toBeNull();
  });

  it('pushSnapshot enables canUndo', () => {
    const { result } = renderHook(() => useUndoHistory());
    act(() => {
      result.current.pushSnapshot({
        type: 'node-drag',
        nodePositions: [{ id: 'a', position: { x: 0, y: 0 } }],
      });
    });
    expect(result.current.canUndo).toBe(true);
  });

  it('undo returns the last pushed entry (LIFO)', () => {
    const { result } = renderHook(() => useUndoHistory());
    const entry1 = {
      type: 'node-drag' as const,
      nodePositions: [{ id: 'a', position: { x: 10, y: 20 } }],
    };
    const entry2 = {
      type: 'node-drag' as const,
      nodePositions: [{ id: 'b', position: { x: 30, y: 40 } }],
    };

    act(() => {
      result.current.pushSnapshot(entry1);
      result.current.pushSnapshot(entry2);
    });

    let undone: ReturnType<typeof result.current.undo>;
    act(() => {
      undone = result.current.undo();
    });
    expect(undone!).toEqual(entry2);

    act(() => {
      undone = result.current.undo();
    });
    expect(undone!).toEqual(entry1);
  });

  it('undo sets canUndo to false when stack is empty', () => {
    const { result } = renderHook(() => useUndoHistory());
    act(() => {
      result.current.pushSnapshot({
        type: 'collapse',
        collapsedGroups: new Set(['auth']),
      });
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(false);
  });

  it('respects maxSize cap', () => {
    const { result } = renderHook(() => useUndoHistory(3));
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.pushSnapshot({
          type: 'node-drag',
          nodePositions: [{ id: String(i), position: { x: i, y: i } }],
        });
      }
    });

    // Should only have last 3 entries
    const entries: ReturnType<typeof result.current.undo>[] = [];
    act(() => {
      entries.push(result.current.undo());
      entries.push(result.current.undo());
      entries.push(result.current.undo());
    });

    expect(entries[0]!).toMatchObject({ nodePositions: [{ id: '4' }] });
    expect(entries[1]!).toMatchObject({ nodePositions: [{ id: '3' }] });
    expect(entries[2]!).toMatchObject({ nodePositions: [{ id: '2' }] });

    // Stack exhausted
    let last: ReturnType<typeof result.current.undo>;
    act(() => {
      last = result.current.undo();
    });
    expect(last!).toBeNull();
    expect(result.current.canUndo).toBe(false);
  });

  it('handles collapse entries', () => {
    const { result } = renderHook(() => useUndoHistory());
    const groups = new Set(['marketing', 'auth']);
    act(() => {
      result.current.pushSnapshot({ type: 'collapse', collapsedGroups: groups });
    });

    let entry: ReturnType<typeof result.current.undo>;
    act(() => {
      entry = result.current.undo();
    });
    expect(entry!.type).toBe('collapse');
    if (entry!.type === 'collapse') {
      expect(entry!.collapsedGroups).toEqual(groups);
    }
  });
});
