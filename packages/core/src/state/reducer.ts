import { initialOverlaysState, overlaysReducer } from './slices/overlays';
import type { Action, RootState } from './types';

export const initialRootState: RootState = {
  overlays: initialOverlaysState,
};

export function rootReducer(state: RootState, action: Action): RootState {
  const overlays = overlaysReducer(state.overlays, action);
  if (overlays === state.overlays) return state;
  return { ...state, overlays };
}
