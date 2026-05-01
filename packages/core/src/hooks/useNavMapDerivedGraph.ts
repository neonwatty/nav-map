import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { NavMapGraph } from '../types';
import type { ZoomTier } from './useSemanticZoom';

interface UseNavMapDerivedGraphOptions {
  graph: NavMapGraph | null;
  nodes: Node[];
  zoomTier: ZoomTier;
  galleryNodeIds: Set<string>;
  selectedFlowIndex: number | null;
}

function addGalleryFlag(node: Node, galleryNodeIds: Set<string>): Node {
  if (node.type === 'groupNode') return node;
  const hasGallery = galleryNodeIds.has(node.id);
  if (!hasGallery) return node;
  return { ...node, data: { ...node.data, hasGallery: true } };
}

export function useNavMapDerivedGraph({
  graph,
  nodes,
  zoomTier,
  galleryNodeIds,
  selectedFlowIndex,
}: UseNavMapDerivedGraphOptions) {
  const nodeGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of graph?.nodes ?? []) {
      map.set(node.id, node.group);
    }
    return map;
  }, [graph]);

  const zoomedNodes = useMemo(() => {
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

    if (zoomTier === 'detail') {
      return nodes.map(node => addGalleryFlag(node, galleryNodeIds));
    }

    return nodes.map(node => {
      if (node.type === 'groupNode') return node;
      const withGallery = addGalleryFlag(node, galleryNodeIds);
      return { ...withGallery, type: 'compactNode' };
    });
  }, [nodes, zoomTier, galleryNodeIds]);

  const activeFlow = useMemo(() => {
    if (selectedFlowIndex === null || !graph?.flows) return null;
    return graph.flows[selectedFlowIndex] ?? null;
  }, [selectedFlowIndex, graph]);

  return { activeFlow, nodeGroupMap, zoomedNodes };
}
