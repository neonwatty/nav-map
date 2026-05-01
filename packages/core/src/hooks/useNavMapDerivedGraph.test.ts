import { renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { NavMapGraph } from '../types';
import { useNavMapDerivedGraph } from './useNavMapDerivedGraph';

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
  ],
  edges: [],
  groups: [{ id: 'root', label: 'Root' }],
  flows: [{ name: 'Settings flow', steps: ['home', 'settings'] }],
};

const nodes: Node[] = [
  { id: 'group-root', type: 'groupNode', position: { x: 0, y: 0 }, data: {} },
  { id: 'home', type: 'pageNode', position: { x: 0, y: 0 }, data: { label: 'Home' } },
  { id: 'settings', type: 'pageNode', position: { x: 0, y: 0 }, data: { label: 'Settings' } },
];

function renderDerived(options: Partial<Parameters<typeof useNavMapDerivedGraph>[0]> = {}) {
  return renderHook(() =>
    useNavMapDerivedGraph({
      graph,
      nodes,
      zoomTier: 'detail',
      galleryNodeIds: new Set(['home']),
      selectedFlowIndex: 0,
      ...options,
    })
  );
}

describe('useNavMapDerivedGraph', () => {
  it('returns active flow by selected index', () => {
    const { result } = renderDerived();

    expect(result.current.activeFlow?.name).toBe('Settings flow');
  });

  it('maps graph node ids to groups', () => {
    const { result } = renderDerived();

    expect(result.current.nodeGroupMap.get('home')).toBe('root');
    expect(result.current.nodeGroupMap.get('settings')).toBe('app');
  });

  it('marks detail nodes that have gallery data', () => {
    const { result } = renderDerived();

    expect(result.current.zoomedNodes.find(node => node.id === 'home')?.data).toMatchObject({
      hasGallery: true,
    });
    expect(
      result.current.zoomedNodes.find(node => node.id === 'settings')?.data
    ).not.toHaveProperty('hasGallery');
  });

  it('hides page nodes at overview zoom', () => {
    const { result } = renderDerived({ zoomTier: 'overview' });

    const pageNode = result.current.zoomedNodes.find(node => node.id === 'home');
    expect(pageNode?.type).toBe('compactNode');
    expect(pageNode?.style).toMatchObject({ opacity: 0, pointerEvents: 'none' });
  });

  it('uses compact page nodes at compact zoom', () => {
    const { result } = renderDerived({ zoomTier: 'compact' });

    expect(result.current.zoomedNodes.find(node => node.id === 'home')?.type).toBe('compactNode');
    expect(result.current.zoomedNodes.find(node => node.id === 'home')?.data).toMatchObject({
      hasGallery: true,
    });
  });
});
