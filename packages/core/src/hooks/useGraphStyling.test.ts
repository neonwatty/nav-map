import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGraphStyling } from './useGraphStyling';
import type { Node, Edge } from '@xyflow/react';

function makeNode(id: string, group: string, type = 'pageNode', parentId?: string): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { group, label: id, route: `/${id}` },
    parentId,
  };
}

function makeEdge(id: string, source: string, target: string, edgeType = 'link'): Edge {
  return { id, source, target, type: 'navEdge', data: { edgeType, label: edgeType } };
}

function makeGroupNode(groupId: string): Node {
  return {
    id: `group-${groupId}`,
    type: 'groupNode',
    position: { x: 0, y: 0 },
    data: { groupId, label: groupId, childCount: 2, collapsed: false },
  };
}

const baseDeps = {
  collapsedGroups: new Set<string>(),
  selectedNodeId: null,
  focusMode: false,
  viewMode: 'map' as const,
  activeFlow: null,
  focusedGroupId: null,
  nodeGroupMap: new Map<string, string>(),
  showRedirects: true,
  searchMatchIds: null,
  auditFocusNodeIds: null,
  workflowFocusNodeIds: null,
  workflowFocusEdgeIds: null,
};

describe('useGraphStyling', () => {
  describe('redirect edge filtering', () => {
    const nodes: Node[] = [makeNode('a', 'marketing'), makeNode('b', 'auth')];
    const edges: Edge[] = [makeEdge('e1', 'a', 'b', 'link'), makeEdge('e2', 'b', 'a', 'redirect')];

    it('shows all edges when showRedirects is true', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          showRedirects: true,
        })
      );
      expect(result.current.styledEdges).toHaveLength(2);
    });

    it('hides redirect edges when showRedirects is false', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          showRedirects: false,
        })
      );
      expect(result.current.styledEdges).toHaveLength(1);
      expect(result.current.styledEdges[0].id).toBe('e1');
    });
  });

  describe('group focus dimming', () => {
    const nodes: Node[] = [
      makeGroupNode('marketing'),
      makeGroupNode('auth'),
      makeNode('home', 'marketing', 'pageNode', 'group-marketing'),
      makeNode('login', 'auth', 'pageNode', 'group-auth'),
    ];
    const edges: Edge[] = [makeEdge('e1', 'home', 'login', 'link')];
    const nodeGroupMap = new Map([
      ['home', 'marketing'],
      ['login', 'auth'],
    ]);

    it('dims non-focused group nodes', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          nodeGroupMap,
          focusedGroupId: 'marketing',
        })
      );

      const marketingGroup = result.current.styledNodes.find(n => n.id === 'group-marketing');
      const authGroup = result.current.styledNodes.find(n => n.id === 'group-auth');
      expect(marketingGroup?.style?.opacity).toBe(1);
      expect(authGroup?.style?.opacity).toBe(0.15);
    });

    it('dims non-focused page nodes', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          nodeGroupMap,
          focusedGroupId: 'marketing',
        })
      );

      const home = result.current.styledNodes.find(n => n.id === 'home');
      const login = result.current.styledNodes.find(n => n.id === 'login');
      expect(home?.style?.opacity).toBe(1);
      expect(login?.style?.opacity).toBe(0.15);
    });

    it('dims cross-group edges when focused', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          nodeGroupMap,
          focusedGroupId: 'marketing',
        })
      );

      // home→login: one endpoint in marketing, one not — opacity 0.15
      expect(result.current.styledEdges[0].style?.opacity).toBe(0.15);
    });
  });

  describe('no styling when no mode active', () => {
    it('returns nodes and edges unstyled', () => {
      const nodes: Node[] = [makeNode('a', 'marketing')];
      const edges: Edge[] = [makeEdge('e1', 'a', 'a', 'link')];
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
        })
      );
      expect(result.current.styledNodes).toEqual(nodes);
    });
  });

  describe('selection dimming with focus mode', () => {
    const nodes: Node[] = [
      makeNode('home', 'marketing'),
      makeNode('blog', 'marketing'),
      makeNode('login', 'auth'),
    ];
    const edges: Edge[] = [makeEdge('e1', 'home', 'blog', 'link')];

    it('does not dim nodes on selection when focusMode is off', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          selectedNodeId: 'home',
          focusMode: false,
        })
      );
      // All nodes should have no opacity override
      result.current.styledNodes.forEach(node => {
        expect(node.style?.opacity).toBeUndefined();
      });
    });

    it('dims non-connected nodes when focusMode is on', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          selectedNodeId: 'home',
          focusMode: true,
        })
      );
      const home = result.current.styledNodes.find(n => n.id === 'home');
      const blog = result.current.styledNodes.find(n => n.id === 'blog');
      const login = result.current.styledNodes.find(n => n.id === 'login');
      expect(home?.style?.opacity).toBe(1);
      expect(blog?.style?.opacity).toBe(1); // connected via edge
      expect(login?.style?.opacity).toBe(0.25); // not connected
    });

    it('does not dim any nodes when nothing is selected even with focusMode on', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          selectedNodeId: null,
          focusMode: true,
        })
      );
      result.current.styledNodes.forEach(node => {
        expect(node.style?.opacity).toBeUndefined();
      });
    });
  });

  describe('audit focus highlighting', () => {
    const nodes: Node[] = [
      makeNode('home', 'marketing'),
      makeNode('settings', 'app'),
      makeNode('billing', 'app'),
    ];
    const edges: Edge[] = [
      makeEdge('e1', 'settings', 'billing', 'redirect'),
      makeEdge('e2', 'home', 'settings', 'link'),
    ];

    it('highlights focused audit nodes and dims unrelated nodes', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          auditFocusNodeIds: new Set(['settings', 'billing']),
        })
      );

      const settings = result.current.styledNodes.find(n => n.id === 'settings');
      const billing = result.current.styledNodes.find(n => n.id === 'billing');
      const home = result.current.styledNodes.find(n => n.id === 'home');

      expect(settings?.style?.opacity).toBe(1);
      expect(billing?.style?.opacity).toBe(1);
      expect(home?.style?.opacity).toBe(0.18);
      expect(settings?.style?.filter).toContain('drop-shadow');
    });

    it('highlights edges fully contained in the focused audit nodes', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          auditFocusNodeIds: new Set(['settings', 'billing']),
        })
      );

      const redirectEdge = result.current.styledEdges.find(edge => edge.id === 'e1');
      const inboundEdge = result.current.styledEdges.find(edge => edge.id === 'e2');

      expect(redirectEdge?.style?.opacity).toBe(1);
      expect(redirectEdge?.style?.stroke).toBe('#ef4444');
      expect(inboundEdge?.style?.opacity).toBe(0.08);
    });
  });

  describe('workflow focus highlighting', () => {
    const nodes: Node[] = [
      makeNode('home', 'marketing'),
      makeNode('setup', 'app'),
      makeNode('billing', 'app'),
    ];
    const edges: Edge[] = [
      makeEdge('e1', 'home', 'setup', 'link'),
      makeEdge('e2', 'setup', 'billing', 'link'),
    ];

    it('dims unrelated nodes when workflow nodes are focused', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          workflowFocusNodeIds: new Set(['setup', 'billing']),
        })
      );

      const setup = result.current.styledNodes.find(node => node.id === 'setup');
      const billing = result.current.styledNodes.find(node => node.id === 'billing');
      const home = result.current.styledNodes.find(node => node.id === 'home');

      expect(setup?.style?.opacity).toBe(1);
      expect(billing?.style?.opacity).toBe(1);
      expect(home?.style?.opacity).toBe(0.14);
      expect(home?.style?.pointerEvents).toBe('none');
      expect(setup?.style?.filter).toContain('drop-shadow');
    });

    it('highlights matching workflow edges and dims unrelated edges', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          workflowFocusEdgeIds: new Set(['e2']),
        })
      );

      const matchedEdge = result.current.styledEdges.find(edge => edge.id === 'e2');
      const unrelatedEdge = result.current.styledEdges.find(edge => edge.id === 'e1');

      expect(matchedEdge?.style?.opacity).toBe(1);
      expect(matchedEdge?.style?.stroke).toBe('#2563eb');
      expect(matchedEdge?.style?.strokeWidth).toBe(2.5);
      expect(unrelatedEdge?.style?.opacity).toBe(0.08);
      expect(unrelatedEdge?.style?.pointerEvents).toBe('none');
    });

    it('keeps search and audit focus priority above workflow focus', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          searchMatchIds: new Set(['home']),
          auditFocusNodeIds: new Set(['billing']),
          workflowFocusNodeIds: new Set(['setup']),
          workflowFocusEdgeIds: new Set(['e2']),
        })
      );

      const home = result.current.styledNodes.find(node => node.id === 'home');
      const setup = result.current.styledNodes.find(node => node.id === 'setup');
      const billing = result.current.styledNodes.find(node => node.id === 'billing');
      const matchedEdge = result.current.styledEdges.find(edge => edge.id === 'e2');

      expect(home?.style?.opacity).toBe(1);
      expect(setup?.style?.opacity).toBe(0.12);
      expect(billing?.style?.opacity).toBe(0.12);
      expect(matchedEdge?.style?.stroke).toBeUndefined();
      expect(matchedEdge?.style?.opacity).toBe(0.08);
    });

    it('does not apply workflow edge focus while search is active', () => {
      const { result } = renderHook(() =>
        useGraphStyling({
          ...baseDeps,
          nodes,
          edges,
          zoomedNodes: nodes,
          searchMatchIds: new Set(['home']),
          workflowFocusEdgeIds: new Set(['e2']),
        })
      );

      const matchedEdge = result.current.styledEdges.find(edge => edge.id === 'e2');
      const unrelatedEdge = result.current.styledEdges.find(edge => edge.id === 'e1');

      expect(matchedEdge?.style?.opacity).toBeUndefined();
      expect(matchedEdge?.style?.stroke).toBeUndefined();
      expect(matchedEdge?.style?.strokeWidth).toBeUndefined();
      expect(unrelatedEdge?.style?.opacity).toBeUndefined();
      expect(unrelatedEdge?.style?.pointerEvents).toBeUndefined();
    });
  });
});
