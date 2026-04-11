import { useMemo, type Dispatch } from 'react';

export type DisplayState = {
  showSharedNav: boolean;
  focusMode: boolean;
  showRedirects: boolean;
};

export const initialDisplayState: DisplayState = {
  showSharedNav: false,
  focusMode: false,
  showRedirects: false,
};

export type DisplayAction =
  | { type: 'display/showSharedNav' }
  | { type: 'display/hideSharedNav' }
  | { type: 'display/toggleSharedNav' }
  | { type: 'display/enableFocusMode' }
  | { type: 'display/disableFocusMode' }
  | { type: 'display/toggleFocusMode' }
  | { type: 'display/showRedirects' }
  | { type: 'display/hideRedirects' }
  | { type: 'display/toggleRedirects' };

export function displayReducer(state: DisplayState, action: DisplayAction): DisplayState {
  switch (action.type) {
    case 'display/showSharedNav':
      if (state.showSharedNav) return state;
      return { ...state, showSharedNav: true };

    case 'display/hideSharedNav':
      if (!state.showSharedNav) return state;
      return { ...state, showSharedNav: false };

    case 'display/toggleSharedNav':
      return { ...state, showSharedNav: !state.showSharedNav };

    case 'display/enableFocusMode':
      if (state.focusMode) return state;
      return { ...state, focusMode: true };

    case 'display/disableFocusMode':
      if (!state.focusMode) return state;
      return { ...state, focusMode: false };

    case 'display/toggleFocusMode':
      return { ...state, focusMode: !state.focusMode };

    case 'display/showRedirects':
      if (state.showRedirects) return state;
      return { ...state, showRedirects: true };

    case 'display/hideRedirects':
      if (!state.showRedirects) return state;
      return { ...state, showRedirects: false };

    case 'display/toggleRedirects':
      return { ...state, showRedirects: !state.showRedirects };

    default:
      return state;
  }
}

export function useDisplayActions(dispatch: Dispatch<DisplayAction>) {
  return useMemo(
    () => ({
      showSharedNav: () => dispatch({ type: 'display/showSharedNav' }),
      hideSharedNav: () => dispatch({ type: 'display/hideSharedNav' }),
      toggleSharedNav: () => dispatch({ type: 'display/toggleSharedNav' }),
      enableFocusMode: () => dispatch({ type: 'display/enableFocusMode' }),
      disableFocusMode: () => dispatch({ type: 'display/disableFocusMode' }),
      toggleFocusMode: () => dispatch({ type: 'display/toggleFocusMode' }),
      showRedirects: () => dispatch({ type: 'display/showRedirects' }),
      hideRedirects: () => dispatch({ type: 'display/hideRedirects' }),
      toggleRedirects: () => dispatch({ type: 'display/toggleRedirects' }),
    }),
    [dispatch]
  );
}
