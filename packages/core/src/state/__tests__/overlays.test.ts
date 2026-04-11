import { describe, it, expect } from 'vitest';
import { initialOverlaysState, overlaysReducer, type OverlaysAction } from '../slices/overlays';

describe('overlaysReducer', () => {
  describe('initial state', () => {
    it('starts with all overlays closed', () => {
      expect(initialOverlaysState).toEqual({
        showHelp: false,
        showSearch: false,
        searchQuery: '',
        showAnalytics: false,
        contextMenu: null,
        hoverPreview: null,
      });
    });

    it('returns state unchanged for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as OverlaysAction;
      const result = overlaysReducer(initialOverlaysState, unknown);
      expect(result).toBe(initialOverlaysState);
    });
  });

  describe('search actions', () => {
    it('openSearch sets showSearch to true', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/openSearch',
      });
      expect(result.showSearch).toBe(true);
    });

    it('openSearch returns the same reference when already open', () => {
      const open = { ...initialOverlaysState, showSearch: true };
      const result = overlaysReducer(open, { type: 'overlays/openSearch' });
      expect(result).toBe(open);
    });

    it('closeSearch sets showSearch to false and clears searchQuery', () => {
      const open = {
        ...initialOverlaysState,
        showSearch: true,
        searchQuery: 'dashboard',
      };
      const result = overlaysReducer(open, { type: 'overlays/closeSearch' });
      expect(result.showSearch).toBe(false);
      expect(result.searchQuery).toBe('');
    });

    it('closeSearch returns the same reference when already closed with empty query', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/closeSearch',
      });
      expect(result).toBe(initialOverlaysState);
    });

    it('setSearchQuery updates the query string', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/setSearchQuery',
        query: 'checkout',
      });
      expect(result.searchQuery).toBe('checkout');
    });

    it('setSearchQuery returns the same reference when query is unchanged', () => {
      const state = { ...initialOverlaysState, searchQuery: 'checkout' };
      const result = overlaysReducer(state, {
        type: 'overlays/setSearchQuery',
        query: 'checkout',
      });
      expect(result).toBe(state);
    });
  });

  describe('help actions', () => {
    it('openHelp sets showHelp to true', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/openHelp',
      });
      expect(result.showHelp).toBe(true);
    });

    it('openHelp returns the same reference when already open', () => {
      const open = { ...initialOverlaysState, showHelp: true };
      const result = overlaysReducer(open, { type: 'overlays/openHelp' });
      expect(result).toBe(open);
    });

    it('closeHelp sets showHelp to false', () => {
      const open = { ...initialOverlaysState, showHelp: true };
      const result = overlaysReducer(open, { type: 'overlays/closeHelp' });
      expect(result.showHelp).toBe(false);
    });

    it('closeHelp returns the same reference when already closed', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/closeHelp',
      });
      expect(result).toBe(initialOverlaysState);
    });
  });

  describe('analytics visibility actions', () => {
    it('openAnalytics sets showAnalytics to true', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/openAnalytics',
      });
      expect(result.showAnalytics).toBe(true);
    });

    it('openAnalytics returns the same reference when already open', () => {
      const open = { ...initialOverlaysState, showAnalytics: true };
      const result = overlaysReducer(open, { type: 'overlays/openAnalytics' });
      expect(result).toBe(open);
    });

    it('closeAnalytics sets showAnalytics to false', () => {
      const open = { ...initialOverlaysState, showAnalytics: true };
      const result = overlaysReducer(open, { type: 'overlays/closeAnalytics' });
      expect(result.showAnalytics).toBe(false);
    });

    it('closeAnalytics returns the same reference when already closed', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/closeAnalytics',
      });
      expect(result).toBe(initialOverlaysState);
    });
  });

  describe('context menu actions', () => {
    const sampleMenu = {
      x: 100,
      y: 200,
      nodeId: 'page-home',
      route: '/home',
      filePath: 'app/home/page.tsx',
    };

    it('showContextMenu sets the menu payload', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/showContextMenu',
        menu: sampleMenu,
      });
      expect(result.contextMenu).toEqual(sampleMenu);
    });

    it('showContextMenu replaces an existing menu', () => {
      const prior = {
        ...initialOverlaysState,
        contextMenu: { ...sampleMenu, nodeId: 'old' },
      };
      const result = overlaysReducer(prior, {
        type: 'overlays/showContextMenu',
        menu: sampleMenu,
      });
      expect(result.contextMenu).toEqual(sampleMenu);
      expect(result.contextMenu?.nodeId).toBe('page-home');
    });

    it('hideContextMenu clears the menu', () => {
      const prior = { ...initialOverlaysState, contextMenu: sampleMenu };
      const result = overlaysReducer(prior, {
        type: 'overlays/hideContextMenu',
      });
      expect(result.contextMenu).toBeNull();
    });

    it('hideContextMenu returns the same reference when already hidden', () => {
      const result = overlaysReducer(initialOverlaysState, {
        type: 'overlays/hideContextMenu',
      });
      expect(result).toBe(initialOverlaysState);
    });
  });
});
