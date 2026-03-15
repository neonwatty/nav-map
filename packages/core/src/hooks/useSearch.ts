import { useState, useMemo } from 'react';
import type { NavMapNode } from '../types';

export function useSearch(nodes: NavMapNode[]) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    return nodes
      .filter(n =>
        n.label.toLowerCase().includes(q) ||
        n.route.toLowerCase().includes(q) ||
        n.group.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Exact label match first
        const aLabel = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bLabel = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        if (aLabel !== bLabel) return aLabel - bLabel;
        // Then route match
        const aRoute = a.route.toLowerCase().includes(q) ? 0 : 1;
        const bRoute = b.route.toLowerCase().includes(q) ? 0 : 1;
        return aRoute - bRoute;
      });
  }, [nodes, query]);

  return { query, setQuery, results, selectedIndex, setSelectedIndex };
}
