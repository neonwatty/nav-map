import { act, renderHook, waitFor } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../types';
import { useNavMapHierarchy } from './useNavMapHierarchy';

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
  ],
  edges: [],
  groups: [
    { id: 'root', label: 'Root' },
    { id: 'app', label: 'App' },
  ],
};

const nodes: Node[] = [
  { id: 'root-group', type: 'groupNode', position: { x: 0, y: 0 }, data: { groupId: 'root' } },
  { id: 'home', position: { x: 0, y: 0 }, data: { group: 'root' } },
  { id: 'settings', position: { x: 0, y: 0 }, data: { group: 'app' } },
];

function renderHierarchy(options: Partial<Parameters<typeof useNavMapHierarchy>[0]> = {}) {
  return renderHook(props => useNavMapHierarchy(props), {
    initialProps: {
      graph,
      viewMode: 'hierarchy' as const,
      zoomTier: 'detail' as const,
      nodes,
      fitView: vi.fn(),
      pushSnapshot: vi.fn(),
      ...options,
    },
  });
}

describe('useNavMapHierarchy', () => {
  it('expands all graph groups when hierarchy first loads', async () => {
    const { result } = renderHierarchy();

    await waitFor(() => {
      expect([...result.current.hierarchyExpandedGroups]).toEqual(['root', 'app']);
    });
  });

  it('toggles hierarchy groups with undo snapshots', async () => {
    const pushSnapshot = vi.fn();
    const { result } = renderHierarchy({ pushSnapshot });
    await waitFor(() => {
      expect(result.current.hierarchyExpandedGroups.has('root')).toBe(true);
    });

    act(() => {
      result.current.handleHierarchyToggleRef.current('root');
    });

    expect(result.current.hierarchyExpandedGroups.has('root')).toBe(false);
    expect(pushSnapshot).toHaveBeenCalledWith({
      type: 'hierarchy-toggle',
      expandedGroups: new Set(['root', 'app']),
    });
  });

  it('tracks collapsed groups and clears focus when focused group collapses', async () => {
    const pushSnapshot = vi.fn();
    const { result } = renderHierarchy({ pushSnapshot });

    act(() => {
      result.current.handleGroupDoubleClickRef.current('app');
    });
    await waitFor(() => {
      expect(result.current.focusedGroupId).toBe('app');
    });

    act(() => {
      result.current.handleGroupToggleRef.current('app', true);
    });

    expect(result.current.focusedGroupId).toBeNull();
    expect(result.current.collapsedGroups.has('app')).toBe(true);
    expect(pushSnapshot).toHaveBeenCalledWith({
      type: 'collapse',
      collapsedGroups: new Set(),
    });
  });

  it('fits the focused group nodes when focus changes', async () => {
    const fitView = vi.fn();
    const { result } = renderHierarchy({ fitView });

    act(() => {
      result.current.setFocusedGroupId('root');
    });

    await waitFor(() => {
      expect(fitView).toHaveBeenCalledWith({
        nodes: [{ id: 'root-group' }, { id: 'home' }],
        padding: 0.3,
        duration: 300,
      });
    });
  });

  it('collapses and re-expands hierarchy groups across overview/detail zoom tiers', async () => {
    const { result, rerender } = renderHierarchy({ zoomTier: 'detail' });
    await waitFor(() => {
      expect([...result.current.hierarchyExpandedGroups]).toEqual(['root', 'app']);
    });

    rerender({
      graph,
      viewMode: 'hierarchy',
      zoomTier: 'overview',
      nodes,
      fitView: vi.fn(),
      pushSnapshot: vi.fn(),
    });
    await waitFor(() => {
      expect(result.current.hierarchyExpandedGroups.size).toBe(0);
    });

    rerender({
      graph,
      viewMode: 'hierarchy',
      zoomTier: 'detail',
      nodes,
      fitView: vi.fn(),
      pushSnapshot: vi.fn(),
    });
    await waitFor(() => {
      expect([...result.current.hierarchyExpandedGroups]).toEqual(['root', 'app']);
    });
  });
});
