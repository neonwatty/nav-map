import { describe, it, expect } from 'vitest';
import { initialDisplayState, displayReducer, type DisplayAction } from '../slices/display';

describe('displayReducer', () => {
  describe('initial state', () => {
    it('starts with all display toggles off', () => {
      expect(initialDisplayState).toEqual({
        showSharedNav: false,
        focusMode: false,
        showRedirects: false,
      });
    });

    it('returns state unchanged for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as DisplayAction;
      const result = displayReducer(initialDisplayState, unknown);
      expect(result).toBe(initialDisplayState);
    });
  });

  describe('sharedNav actions', () => {
    it('showSharedNav sets to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/showSharedNav' });
      expect(result.showSharedNav).toBe(true);
    });

    it('showSharedNav returns same reference when already true', () => {
      const on = { ...initialDisplayState, showSharedNav: true };
      const result = displayReducer(on, { type: 'display/showSharedNav' });
      expect(result).toBe(on);
    });

    it('hideSharedNav sets to false', () => {
      const on = { ...initialDisplayState, showSharedNav: true };
      const result = displayReducer(on, { type: 'display/hideSharedNav' });
      expect(result.showSharedNav).toBe(false);
    });

    it('hideSharedNav returns same reference when already false', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/hideSharedNav' });
      expect(result).toBe(initialDisplayState);
    });

    it('toggleSharedNav flips from false to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/toggleSharedNav' });
      expect(result.showSharedNav).toBe(true);
    });

    it('toggleSharedNav flips from true to false', () => {
      const on = { ...initialDisplayState, showSharedNav: true };
      const result = displayReducer(on, { type: 'display/toggleSharedNav' });
      expect(result.showSharedNav).toBe(false);
    });
  });

  describe('focusMode actions', () => {
    it('enableFocusMode sets to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/enableFocusMode' });
      expect(result.focusMode).toBe(true);
    });

    it('enableFocusMode returns same reference when already true', () => {
      const on = { ...initialDisplayState, focusMode: true };
      const result = displayReducer(on, { type: 'display/enableFocusMode' });
      expect(result).toBe(on);
    });

    it('disableFocusMode sets to false', () => {
      const on = { ...initialDisplayState, focusMode: true };
      const result = displayReducer(on, { type: 'display/disableFocusMode' });
      expect(result.focusMode).toBe(false);
    });

    it('disableFocusMode returns same reference when already false', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/disableFocusMode' });
      expect(result).toBe(initialDisplayState);
    });

    it('toggleFocusMode flips from false to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/toggleFocusMode' });
      expect(result.focusMode).toBe(true);
    });

    it('toggleFocusMode flips from true to false', () => {
      const on = { ...initialDisplayState, focusMode: true };
      const result = displayReducer(on, { type: 'display/toggleFocusMode' });
      expect(result.focusMode).toBe(false);
    });
  });

  describe('redirects actions', () => {
    it('showRedirects sets to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/showRedirects' });
      expect(result.showRedirects).toBe(true);
    });

    it('showRedirects returns same reference when already true', () => {
      const on = { ...initialDisplayState, showRedirects: true };
      const result = displayReducer(on, { type: 'display/showRedirects' });
      expect(result).toBe(on);
    });

    it('hideRedirects sets to false', () => {
      const on = { ...initialDisplayState, showRedirects: true };
      const result = displayReducer(on, { type: 'display/hideRedirects' });
      expect(result.showRedirects).toBe(false);
    });

    it('hideRedirects returns same reference when already false', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/hideRedirects' });
      expect(result).toBe(initialDisplayState);
    });

    it('toggleRedirects flips from false to true', () => {
      const result = displayReducer(initialDisplayState, { type: 'display/toggleRedirects' });
      expect(result.showRedirects).toBe(true);
    });

    it('toggleRedirects flips from true to false', () => {
      const on = { ...initialDisplayState, showRedirects: true };
      const result = displayReducer(on, { type: 'display/toggleRedirects' });
      expect(result.showRedirects).toBe(false);
    });
  });
});
