import { useEffect, type RefObject } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { computeBundledEdges } from '../layout/edgeBundling';
import type { EdgeMode } from '../types';

interface UseEdgeEffectsOptions {
  layoutDone: boolean;
  showSharedNav: boolean;
  edgeMode: EdgeMode;
  nodes: Node[];
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  baseEdgesRef: RefObject<Edge[]>;
  sharedNavEdgesRef: RefObject<Edge[]>;
}

/**
 * Consolidates three edge effects:
 * 1. Toggle shared nav edges on/off
 * 2. Compute bundled edge paths
 * 3. Restore edges when leaving bundled mode
 */
export function useEdgeEffects({
  layoutDone,
  showSharedNav,
  edgeMode,
  nodes,
  setEdges,
  baseEdgesRef,
  sharedNavEdgesRef,
}: UseEdgeEffectsOptions): void {
  // Toggle shared nav edges
  useEffect(() => {
    if (!layoutDone) return;
    if (showSharedNav) {
      setEdges([...baseEdgesRef.current, ...sharedNavEdgesRef.current]);
    } else {
      setEdges(baseEdgesRef.current);
    }
  }, [showSharedNav, layoutDone, setEdges, baseEdgesRef, sharedNavEdgesRef]);

  // Compute bundled edge paths when edge mode is 'bundled'
  useEffect(() => {
    if (!layoutDone || edgeMode !== 'bundled') return;
    const currentEdges = showSharedNav
      ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current]
      : baseEdgesRef.current;
    const results = computeBundledEdges(nodes, currentEdges);
    const pathMap = new Map(results.map(r => [r.edgeId, r.path]));
    setEdges(
      currentEdges.map(edge => {
        const bundledPath = pathMap.get(edge.id);
        if (!bundledPath) return edge;
        return { ...edge, data: { ...edge.data, bundledPath } };
      })
    );
  }, [edgeMode, layoutDone, nodes, showSharedNav, setEdges, baseEdgesRef, sharedNavEdgesRef]);

  // Restore original edges when leaving bundled mode
  useEffect(() => {
    if (!layoutDone || edgeMode === 'bundled') return;
    setEdges(
      showSharedNav ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current] : baseEdgesRef.current
    );
  }, [edgeMode, layoutDone, showSharedNav, setEdges, baseEdgesRef, sharedNavEdgesRef]);
}
