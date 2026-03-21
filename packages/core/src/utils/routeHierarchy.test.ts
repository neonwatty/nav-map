import { describe, it, expect } from 'vitest';
import { buildRouteHierarchy } from './routeHierarchy';
import type { NavMapNode } from '../types';

function makeNode(id: string, route: string): NavMapNode {
  return { id, route, label: id, group: '' };
}

describe('buildRouteHierarchy', () => {
  it('connects child routes to their parent', () => {
    const nodes = [
      makeNode('home', '/'),
      makeNode('blog', '/blog'),
      makeNode('post', '/blog/[slug]'),
    ];
    const edges = buildRouteHierarchy(nodes);
    expect(edges).toContainEqual({ parentId: 'home', childId: 'blog' });
    expect(edges).toContainEqual({ parentId: 'blog', childId: 'post' });
  });

  it('attaches orphaned routes to root', () => {
    const nodes = [
      makeNode('home', '/'),
      makeNode('about', '/about'),
      makeNode('login', '/auth/login'),
    ];
    const edges = buildRouteHierarchy(nodes);
    expect(edges).toContainEqual({ parentId: 'home', childId: 'about' });
    // /auth doesn't exist, so /auth/login attaches to root
    expect(edges).toContainEqual({ parentId: 'home', childId: 'login' });
  });

  it('skips root node (no parent for /)', () => {
    const nodes = [makeNode('home', '/'), makeNode('blog', '/blog')];
    const edges = buildRouteHierarchy(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].childId).toBe('blog');
  });

  it('finds nearest ancestor when intermediate is missing', () => {
    const nodes = [
      makeNode('home', '/'),
      makeNode('studio', '/studio'),
      makeNode('project', '/studio/[id]/settings'),
    ];
    const edges = buildRouteHierarchy(nodes);
    // /studio/[id] doesn't exist, so settings attaches to /studio
    expect(edges).toContainEqual({ parentId: 'studio', childId: 'project' });
  });

  it('handles no root gracefully', () => {
    const nodes = [makeNode('blog', '/blog'), makeNode('post', '/blog/[slug]')];
    const edges = buildRouteHierarchy(nodes);
    expect(edges).toContainEqual({ parentId: 'blog', childId: 'post' });
    expect(edges).toHaveLength(1);
  });

  it('handles flat routes (all top-level)', () => {
    const nodes = [
      makeNode('home', '/'),
      makeNode('about', '/about'),
      makeNode('contact', '/contact'),
    ];
    const edges = buildRouteHierarchy(nodes);
    expect(edges).toHaveLength(2);
    edges.forEach(e => expect(e.parentId).toBe('home'));
  });

  it('handles deeply nested routes', () => {
    const nodes = [
      makeNode('home', '/'),
      makeNode('studio', '/studio'),
      makeNode('project', '/studio/project'),
      makeNode('settings', '/studio/project/settings'),
    ];
    const edges = buildRouteHierarchy(nodes);
    expect(edges).toContainEqual({ parentId: 'home', childId: 'studio' });
    expect(edges).toContainEqual({ parentId: 'studio', childId: 'project' });
    expect(edges).toContainEqual({ parentId: 'project', childId: 'settings' });
  });

  it('handles empty node list', () => {
    expect(buildRouteHierarchy([])).toEqual([]);
  });

  it('handles single node', () => {
    const nodes = [makeNode('home', '/')];
    expect(buildRouteHierarchy(nodes)).toEqual([]);
  });
});
