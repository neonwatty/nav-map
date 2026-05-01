import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { NavMapGraph } from '../types';
import type { RFNodeData } from '../utils/graphHelpers';

interface HoverPreview {
  screenshot?: string;
  label: string;
  position: { x: number; y: number } | null;
}

export function useNavMapGallery(graph: NavMapGraph | null) {
  const [galleryNodeId, setGalleryNodeId] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  const galleryNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const flow of graph?.flows ?? []) {
      for (const nodeId of Object.keys(flow.gallery ?? {})) {
        if ((flow.gallery?.[nodeId]?.length ?? 0) > 0) ids.add(nodeId);
      }
    }
    return ids;
  }, [graph]);

  const onNodeMouseEnter = useCallback((_: ReactMouseEvent, node: Node) => {
    const data = node.data as RFNodeData;
    if (data.screenshot) {
      setHoverPreview({
        screenshot: data.screenshot,
        label: data.label,
        position: null,
      });
    }
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoverPreview(null);
  }, []);

  const openGalleryForNode = useCallback(
    (nodeId: string) => {
      if (galleryNodeIds.has(nodeId)) {
        setGalleryNodeId(nodeId);
      }
    },
    [galleryNodeIds]
  );

  const closeGallery = useCallback(() => {
    setGalleryNodeId(null);
  }, []);

  useEffect(() => {
    if (!hoverPreview) return;
    const handler = (event: MouseEvent) => {
      setHoverPreview(prev =>
        prev ? { ...prev, position: { x: event.clientX, y: event.clientY } } : null
      );
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [hoverPreview]);

  return {
    galleryNodeId,
    galleryNodeIds,
    hoverPreview,
    onNodeMouseEnter,
    onNodeMouseLeave,
    openGalleryForNode,
    closeGallery,
  };
}
