import { describe, it, expect } from 'vitest';
import { initialFlowState, flowReducer, type FlowAction } from '../slices/flow';

describe('flowReducer', () => {
  describe('initial state', () => {
    it('starts with no flow selected and no animation', () => {
      expect(initialFlowState).toEqual({
        selectedFlowIndex: null,
        isAnimatingFlow: false,
        galleryNodeId: null,
      });
    });

    it('returns state unchanged for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as FlowAction;
      const result = flowReducer(initialFlowState, unknown);
      expect(result).toBe(initialFlowState);
    });
  });

  describe('flow selection', () => {
    it('selectFlow sets the index', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/selectFlow', index: 2 });
      expect(result.selectedFlowIndex).toBe(2);
    });

    it('selectFlow returns same reference when index unchanged', () => {
      const state = { ...initialFlowState, selectedFlowIndex: 2 };
      const result = flowReducer(state, { type: 'flow/selectFlow', index: 2 });
      expect(result).toBe(state);
    });

    it('selectFlow replaces existing index', () => {
      const state = { ...initialFlowState, selectedFlowIndex: 1 };
      const result = flowReducer(state, { type: 'flow/selectFlow', index: 3 });
      expect(result.selectedFlowIndex).toBe(3);
    });

    it('clearFlow sets index to null', () => {
      const state = { ...initialFlowState, selectedFlowIndex: 2 };
      const result = flowReducer(state, { type: 'flow/clearFlow' });
      expect(result.selectedFlowIndex).toBeNull();
    });

    it('clearFlow returns same reference when already null', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/clearFlow' });
      expect(result).toBe(initialFlowState);
    });
  });

  describe('animation', () => {
    it('startAnimation sets isAnimatingFlow to true', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/startAnimation' });
      expect(result.isAnimatingFlow).toBe(true);
    });

    it('startAnimation returns same reference when already animating', () => {
      const state = { ...initialFlowState, isAnimatingFlow: true };
      const result = flowReducer(state, { type: 'flow/startAnimation' });
      expect(result).toBe(state);
    });

    it('stopAnimation sets isAnimatingFlow to false', () => {
      const state = { ...initialFlowState, isAnimatingFlow: true };
      const result = flowReducer(state, { type: 'flow/stopAnimation' });
      expect(result.isAnimatingFlow).toBe(false);
    });

    it('stopAnimation returns same reference when not animating', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/stopAnimation' });
      expect(result).toBe(initialFlowState);
    });
  });

  describe('gallery', () => {
    it('openGallery sets nodeId', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/openGallery', nodeId: 'home' });
      expect(result.galleryNodeId).toBe('home');
    });

    it('openGallery returns same reference when same nodeId', () => {
      const state = { ...initialFlowState, galleryNodeId: 'home' };
      const result = flowReducer(state, { type: 'flow/openGallery', nodeId: 'home' });
      expect(result).toBe(state);
    });

    it('openGallery replaces existing nodeId', () => {
      const state = { ...initialFlowState, galleryNodeId: 'home' };
      const result = flowReducer(state, { type: 'flow/openGallery', nodeId: 'about' });
      expect(result.galleryNodeId).toBe('about');
    });

    it('closeGallery sets nodeId to null', () => {
      const state = { ...initialFlowState, galleryNodeId: 'home' };
      const result = flowReducer(state, { type: 'flow/closeGallery' });
      expect(result.galleryNodeId).toBeNull();
    });

    it('closeGallery returns same reference when already null', () => {
      const result = flowReducer(initialFlowState, { type: 'flow/closeGallery' });
      expect(result).toBe(initialFlowState);
    });
  });
});
