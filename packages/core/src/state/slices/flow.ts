import { useMemo, type Dispatch } from 'react';

export type FlowState = {
  selectedFlowIndex: number | null;
  isAnimatingFlow: boolean;
  galleryNodeId: string | null;
};

export const initialFlowState: FlowState = {
  selectedFlowIndex: null,
  isAnimatingFlow: false,
  galleryNodeId: null,
};

export type FlowAction =
  | { type: 'flow/selectFlow'; index: number }
  | { type: 'flow/clearFlow' }
  | { type: 'flow/startAnimation' }
  | { type: 'flow/stopAnimation' }
  | { type: 'flow/openGallery'; nodeId: string }
  | { type: 'flow/closeGallery' };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'flow/selectFlow':
      if (state.selectedFlowIndex === action.index) return state;
      return { ...state, selectedFlowIndex: action.index };

    case 'flow/clearFlow':
      if (state.selectedFlowIndex === null) return state;
      return { ...state, selectedFlowIndex: null };

    case 'flow/startAnimation':
      if (state.isAnimatingFlow) return state;
      return { ...state, isAnimatingFlow: true };

    case 'flow/stopAnimation':
      if (!state.isAnimatingFlow) return state;
      return { ...state, isAnimatingFlow: false };

    case 'flow/openGallery':
      if (state.galleryNodeId === action.nodeId) return state;
      return { ...state, galleryNodeId: action.nodeId };

    case 'flow/closeGallery':
      if (state.galleryNodeId === null) return state;
      return { ...state, galleryNodeId: null };

    default:
      return state;
  }
}

export function useFlowActions(dispatch: Dispatch<FlowAction>) {
  return useMemo(
    () => ({
      selectFlow: (index: number) => dispatch({ type: 'flow/selectFlow', index }),
      clearFlow: () => dispatch({ type: 'flow/clearFlow' }),
      startAnimation: () => dispatch({ type: 'flow/startAnimation' }),
      stopAnimation: () => dispatch({ type: 'flow/stopAnimation' }),
      openGallery: (nodeId: string) => dispatch({ type: 'flow/openGallery', nodeId }),
      closeGallery: () => dispatch({ type: 'flow/closeGallery' }),
    }),
    [dispatch]
  );
}
