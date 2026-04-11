import { useCallback } from 'react';
import type { useOverlaysActions } from '../state/slices/overlays';
import type { useDisplayActions } from '../state/slices/display';

export interface SetterWrappersDeps {
  hideSearch: boolean;
  hideHelp: boolean;
  showSearch: boolean;
  showHelp: boolean;
  showSharedNav: boolean;
  focusMode: boolean;
  showRedirects: boolean;
  overlays: ReturnType<typeof useOverlaysActions>;
  display: ReturnType<typeof useDisplayActions>;
}

/**
 * Bridge callbacks that adapt the setter-style API expected by `useKeyboardNav`
 * to the dispatch-based overlay and display slices.
 */
export function useSetterWrappers(deps: SetterWrappersDeps) {
  const {
    hideSearch,
    hideHelp,
    showSearch,
    showHelp,
    showSharedNav,
    focusMode,
    showRedirects,
    overlays,
    display,
  } = deps;

  const guardedSetShowSearch = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      if (hideSearch) return;
      const next = typeof v === 'function' ? v(showSearch) : v;
      if (next) overlays.openSearch();
      else overlays.closeSearch();
    },
    [hideSearch, overlays, showSearch]
  );

  const guardedSetShowHelp = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      if (hideHelp) return;
      const next = typeof v === 'function' ? v(showHelp) : v;
      if (next) overlays.openHelp();
      else overlays.closeHelp();
    },
    [hideHelp, overlays, showHelp]
  );

  const toggleableSetShowSharedNav = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(showSharedNav) : v;
      if (next) display.showSharedNav();
      else display.hideSharedNav();
    },
    [display, showSharedNav]
  );

  const toggleableSetFocusMode = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(focusMode) : v;
      if (next) display.enableFocusMode();
      else display.disableFocusMode();
    },
    [display, focusMode]
  );

  const toggleableSetShowRedirects = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(showRedirects) : v;
      if (next) display.showRedirects();
      else display.hideRedirects();
    },
    [display, showRedirects]
  );

  return {
    guardedSetShowSearch,
    guardedSetShowHelp,
    toggleableSetShowSharedNav,
    toggleableSetFocusMode,
    toggleableSetShowRedirects,
  };
}
