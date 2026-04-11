import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { NavMapGraph } from '../types';

/**
 * Derived data computed from graph and UI state via `useMemo`.
 *
 * Extracted from NavMap to reduce component line count without
 * changing behaviour — every memo keeps its original dependency array.
 */
export function useNavMapMemos(deps: {
  graph: NavMapGraph | null;
  selectedFlowIndex: number | null;
  showSearch: boolean;
  searchQuery: string;
  zoomTier: string;
  nodes: Node[];
  galleryNodeIds?: Set<string>;
}) {
  const { graph, selectedFlowIndex, showSearch, searchQuery, zoomTier, nodes } = deps;

  // Identify nodes that have gallery data from any flow
  const galleryNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const flow of graph?.flows ?? []) {
      for (const nodeId of Object.keys(flow.gallery ?? {})) {
        if ((flow.gallery?.[nodeId]?.length ?? 0) > 0) ids.add(nodeId);
      }
    }
    return ids;
  }, [graph]);

  // Map node IDs to their group for edge dimming in group focus mode
  const nodeGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of graph?.nodes ?? []) {
      map.set(node.id, node.group);
    }
    return map;
  }, [graph]);

  // Semantic zoom: 3 tiers based on zoom level
  const zoomedNodes = useMemo(() => {
    const addGalleryFlag = (node: Node) => {
      if (node.type === 'groupNode') return node;
      const hasGallery = galleryNodeIds.has(node.id);
      if (!hasGallery) return node;
      return { ...node, data: { ...node.data, hasGallery: true } };
    };

    if (zoomTier === 'overview') {
      return nodes.map(node => {
        if (node.type === 'groupNode') return node;
        return {
          ...node,
          type: 'compactNode',
          style: { ...node.style, opacity: 0, pointerEvents: 'none' as const },
        };
      });
    }

    if (zoomTier === 'detail') return nodes.map(addGalleryFlag);

    return nodes.map(node => {
      if (node.type === 'groupNode') return node;
      const withGallery = addGalleryFlag(node);
      return { ...withGallery, type: 'compactNode' };
    });
  }, [nodes, zoomTier, galleryNodeIds]);

  // Active flow (for graph styling)
  const activeFlow = useMemo(() => {
    if (selectedFlowIndex === null || !graph?.flows) return null;
    return graph.flows[selectedFlowIndex] ?? null;
  }, [selectedFlowIndex, graph]);

  // Compute search match IDs for canvas highlighting
  const searchMatchIds = useMemo(() => {
    if (!showSearch || !searchQuery.trim() || !graph) return null;
    const q = searchQuery.toLowerCase().trim();
    const ids = new Set<string>();
    for (const n of graph.nodes) {
      if (
        n.label.toLowerCase().includes(q) ||
        n.route.toLowerCase().includes(q) ||
        n.group.toLowerCase().includes(q)
      ) {
        ids.add(n.id);
      }
    }
    return ids.size > 0 ? ids : null;
  }, [showSearch, searchQuery, graph]);

  return { galleryNodeIds, nodeGroupMap, zoomedNodes, activeFlow, searchMatchIds };
}
