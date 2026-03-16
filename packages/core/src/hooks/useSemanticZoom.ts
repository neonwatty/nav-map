import { useState, useCallback } from 'react';
import { useOnViewportChange, type Viewport } from '@xyflow/react';

const ZOOM_THRESHOLD = 0.15;

export function useSemanticZoom() {
  const [showDetail, setShowDetail] = useState(true);

  useOnViewportChange({
    onChange: useCallback((viewport: Viewport) => {
      setShowDetail(viewport.zoom >= ZOOM_THRESHOLD);
    }, []),
  });

  return { showDetail, zoomThreshold: ZOOM_THRESHOLD };
}
