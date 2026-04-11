import { useMemo, type Dispatch } from 'react';
import type { NavMapGraph } from '../../types';

export type GraphState = {
  graph: NavMapGraph | null;
  layoutDone: boolean;
};

export const initialGraphState: GraphState = {
  graph: null,
  layoutDone: false,
};

export type GraphAction =
  | { type: 'graph/setGraph'; graph: NavMapGraph | null }
  | { type: 'graph/setLayoutDone'; done: boolean };

export function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'graph/setGraph':
      if (state.graph === action.graph) return state;
      return { ...state, graph: action.graph };

    case 'graph/setLayoutDone':
      if (state.layoutDone === action.done) return state;
      return { ...state, layoutDone: action.done };

    default:
      return state;
  }
}

export function useGraphActions(dispatch: Dispatch<GraphAction>) {
  return useMemo(
    () => ({
      setGraph: (graph: NavMapGraph | null) => dispatch({ type: 'graph/setGraph', graph }),
      setLayoutDone: (done: boolean) => dispatch({ type: 'graph/setLayoutDone', done }),
    }),
    [dispatch]
  );
}
