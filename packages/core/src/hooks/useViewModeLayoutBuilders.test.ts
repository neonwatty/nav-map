import { describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../types';
import {
  buildFlowLayoutInput,
  buildHierarchyLayoutInput,
  buildMapLayoutInput,
  buildTreeLayoutInput,
} from './useViewModeLayoutBuilders';

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01T00:00:00.000Z', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root', screenshot: 'home.png' },
    { id: 'docs', route: '/docs', label: 'Docs', group: 'content' },
    { id: 'billing', route: '/settings/billing', label: 'Billing', group: 'settings' },
    { id: 'team', route: '/settings/team', label: 'Team', group: 'settings' },
  ],
  edges: [
    { id: 'home-docs', source: 'home', target: 'docs', label: 'Docs', type: 'link' },
    { id: 'docs-billing', source: 'docs', target: 'billing', type: 'router-push' },
    { id: 'billing-team', source: 'billing', target: 'team', type: 'link' },
  ],
  groups: [
    { id: 'root', label: 'Root', routePrefix: '/' },
    { id: 'content', label: 'Content', routePrefix: '/docs' },
    { id: 'settings', label: 'Settings', routePrefix: '/settings' },
  ],
  flows: [{ name: 'Checkout', steps: ['home', 'docs', 'billing'] }],
};

describe('useViewModeLayout builders', () => {
  it('builds flow nodes with step numbers and matching graph edges', () => {
    const layout = buildFlowLayoutInput(graph, 0);

    expect(layout?.nodes.map(node => [node.id, node.data.flowStepNumber])).toEqual([
      ['home', 1],
      ['docs', 2],
      ['billing', 3],
    ]);
    expect(layout?.edges).toEqual([
      expect.objectContaining({
        id: 'home-docs',
        source: 'home',
        target: 'docs',
        data: { label: 'Docs', edgeType: 'link' },
      }),
      expect.objectContaining({
        id: 'docs-billing',
        source: 'docs',
        target: 'billing',
        data: { label: '', edgeType: 'router-push' },
      }),
    ]);
  });

  it('returns null when the selected flow does not exist', () => {
    expect(buildFlowLayoutInput(graph, 99)).toBeNull();
  });

  it('builds a reachable tree and positions unreachable nodes aside', () => {
    const layout = buildTreeLayoutInput(graph, 'docs');

    expect(layout.nodes.map(node => node.id)).toEqual(['docs', 'billing', 'team']);
    expect(layout.edges.map(edge => `${edge.source}->${edge.target}`)).toEqual([
      'docs->billing',
      'billing->team',
    ]);
    expect(layout.nonReachableNodes.map(node => [node.id, node.position.x])).toEqual([
      ['home', -300],
    ]);
  });

  it('collapses hierarchy groups and deduplicates grouped hierarchy edges', () => {
    const layout = buildHierarchyLayoutInput(graph, {
      expandedGroups: new Set(['root', 'content']),
      onGroupToggle: vi.fn(),
      onHierarchyToggle: vi.fn(),
    });

    const settingsSummary = layout.nodes.find(node => node.id === 'hier-group-settings');
    expect(settingsSummary).toEqual(
      expect.objectContaining({
        type: 'compactNode',
        data: expect.objectContaining({ label: 'Settings (2)', group: 'settings' }),
      })
    );
    expect(layout.nodes.some(node => node.id === 'billing')).toBe(false);
    expect(layout.edges.map(edge => `${edge.source}->${edge.target}`)).toEqual([
      'home->docs',
      'home->hier-group-settings',
    ]);
  });

  it('injects map group callbacks into group nodes', () => {
    const onGroupToggle = vi.fn();
    const onGroupDoubleClick = vi.fn();
    const layout = buildMapLayoutInput(graph, { onGroupToggle, onGroupDoubleClick });

    const groupNode = layout.nodes.find(node => node.type === 'groupNode');
    expect(groupNode?.data).toEqual(
      expect.objectContaining({
        onToggle: onGroupToggle,
        onDoubleClick: onGroupDoubleClick,
      })
    );
  });
});
