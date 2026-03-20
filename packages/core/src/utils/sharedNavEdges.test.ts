import { describe, it, expect } from 'vitest';
import { buildSharedNavEdges } from './sharedNavEdges';
import type { NavMapGraph } from '../types';

function makeGraph(overrides: Partial<NavMapGraph> = {}): NavMapGraph {
  return {
    version: '1.0',
    meta: { name: 'test', generatedAt: '', generatedBy: 'manual' },
    nodes: [],
    edges: [],
    groups: [],
    ...overrides,
  };
}

describe('buildSharedNavEdges', () => {
  it('returns empty array when no sharedNav', () => {
    expect(buildSharedNavEdges(makeGraph())).toEqual([]);
  });

  it('generates edges from pages to targets', () => {
    const graph = makeGraph({
      sharedNav: {
        navbar: { pages: ['home', 'blog'], targets: ['studio'] },
        footer: { pages: [], targets: [] },
      },
    });
    const result = buildSharedNavEdges(graph);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('home');
    expect(result[0].target).toBe('studio');
    expect(result[1].source).toBe('blog');
    expect(result[1].target).toBe('studio');
  });

  it('skips self-links (page === target)', () => {
    const graph = makeGraph({
      sharedNav: {
        navbar: { pages: ['home'], targets: ['home', 'studio'] },
        footer: { pages: [], targets: [] },
      },
    });
    const result = buildSharedNavEdges(graph);
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('studio');
  });

  it('skips edges that already exist in graph.edges', () => {
    const graph = makeGraph({
      edges: [{ id: 'e1', source: 'home', target: 'studio', label: 'nav', type: 'link' }],
      sharedNav: {
        navbar: { pages: ['home'], targets: ['studio'] },
        footer: { pages: [], targets: [] },
      },
    });
    const result = buildSharedNavEdges(graph);
    expect(result).toHaveLength(0);
  });

  it('deduplicates pages and targets across navbar and footer', () => {
    const graph = makeGraph({
      sharedNav: {
        navbar: { pages: ['home'], targets: ['studio'] },
        footer: { pages: ['home'], targets: ['studio'] },
      },
    });
    const result = buildSharedNavEdges(graph);
    expect(result).toHaveLength(1);
  });

  it('sets shared-nav edge type', () => {
    const graph = makeGraph({
      sharedNav: {
        navbar: { pages: ['home'], targets: ['studio'] },
        footer: { pages: [], targets: [] },
      },
    });
    const result = buildSharedNavEdges(graph);
    expect(result[0].data?.edgeType).toBe('shared-nav');
  });
});
