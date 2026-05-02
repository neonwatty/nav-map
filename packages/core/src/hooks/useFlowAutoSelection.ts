import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { NavMapGraph, ViewMode } from '../types';

interface UseFlowAutoSelectionOptions {
  graph: NavMapGraph | null;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  setSelectedFlowIndex: Dispatch<SetStateAction<number | null>>;
}

export function useFlowAutoSelection({
  graph,
  viewMode,
  selectedFlowIndex,
  setSelectedFlowIndex,
}: UseFlowAutoSelectionOptions): void {
  useEffect(() => {
    const flowCount = graph?.flows?.length ?? 0;
    if (viewMode === 'flow' && flowCount > 0 && selectedFlowIndex === null) {
      setSelectedFlowIndex(0);
      return;
    }
    if (selectedFlowIndex !== null && selectedFlowIndex >= flowCount) {
      setSelectedFlowIndex(flowCount > 0 && viewMode === 'flow' ? 0 : null);
    }
  }, [graph?.flows?.length, selectedFlowIndex, setSelectedFlowIndex, viewMode]);
}
