import { useState, useCallback } from 'react';
import { useOnViewportChange, type Viewport } from '@xyflow/react';

export type ZoomTier = 'overview' | 'compact' | 'detail';

const OVERVIEW_THRESHOLD = 0.12;
const DETAIL_THRESHOLD = 0.25;

function getZoomTier(zoom: number): ZoomTier {
  if (zoom < OVERVIEW_THRESHOLD) return 'overview';
  if (zoom < DETAIL_THRESHOLD) return 'compact';
  return 'detail';
}

export function useSemanticZoom() {
  const [zoomTier, setZoomTier] = useState<ZoomTier>('detail');

  useOnViewportChange({
    onChange: useCallback((viewport: Viewport) => {
      setZoomTier(getZoomTier(viewport.zoom));
    }, []),
  });

  // Backward compat
  const showDetail = zoomTier === 'detail';

  return { showDetail, zoomTier };
}
