import { useEffect, useRef } from 'react';
import type { NavMapGraph } from '../types';

interface UseZoomEffectsOptions {
  zoomTier: 'overview' | 'compact' | 'detail';
  viewMode: string;
  graph: NavMapGraph | null;
  clearHierarchyExpanded: () => void;
  setHierarchyExpanded: (groups: Set<string>) => void;
}

/**
 * Auto-collapse/expand hierarchy groups based on semantic zoom tier changes.
 * Owns prevZoomTierRef internally.
 */
export function useZoomEffects({
  zoomTier,
  viewMode,
  graph,
  clearHierarchyExpanded,
  setHierarchyExpanded,
}: UseZoomEffectsOptions): void {
  const prevZoomTierRef = useRef(zoomTier);

  useEffect(() => {
    if (viewMode !== 'hierarchy' || !graph || zoomTier === prevZoomTierRef.current) return;
    const prev = prevZoomTierRef.current;
    prevZoomTierRef.current = zoomTier;

    if (zoomTier === 'overview' && prev !== 'overview') {
      // Zoomed out - collapse all
      clearHierarchyExpanded();
    } else if (zoomTier === 'detail' && prev === 'overview') {
      // Zoomed back in from overview - expand all
      setHierarchyExpanded(new Set(graph.groups.map(g => g.id)));
    }
  }, [zoomTier, viewMode, graph, clearHierarchyExpanded, setHierarchyExpanded]);
}
