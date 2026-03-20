import { describe, it, expect } from 'vitest';
import { detectGroups, assignGroups } from './groupDetection';
import type { NavMapNode, NavMapGroup } from '../types';

function makeNode(id: string, route: string, group = ''): NavMapNode {
  return { id, route, label: id, group };
}

describe('detectGroups', () => {
  it('groups nodes by first path segment', () => {
    const nodes = [
      makeNode('blog', '/blog'),
      makeNode('blog-post', '/blog/[slug]'),
      makeNode('home', '/'),
    ];
    const groups = detectGroups(nodes);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('blog');
    expect(groups[0].label).toBe('Blog');
    expect(groups[0].routePrefix).toBe('/blog');
  });

  it('requires at least 2 nodes to form a group', () => {
    const nodes = [makeNode('home', '/'), makeNode('about', '/about')];
    const groups = detectGroups(nodes);
    expect(groups).toHaveLength(0);
  });

  it('creates multiple groups', () => {
    const nodes = [
      makeNode('blog', '/blog'),
      makeNode('blog-post', '/blog/[slug]'),
      makeNode('auth-login', '/auth/login'),
      makeNode('auth-signup', '/auth/signup'),
    ];
    const groups = detectGroups(nodes);
    expect(groups).toHaveLength(2);
    const ids = groups.map(g => g.id).sort();
    expect(ids).toEqual(['auth', 'blog']);
  });

  it('groups root-level routes under "root"', () => {
    const nodes = [makeNode('home', '/'), makeNode('about', '/')];
    const groups = detectGroups(nodes);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('root');
  });
});

describe('assignGroups', () => {
  const groups: NavMapGroup[] = [
    { id: 'blog', label: 'Blog', routePrefix: '/blog' },
    { id: 'auth', label: 'Auth', routePrefix: '/auth' },
  ];

  it('assigns group by route prefix', () => {
    const nodes = [makeNode('blog-post', '/blog/[slug]')];
    const result = assignGroups(nodes, groups);
    expect(result[0].group).toBe('blog');
  });

  it('does not override existing group', () => {
    const nodes = [makeNode('blog-post', '/blog/[slug]', 'custom')];
    const result = assignGroups(nodes, groups);
    expect(result[0].group).toBe('custom');
  });

  it('leaves unmatched nodes without group', () => {
    const nodes = [makeNode('home', '/')];
    const result = assignGroups(nodes, groups);
    expect(result[0].group).toBe('');
  });

  it('skips groups with "/" routePrefix to avoid matching everything', () => {
    const withRoot: NavMapGroup[] = [...groups, { id: 'root', label: 'Root', routePrefix: '/' }];
    const nodes = [makeNode('about', '/about')];
    const result = assignGroups(nodes, withRoot);
    expect(result[0].group).toBe('');
  });
});
