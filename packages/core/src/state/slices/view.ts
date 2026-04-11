import { useMemo, type Dispatch } from 'react';
import type { ViewMode, EdgeMode } from '../../types';

export type ViewState = {
  viewMode: ViewMode;
  edgeMode: EdgeMode;
  treeRootId: string | null;
};

export type ViewAction =
  | { type: 'view/setViewMode'; mode: ViewMode }
  | { type: 'view/setEdgeMode'; mode: EdgeMode }
  | { type: 'view/setTreeRootId'; id: string | null };

export function createInitialViewState(
  defaultViewMode: ViewMode = 'hierarchy',
  defaultEdgeMode: EdgeMode = 'smooth'
): ViewState {
  return {
    viewMode: defaultViewMode,
    edgeMode: defaultEdgeMode,
    treeRootId: null,
  };
}

export const initialViewState: ViewState = createInitialViewState();

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'view/setViewMode':
      if (state.viewMode === action.mode) return state;
      return { ...state, viewMode: action.mode };

    case 'view/setEdgeMode':
      if (state.edgeMode === action.mode) return state;
      return { ...state, edgeMode: action.mode };

    case 'view/setTreeRootId':
      if (state.treeRootId === action.id) return state;
      return { ...state, treeRootId: action.id };

    default:
      return state;
  }
}

export function useViewActions(dispatch: Dispatch<ViewAction>) {
  return useMemo(
    () => ({
      setViewMode: (mode: ViewMode) => dispatch({ type: 'view/setViewMode', mode }),
      setEdgeMode: (mode: EdgeMode) => dispatch({ type: 'view/setEdgeMode', mode }),
      setTreeRootId: (id: string | null) => dispatch({ type: 'view/setTreeRootId', id }),
    }),
    [dispatch]
  );
}
