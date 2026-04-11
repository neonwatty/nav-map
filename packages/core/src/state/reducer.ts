import { initialOverlaysState, overlaysReducer } from './slices/overlays';
import { initialDisplayState, displayReducer } from './slices/display';
import { initialFlowState, flowReducer } from './slices/flow';
import type { Action, RootState } from './types';

export const initialRootState: RootState = {
  overlays: initialOverlaysState,
  display: initialDisplayState,
  flow: initialFlowState,
};

/**
 * Root reducer delegates to each slice reducer. Returns the same state
 * reference if no slice changed (React useReducer bailout).
 */
export function rootReducer(state: RootState, action: Action): RootState {
  const next: RootState = {
    overlays: overlaysReducer(state.overlays, action as never),
    display: displayReducer(state.display, action as never),
    flow: flowReducer(state.flow, action as never),
  };

  // Structural sharing: return same reference if nothing changed
  for (const key of Object.keys(next) as (keyof RootState)[]) {
    if (next[key] !== state[key]) return next;
  }
  return state;
}
