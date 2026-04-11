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
});
