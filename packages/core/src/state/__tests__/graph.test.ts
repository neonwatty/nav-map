import { describe, it, expect } from 'vitest';
import { initialGraphState, graphReducer, type GraphAction } from '../slices/graph';
import type { NavMapGraph } from '../../types';

const sampleGraph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Test App',
    generatedAt: '2026-04-11T00:00:00Z',
    generatedBy: 'manual',
  },
  nodes: [],
  edges: [],
  groups: [],
};

describe('graphReducer', () => {
  describe('initial state', () => {
    it('starts with graph null and layoutDone false', () => {
      expect(initialGraphState).toEqual({ graph: null, layoutDone: false });
    });

    it('returns same reference for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as GraphAction;
      const result = graphReducer(initialGraphState, unknown);
      expect(result).toBe(initialGraphState);
    });
  });

  describe('graph/setGraph', () => {
    it('sets the graph object', () => {
      const result = graphReducer(initialGraphState, {
        type: 'graph/setGraph',
        graph: sampleGraph,
      });
      expect(result.graph).toBe(sampleGraph);
    });

    it('returns same reference when graph is the same reference', () => {
      const state = { ...initialGraphState, graph: sampleGraph };
      const result = graphReducer(state, { type: 'graph/setGraph', graph: sampleGraph });
      expect(result).toBe(state);
    });

    it('clears graph with null', () => {
      const state = { ...initialGraphState, graph: sampleGraph };
      const result = graphReducer(state, { type: 'graph/setGraph', graph: null });
      expect(result.graph).toBeNull();
    });
  });

  describe('graph/setLayoutDone', () => {
    it('sets layoutDone to true', () => {
      const result = graphReducer(initialGraphState, {
        type: 'graph/setLayoutDone',
        done: true,
      });
      expect(result.layoutDone).toBe(true);
    });

    it('sets layoutDone to false', () => {
      const state = { ...initialGraphState, layoutDone: true };
      const result = graphReducer(state, { type: 'graph/setLayoutDone', done: false });
      expect(result.layoutDone).toBe(false);
    });

    it('returns same reference when layoutDone is unchanged', () => {
      const result = graphReducer(initialGraphState, {
        type: 'graph/setLayoutDone',
        done: false,
      });
      expect(result).toBe(initialGraphState);
    });
  });
});
