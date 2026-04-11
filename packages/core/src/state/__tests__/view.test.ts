import { describe, it, expect } from 'vitest';
import { initialViewState, viewReducer, type ViewAction } from '../slices/view';

describe('viewReducer', () => {
  it('starts with hierarchy view, smooth edges, no tree root', () => {
    expect(initialViewState).toEqual({
      viewMode: 'hierarchy',
      edgeMode: 'smooth',
      treeRootId: null,
    });
  });

  it('returns state unchanged for unknown actions', () => {
    const unknown = { type: 'unknown/action' } as unknown as ViewAction;
    expect(viewReducer(initialViewState, unknown)).toBe(initialViewState);
  });

  it('setViewMode changes the view mode', () => {
    const result = viewReducer(initialViewState, { type: 'view/setViewMode', mode: 'flow' });
    expect(result.viewMode).toBe('flow');
  });

  it('setViewMode returns same reference when unchanged', () => {
    const result = viewReducer(initialViewState, { type: 'view/setViewMode', mode: 'hierarchy' });
    expect(result).toBe(initialViewState);
  });

  it('setEdgeMode changes the edge mode', () => {
    const result = viewReducer(initialViewState, { type: 'view/setEdgeMode', mode: 'routed' });
    expect(result.edgeMode).toBe('routed');
  });

  it('setEdgeMode returns same reference when unchanged', () => {
    const result = viewReducer(initialViewState, { type: 'view/setEdgeMode', mode: 'smooth' });
    expect(result).toBe(initialViewState);
  });

  it('setTreeRootId sets the tree root', () => {
    const result = viewReducer(initialViewState, { type: 'view/setTreeRootId', id: 'home' });
    expect(result.treeRootId).toBe('home');
  });

  it('setTreeRootId clears with null', () => {
    const state = { ...initialViewState, treeRootId: 'home' };
    const result = viewReducer(state, { type: 'view/setTreeRootId', id: null });
    expect(result.treeRootId).toBeNull();
  });

  it('setTreeRootId returns same reference when unchanged', () => {
    const result = viewReducer(initialViewState, { type: 'view/setTreeRootId', id: null });
    expect(result).toBe(initialViewState);
  });
});
