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
});
