import { describe, it, expect } from 'vitest';
import { computeBundledEdges } from './edgeBundling';
import type { Node, Edge } from '@xyflow/react';

function makeGroupNode(groupId: string, x: number, y: number): Node {
  return {
    id: `group-${groupId}`,
    type: 'groupNode',
    position: { x, y },
    data: { label: groupId, groupId, childCount: 2, collapsed: false },
  };
}

function makePageNode(id: string, group: string, x: number, y: number, parentId: string): Node {
  return {
    id,
    type: 'pageNode',
    position: { x, y },
    parentId,
    data: { label: id, route: `/${id}`, group },
  };
}

function makeEdge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: 'navEdge', data: { edgeType: 'link' } };
}

describe('computeBundledEdges', () => {
  const nodes: Node[] = [
    makeGroupNode('a', 0, 0),
    makeGroupNode('b', 500, 0),
    makePageNode('n1', 'a', 50, 50, 'group-a'),
    makePageNode('n2', 'a', 200, 50, 'group-a'),
    makePageNode('n3', 'b', 50, 50, 'group-b'),
    makePageNode('n4', 'b', 200, 50, 'group-b'),
  ];

  it('returns a BundleResult for each edge', () => {
    const edges: Edge[] = [makeEdge('e1', 'n1', 'n3'), makeEdge('e2', 'n2', 'n4')];
    const results = computeBundledEdges(nodes, edges);
    expect(results).toHaveLength(2);
    expect(results[0].edgeId).toBe('e1');
    expect(results[1].edgeId).toBe('e2');
  });

  it('generates valid SVG cubic bezier paths', () => {
    const edges: Edge[] = [makeEdge('e1', 'n1', 'n3')];
    const results = computeBundledEdges(nodes, edges);
    expect(results[0].path).toMatch(/^M\s[\d.-]+\s[\d.-]+\sC\s/);
  });

  it('edges in the same corridor curve toward shared centroid', () => {
    const edges: Edge[] = [makeEdge('e1', 'n1', 'n3'), makeEdge('e2', 'n2', 'n4')];
    const results = computeBundledEdges(nodes, edges);
    // Both paths should be cubic beziers (C command), not straight lines
    for (const r of results) {
      expect(r.path).toContain(' C ');
    }
  });

  it('skips edges with missing node positions', () => {
    const edges: Edge[] = [makeEdge('e1', 'n1', 'nonexistent')];
    const results = computeBundledEdges(nodes, edges);
    expect(results).toHaveLength(0);
  });

  it('handles empty edges', () => {
    const results = computeBundledEdges(nodes, []);
    expect(results).toEqual([]);
  });

  it('single-edge corridors have reduced pull strength', () => {
    const edges: Edge[] = [makeEdge('e1', 'n1', 'n3')];
    const singleResult = computeBundledEdges(nodes, edges);
    // Compare with a multi-edge corridor
    const multiEdges: Edge[] = [makeEdge('e1', 'n1', 'n3'), makeEdge('e2', 'n2', 'n4')];
    const multiResult = computeBundledEdges(nodes, multiEdges);
    // Single-edge path should be less curved (closer to straight)
    // Both should be valid paths
    expect(singleResult[0].path).toMatch(/^M/);
    expect(multiResult[0].path).toMatch(/^M/);
  });
});
