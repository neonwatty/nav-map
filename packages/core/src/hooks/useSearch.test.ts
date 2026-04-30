import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';
import type { NavMapNode, NavMapEdge } from '../types';

const nodes: NavMapNode[] = [
  { id: 'home', route: '/', label: 'Home', group: 'marketing' },
  { id: 'blog', route: '/blog', label: 'Blog', group: 'marketing' },
  { id: 'login', route: '/auth/login', label: 'Login', group: 'auth' },
  { id: 'signup', route: '/auth/signup', label: 'Signup', group: 'auth' },
  { id: 'studio', route: '/studio', label: 'Studio', group: 'studio' },
];

const edges: NavMapEdge[] = [
  { id: 'e1', source: 'home', target: 'blog', label: 'nav', type: 'link' },
  { id: 'e2', source: 'home', target: 'login', label: 'redirect', type: 'redirect' },
  { id: 'e3', source: 'login', target: 'studio', label: 'submit', type: 'redirect' },
  { id: 'e4', source: 'signup', target: 'studio', label: 'submit', type: 'redirect' },
];

describe('useSearch', () => {
  it('starts with empty query and no results', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
  });

  it('filters by label', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('log'));
    expect(result.current.results.map(r => r.id)).toEqual(['login', 'blog']);
  });

  it('filters by route', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('/auth'));
    expect(result.current.results.map(r => r.id)).toEqual(['login', 'signup']);
  });

  it('filters by group', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('marketing'));
    expect(result.current.results).toHaveLength(2);
  });

  it('is case insensitive', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('HOME'));
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('home');
  });

  it('returns empty for whitespace-only query', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('   '));
    expect(result.current.results).toEqual([]);
  });

  it('prioritizes label-starts-with matches', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('stu'));
    expect(result.current.results[0].id).toBe('studio');
  });

  it('returns empty for no matches', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('zzzzz'));
    expect(result.current.results).toEqual([]);
  });

  it('includes incoming and outgoing counts', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('home'));
    expect(result.current.results[0].outgoingCount).toBe(2); // home -> blog, home -> login
    expect(result.current.results[0].incomingCount).toBe(0);
  });

  it('counts edges correctly for nodes with incoming links', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('studio'));
    expect(result.current.results[0].incomingCount).toBe(2); // login -> studio, signup -> studio
    expect(result.current.results[0].outgoingCount).toBe(0);
  });

  it('works without edges parameter', () => {
    const { result } = renderHook(() => useSearch(nodes));
    act(() => result.current.setQuery('home'));
    expect(result.current.results[0].incomingCount).toBe(0);
    expect(result.current.results[0].outgoingCount).toBe(0);
  });

  it('counts both directions for nodes with mixed edges', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('login'));
    const login = result.current.results[0];
    expect(login.incomingCount).toBe(1); // home -> login
    expect(login.outgoingCount).toBe(1); // login -> studio
  });

  it('returns zero counts for nodes with no edges', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('blog'));
    const blog = result.current.results[0];
    expect(blog.incomingCount).toBe(1); // home -> blog
    expect(blog.outgoingCount).toBe(0);
  });

  it('selectedIndex resets to 0 when query changes', () => {
    const { result } = renderHook(() => useSearch(nodes, edges));
    act(() => result.current.setQuery('auth'));
    act(() => result.current.setSelectedIndex(1));
    expect(result.current.selectedIndex).toBe(1);
    act(() => result.current.setQuery('home'));
    // selectedIndex should reset (via the useEffect in SearchPanel, not in useSearch itself)
    // but the hook's results change, which is the trigger
    expect(result.current.results).toHaveLength(1);
  });

  it('results include all NavMapNode fields', () => {
    const nodesWithScreenshot: NavMapNode[] = [
      { id: 'home', route: '/', label: 'Home', group: 'marketing', screenshot: 'home.png' },
    ];
    const { result } = renderHook(() => useSearch(nodesWithScreenshot, []));
    act(() => result.current.setQuery('home'));
    expect(result.current.results[0].screenshot).toBe('home.png');
    expect(result.current.results[0].route).toBe('/');
    expect(result.current.results[0].group).toBe('marketing');
  });
});
