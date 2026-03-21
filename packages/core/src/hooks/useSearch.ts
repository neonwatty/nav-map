import { useState, useMemo } from 'react';
import type { NavMapNode, NavMapEdge } from '../types';

export interface SearchResult extends NavMapNode {
  incomingCount: number;
  outgoingCount: number;
}

export function useSearch(nodes: NavMapNode[], edges: NavMapEdge[] = []) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    return nodes
      .filter(
        n =>
          n.label.toLowerCase().includes(q) ||
          n.route.toLowerCase().includes(q) ||
          n.group.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aLabel = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bLabel = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        if (aLabel !== bLabel) return aLabel - bLabel;
        const aRoute = a.route.toLowerCase().includes(q) ? 0 : 1;
        const bRoute = b.route.toLowerCase().includes(q) ? 0 : 1;
        return aRoute - bRoute;
      })
      .map(n => ({
        ...n,
        incomingCount: edges.filter(e => e.target === n.id).length,
        outgoingCount: edges.filter(e => e.source === n.id).length,
      }));
  }, [nodes, edges, query]);

  return { query, setQuery, results, selectedIndex, setSelectedIndex };
}
