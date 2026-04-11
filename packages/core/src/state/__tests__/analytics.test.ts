import { describe, it, expect } from 'vitest';
import { initialAnalyticsState, analyticsReducer, type AnalyticsAction } from '../slices/analytics';
import type { NavMapAnalytics } from '../../analytics/types';

describe('analyticsReducer', () => {
  describe('initial state', () => {
    it('starts with null data and a valid period', () => {
      expect(initialAnalyticsState.data).toBeNull();
      expect(typeof initialAnalyticsState.period.start).toBe('string');
      expect(initialAnalyticsState.period.start.length).toBeGreaterThan(0);
      expect(typeof initialAnalyticsState.period.end).toBe('string');
      expect(initialAnalyticsState.period.end.length).toBeGreaterThan(0);
    });

    it('returns state unchanged for unknown actions', () => {
      const unknown = { type: 'unknown/action' } as unknown as AnalyticsAction;
      const result = analyticsReducer(initialAnalyticsState, unknown);
      expect(result).toBe(initialAnalyticsState);
    });
  });

  describe('analytics/setData', () => {
    const sampleData: NavMapAnalytics = {
      period: { start: '2025-03-01', end: '2025-03-31' },
      pageViews: { 'page-home': 42, 'page-about': 7 },
      transitions: { 'home->about': 5 },
    };

    it('sets the data payload', () => {
      const result = analyticsReducer(initialAnalyticsState, {
        type: 'analytics/setData',
        data: sampleData,
      });
      expect(result.data).toBe(sampleData);
    });

    it('returns the same reference when data is already the same reference', () => {
      const state = { ...initialAnalyticsState, data: sampleData };
      const result = analyticsReducer(state, {
        type: 'analytics/setData',
        data: sampleData,
      });
      expect(result).toBe(state);
    });
  });

  describe('analytics/setPeriod', () => {
    it('updates both start and end fields', () => {
      const newPeriod = { start: '2025-01-01', end: '2025-01-31' };
      const result = analyticsReducer(initialAnalyticsState, {
        type: 'analytics/setPeriod',
        period: newPeriod,
      });
      expect(result.period.start).toBe('2025-01-01');
      expect(result.period.end).toBe('2025-01-31');
    });

    it('returns the same reference when both fields are unchanged', () => {
      const state = {
        ...initialAnalyticsState,
        period: { start: '2025-01-01', end: '2025-01-31' },
      };
      const result = analyticsReducer(state, {
        type: 'analytics/setPeriod',
        period: { start: '2025-01-01', end: '2025-01-31' },
      });
      expect(result).toBe(state);
    });
  });
});
