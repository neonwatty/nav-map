import { initialOverlaysState, overlaysReducer } from './slices/overlays';
import type { Action, RootState } from './types';

export const initialRootState: RootState = {
  overlays: initialOverlaysState,
};

// When additional slices are migrated in future PRs, replace the inline
// reference check below with a loop that runs each slice reducer, collects
// the results, and returns the same root reference if every slice's reference
// is unchanged. Avoid repeating the `if (x === state.x) return state` guard
// for each slice — that pattern does not scale cleanly past two slices.
export function rootReducer(state: RootState, action: Action): RootState {
  const overlays = overlaysReducer(state.overlays, action);
  if (overlays === state.overlays) return state;
  return { ...state, overlays };
}
