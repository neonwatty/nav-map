import { describe, it, expect } from 'vitest';
import {
  buildCompoundNodes,
  toReactFlowEdges,
  getConnectedNodes,
  buildGraphFromJson,
} from './graphHelpers';
import type { NavMapNode, NavMapEdge, NavMapGroup, NavMapGraph } from '../types';

const groups: NavMapGroup[] = [
  { id: 'marketing', label: 'Marketing', color: '#5b9bf5' },
  { id: 'auth', label: 'Auth', color: '#6e8ca8' },
  { id: 'empty', label: 'Empty', color: '#333' },
];

const nodes: NavMapNode[] = [
  { id: 'home', route: '/', label: 'Home', group: 'marketing', screenshot: 'home.jpeg' },
  { id: 'blog', route: '/blog', label: 'Blog', group: 'marketing' },
  { id: 'login', route: '/auth/login', label: 'Login', group: 'auth', screenshot: 'login.jpeg' },
];

const edges: NavMapEdge[] = [
  { id: 'e1', source: 'home', target: 'blog', label: 'nav', type: 'link' },
  { id: 'e2', source: 'home', target: 'login', label: 'redirect', type: 'redirect' },
  { id: 'e3', source: 'login', target: 'home', label: 'back', type: 'link' },
];

describe('buildCompoundNodes', () => {
  it('creates group container nodes with correct child counts', () => {
    const result = buildCompoundNodes(nodes, groups);
    const marketingGroup = result.find(n => n.id === 'group-marketing');
    const authGroup = result.find(n => n.id === 'group-auth');

    expect(marketingGroup).toBeDefined();
    expect(marketingGroup!.type).toBe('groupNode');
    expect((marketingGroup!.data as Record<string, unknown>).childCount).toBe(2);

    expect(authGroup).toBeDefined();
    expect((authGroup!.data as Record<string, unknown>).childCount).toBe(1);
  });

  it('skips empty groups', () => {
    const result = buildCompoundNodes(nodes, groups);
    const emptyGroup = result.find(n => n.id === 'group-empty');
    expect(emptyGroup).toBeUndefined();
  });

  it('assigns parentId to child nodes', () => {
    const result = buildCompoundNodes(nodes, groups);
    const home = result.find(n => n.id === 'home');
    const login = result.find(n => n.id === 'login');

    expect(home!.parentId).toBe('group-marketing');
    expect(login!.parentId).toBe('group-auth');
  });

  it('uses pageNode type for nodes with screenshots, compactNode otherwise', () => {
    const result = buildCompoundNodes(nodes, groups);
    const home = result.find(n => n.id === 'home');
    const blog = result.find(n => n.id === 'blog');

    expect(home!.type).toBe('pageNode');
    expect(blog!.type).toBe('compactNode');
  });
});

describe('toReactFlowEdges', () => {
  it('maps edge type to data.edgeType', () => {
    const result = toReactFlowEdges(edges);
    expect(result[0].data?.edgeType).toBe('link');
    expect(result[1].data?.edgeType).toBe('redirect');
  });

  it('sets all edges to navEdge type', () => {
    const result = toReactFlowEdges(edges);
    result.forEach(e => expect(e.type).toBe('navEdge'));
  });
});

describe('getConnectedNodes', () => {
  it('returns incoming and outgoing edges for a node', () => {
    const result = getConnectedNodes('home', edges);
    expect(result.outgoing).toHaveLength(2);
    expect(result.incoming).toHaveLength(1);
    expect(result.incoming[0].source).toBe('login');
  });

  it('returns empty arrays for disconnected node', () => {
    const result = getConnectedNodes('nonexistent', edges);
    expect(result.outgoing).toHaveLength(0);
    expect(result.incoming).toHaveLength(0);
  });
});

describe('buildGraphFromJson', () => {
  it('returns both nodes and edges', () => {
    const graph: NavMapGraph = {
      version: '1.0',
      meta: { name: 'test', generatedAt: '', generatedBy: 'manual' },
      nodes,
      edges,
      groups,
    };
    const result = buildGraphFromJson(graph);
    // 2 groups + 3 page nodes = 5
    expect(result.nodes).toHaveLength(5);
    expect(result.edges).toHaveLength(3);
  });
});
