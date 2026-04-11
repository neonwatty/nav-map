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
});
