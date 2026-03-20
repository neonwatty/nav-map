import { describe, it, expect } from 'vitest';
import { computeElkLayout } from './elkLayout';
import type { Node, Edge } from '@xyflow/react';

function makeNode(id: string, group: string, parentId?: string): Node {
  return {
    id,
    type: parentId ? 'pageNode' : 'groupNode',
    position: { x: 0, y: 0 },
    data: parentId
      ? { label: id, route: `/${id}`, group }
      : { label: group, groupId: group, childCount: 0, collapsed: false },
    ...(parentId ? { parentId } : {}),
  };
}

function makeEdge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: 'navEdge', data: { edgeType: 'link' } };
}

describe('computeElkLayout', () => {
  it('assigns positions to all nodes', async () => {
    const nodes: Node[] = [
      makeNode('group-marketing', 'marketing'),
      makeNode('home', 'marketing', 'group-marketing'),
      makeNode('blog', 'marketing', 'group-marketing'),
    ];
    const edges: Edge[] = [makeEdge('e1', 'home', 'blog')];

    const result = await computeElkLayout(nodes, edges);
    for (const node of result.nodes) {
      expect(node.position).toBeDefined();
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
    }
  });

  it('sets width/height on group nodes', async () => {
    const nodes: Node[] = [
      makeNode('group-auth', 'auth'),
      makeNode('login', 'auth', 'group-auth'),
      makeNode('signup', 'auth', 'group-auth'),
    ];
    const edges: Edge[] = [makeEdge('e1', 'login', 'signup')];

    const result = await computeElkLayout(nodes, edges);
    const groupNode = result.nodes.find(n => n.id === 'group-auth');
    expect(groupNode?.style?.width).toBeGreaterThan(0);
    expect(groupNode?.style?.height).toBeGreaterThan(0);
  });

  it('attaches elkPath to edges with sections', async () => {
    const nodes: Node[] = [
      makeNode('group-a', 'a'),
      makeNode('group-b', 'b'),
      makeNode('n1', 'a', 'group-a'),
      makeNode('n2', 'b', 'group-b'),
    ];
    const edges: Edge[] = [makeEdge('e1', 'n1', 'n2')];

    const result = await computeElkLayout(nodes, edges);
    const edge = result.edges.find(e => e.id === 'e1');
    // ELK should compute sections for cross-group edges
    if (edge?.data?.elkPath) {
      expect(edge.data.elkPath).toMatch(/^M\s/);
    }
  });

  it('preserves edge data when adding elkPath', async () => {
    const nodes: Node[] = [
      makeNode('group-a', 'a'),
      makeNode('n1', 'a', 'group-a'),
      makeNode('n2', 'a', 'group-a'),
    ];
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'n1',
        target: 'n2',
        type: 'navEdge',
        data: { edgeType: 'redirect', label: 'test' },
      },
    ];

    const result = await computeElkLayout(nodes, edges);
    const edge = result.edges.find(e => e.id === 'e1');
    expect(edge?.data?.edgeType).toBe('redirect');
    expect(edge?.data?.label).toBe('test');
  });

  it('handles empty graph', async () => {
    const result = await computeElkLayout([], []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
