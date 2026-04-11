import { useMemo, type Dispatch } from 'react';

export type ContextMenuState = {
  x: number;
  y: number;
  nodeId: string;
  route: string;
  filePath?: string;
};

export type HoverPreviewState = {
  screenshot?: string;
  label: string;
  position: { x: number; y: number } | null;
};

export type OverlaysState = {
  showHelp: boolean;
  showSearch: boolean;
  searchQuery: string;
  showAnalytics: boolean;
  contextMenu: ContextMenuState | null;
  hoverPreview: HoverPreviewState | null;
};

export const initialOverlaysState: OverlaysState = {
  showHelp: false,
  showSearch: false,
  searchQuery: '',
  showAnalytics: false,
  contextMenu: null,
  hoverPreview: null,
};

export type OverlaysAction =
  | { type: 'overlays/openSearch' }
  | { type: 'overlays/closeSearch' }
  | { type: 'overlays/setSearchQuery'; query: string }
  | { type: 'overlays/openHelp' }
  | { type: 'overlays/closeHelp' }
  | { type: 'overlays/openAnalytics' }
  | { type: 'overlays/closeAnalytics' }
  | { type: 'overlays/showContextMenu'; menu: ContextMenuState }
  | { type: 'overlays/hideContextMenu' }
  | { type: 'overlays/showHoverPreview'; preview: HoverPreviewState }
  | { type: 'overlays/hideHoverPreview' };

export function overlaysReducer(state: OverlaysState, action: OverlaysAction): OverlaysState {
  switch (action.type) {
    case 'overlays/openSearch':
      if (state.showSearch) return state;
      return { ...state, showSearch: true };

    case 'overlays/closeSearch':
      if (!state.showSearch && state.searchQuery === '') return state;
      return { ...state, showSearch: false, searchQuery: '' };

    case 'overlays/setSearchQuery':
      if (state.searchQuery === action.query) return state;
      return { ...state, searchQuery: action.query };

    case 'overlays/openHelp':
      if (state.showHelp) return state;
      return { ...state, showHelp: true };

    case 'overlays/closeHelp':
      if (!state.showHelp) return state;
      return { ...state, showHelp: false };

    case 'overlays/openAnalytics':
      if (state.showAnalytics) return state;
      return { ...state, showAnalytics: true };

    case 'overlays/closeAnalytics':
      if (!state.showAnalytics) return state;
      return { ...state, showAnalytics: false };

    case 'overlays/showContextMenu':
      return { ...state, contextMenu: action.menu };

    case 'overlays/hideContextMenu':
      if (state.contextMenu === null) return state;
      return { ...state, contextMenu: null };

    default:
      return state;
  }
}

export function useOverlaysActions(dispatch: Dispatch<OverlaysAction>) {
  return useMemo(
    () => ({
      openSearch: () => dispatch({ type: 'overlays/openSearch' }),
      closeSearch: () => dispatch({ type: 'overlays/closeSearch' }),
      setSearchQuery: (query: string) => dispatch({ type: 'overlays/setSearchQuery', query }),
      openHelp: () => dispatch({ type: 'overlays/openHelp' }),
      closeHelp: () => dispatch({ type: 'overlays/closeHelp' }),
      openAnalytics: () => dispatch({ type: 'overlays/openAnalytics' }),
      closeAnalytics: () => dispatch({ type: 'overlays/closeAnalytics' }),
      showContextMenu: (menu: ContextMenuState) =>
        dispatch({ type: 'overlays/showContextMenu', menu }),
      hideContextMenu: () => dispatch({ type: 'overlays/hideContextMenu' }),
      showHoverPreview: (preview: HoverPreviewState) =>
        dispatch({ type: 'overlays/showHoverPreview', preview }),
      hideHoverPreview: () => dispatch({ type: 'overlays/hideHoverPreview' }),
    }),
    [dispatch]
  );
}
