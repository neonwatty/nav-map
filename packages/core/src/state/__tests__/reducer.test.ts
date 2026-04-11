import { describe, it, expect } from 'vitest';
import { initialRootState, rootReducer } from '../reducer';
import type { Action } from '../types';

describe('rootReducer', () => {
  it('routes overlays actions to the overlays slice', () => {
    const result = rootReducer(initialRootState, { type: 'overlays/openSearch' });
    expect(result.overlays.showSearch).toBe(true);
  });

  it('routes display actions to the display slice', () => {
    const result = rootReducer(initialRootState, { type: 'display/toggleSharedNav' });
    expect(result.display.showSharedNav).toBe(true);
  });

  it('routes flow actions to the flow slice', () => {
    const result = rootReducer(initialRootState, { type: 'flow/selectFlow', index: 1 });
    expect(result.flow.selectedFlowIndex).toBe(1);
  });

  it('routes view actions to the view slice', () => {
    const result = rootReducer(initialRootState, { type: 'view/setViewMode', mode: 'map' });
    expect(result.view.viewMode).toBe('map');
  });

  it('routes groups actions to the groups slice', () => {
    const result = rootReducer(initialRootState, {
      type: 'groups/setFocusedGroup',
      id: 'group-1',
    });
    expect(result.groups.focusedGroupId).toBe('group-1');
  });

  it('returns the same root reference when no slice changed', () => {
    const unknown = { type: 'unknown/action' } as unknown as Action;
    const result = rootReducer(initialRootState, unknown);
    expect(result).toBe(initialRootState);
  });

  it('returns a new root reference when a slice changed', () => {
    const result = rootReducer(initialRootState, { type: 'overlays/openSearch' });
    expect(result).not.toBe(initialRootState);
  });

  it('produces a new slice reference only for the changed slice', () => {
    const result = rootReducer(initialRootState, { type: 'display/toggleFocusMode' });
    expect(result.display).not.toBe(initialRootState.display);
    expect(result.overlays).toBe(initialRootState.overlays);
    expect(result.flow).toBe(initialRootState.flow);
    expect(result.view).toBe(initialRootState.view);
    expect(result.groups).toBe(initialRootState.groups);
  });

  it('returns the same root reference on idempotent dispatch', () => {
    const first = rootReducer(initialRootState, { type: 'overlays/openSearch' });
    const second = rootReducer(first, { type: 'overlays/openSearch' });
    expect(second).toBe(first);
  });
});
