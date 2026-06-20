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
    {
      id: 'home',
      route: '/',
      label: 'Home',
      group: 'root',
      screenshot: 'home.png',
      metadata: { purpose: 'Start', personas: ['signed-out'] },
      filePath: 'app/page.tsx',
    },
    { id: 'docs', route: '/docs', label: 'Docs', group: 'content' },
    { id: 'billing', route: '/settings/billing', label: 'Billing', group: 'settings' },
    { id: 'team', route: '/settings/team', label: 'Team', group: 'settings' },
  ],
  edges: [
    {
      id: 'home-docs',
      source: 'home',
      target: 'docs',
      label: 'Docs',
      action: 'Open docs',
      personas: ['signed-out'],
      type: 'link',
    },
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
      ['flow-0-step-0-home', 1],
      ['flow-0-step-1-docs', 2],
      ['flow-0-step-2-billing', 3],
    ]);
    expect(layout?.nodes.map(node => node.data.nodeId)).toEqual(['home', 'docs', 'billing']);
    expect(layout?.edges).toEqual([
      expect.objectContaining({
        id: 'flow-0-edge-0-home-docs',
        source: 'flow-0-step-0-home',
        target: 'flow-0-step-1-docs',
        data: expect.objectContaining({
          edgeId: 'home-docs',
          sourceNodeId: 'home',
          targetNodeId: 'docs',
          label: 'Docs',
          edgeType: 'link',
          action: 'Open docs',
          personas: ['signed-out'],
        }),
      }),
      expect.objectContaining({
        id: 'flow-0-edge-1-docs-billing',
        source: 'flow-0-step-1-docs',
        target: 'flow-0-step-2-billing',
        data: expect.objectContaining({
          edgeId: 'docs-billing',
          sourceNodeId: 'docs',
          targetNodeId: 'billing',
          label: '',
          edgeType: 'router-push',
        }),
      }),
    ]);
    expect(layout?.nodes[0].data).toEqual(
      expect.objectContaining({
        metadata: { purpose: 'Start', personas: ['signed-out'] },
        filePath: 'app/page.tsx',
      })
    );
  });

  it('uses unique render ids when a flow revisits the same graph node', () => {
    const loopingGraph: NavMapGraph = {
      ...graph,
      flows: [{ name: 'Looping flow', steps: ['billing', 'team', 'billing'] }],
      edges: [
        ...graph.edges,
        { id: 'team-billing', source: 'team', target: 'billing', type: 'router-push' },
      ],
    };

    const layout = buildFlowLayoutInput(loopingGraph, 0);

    expect(layout?.nodes.map(node => node.id)).toEqual([
      'flow-0-step-0-billing',
      'flow-0-step-1-team',
      'flow-0-step-2-billing',
    ]);
    expect(new Set(layout?.nodes.map(node => node.id)).size).toBe(3);
    expect(layout?.nodes.map(node => node.data.nodeId)).toEqual(['billing', 'team', 'billing']);
    expect(layout?.edges.map(edge => [edge.source, edge.target])).toEqual([
      ['flow-0-step-0-billing', 'flow-0-step-1-team'],
      ['flow-0-step-1-team', 'flow-0-step-2-billing'],
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
    expect(layout.nonReachableNodes[0].data).toEqual(
      expect.objectContaining({
        metadata: { purpose: 'Start', personas: ['signed-out'] },
        filePath: 'app/page.tsx',
      })
    );
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
    expect(layout.nodes.find(node => node.id === 'home')?.data).toEqual(
      expect.objectContaining({
        metadata: { purpose: 'Start', personas: ['signed-out'] },
        filePath: 'app/page.tsx',
      })
    );
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
