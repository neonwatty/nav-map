import { useEffect, useRef } from 'react';
import type { NavMapGraph } from '../types';
import { validateGraph, type GraphValidationError } from '../utils/validateGraph';

interface UseGraphLoadingOptions {
  graphProp: NavMapGraph | undefined;
  graphUrl: string | undefined;
  viewMode: string;
  hierarchyExpandedGroups: Set<string>;
  onValidationError: ((errors: GraphValidationError[]) => void) | undefined;
  setGraph: (graph: NavMapGraph | null) => void;
  setHierarchyExpanded: (groups: Set<string>) => void;
}

/**
 * Consolidates three graph-loading effects:
 * 1. Fetch graph from URL
 * 2. Sync graph when prop changes
 * 3. Expand hierarchy groups on initial load
 */
export function useGraphLoading({
  graphProp,
  graphUrl,
  viewMode,
  hierarchyExpandedGroups,
  onValidationError,
  setGraph,
  setHierarchyExpanded,
}: UseGraphLoadingOptions): void {
  const onValidationErrorRef = useRef(onValidationError);
  onValidationErrorRef.current = onValidationError;

  // Load graph from URL if provided
  useEffect(() => {
    if (graphUrl && !graphProp) {
      fetch(graphUrl)
        .then(r => r.json())
        .then((data: NavMapGraph) => {
          const result = validateGraph(data);
          if (!result.valid) {
            onValidationErrorRef.current?.(result.errors);
            console.warn('[NavMap] Graph validation failed:', result.errors);
          }
          setGraph(data);
        });
    }
  }, [graphUrl, graphProp, setGraph]);

  // Update graph when prop changes
  useEffect(() => {
    if (graphProp) {
      const result = validateGraph(graphProp);
      if (!result.valid) {
        onValidationErrorRef.current?.(result.errors);
        console.warn('[NavMap] Graph validation failed:', result.errors);
      }
      setGraph(graphProp);
    }
  }, [graphProp, setGraph]);

  // Expand all hierarchy groups when graph first loads in hierarchy mode
  const graphRef = useRef(graphProp ?? null);
  useEffect(() => {
    const graph = graphProp ?? null;
    graphRef.current = graph;
    if (graph && viewMode === 'hierarchy' && hierarchyExpandedGroups.size === 0) {
      setHierarchyExpanded(new Set(graph.groups.map(g => g.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphProp]);
}
