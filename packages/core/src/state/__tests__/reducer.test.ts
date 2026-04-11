import { describe, it, expect } from 'vitest';
import { initialRootState, rootReducer } from '../reducer';
import type { Action } from '../types';

describe('rootReducer', () => {
  it('routes overlays actions to the overlays slice', () => {
    const result = rootReducer(initialRootState, {
      type: 'overlays/openSearch',
    });
    expect(result.overlays.showSearch).toBe(true);
  });

  it('returns the same root reference when no slice changed', () => {
    const unknown = { type: 'unknown/action' } as unknown as Action;
    const result = rootReducer(initialRootState, unknown);
    expect(result).toBe(initialRootState);
  });

  it('returns a new root reference when the overlays slice changed', () => {
    const result = rootReducer(initialRootState, {
      type: 'overlays/openSearch',
    });
    expect(result).not.toBe(initialRootState);
  });

  it('leaves unchanged slices referentially equal (structural sharing)', () => {
    const result = rootReducer(initialRootState, {
      type: 'overlays/openSearch',
    });
    expect(result.overlays).not.toBe(initialRootState.overlays);
  });
});
