import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsAdapter } from '../analytics/types';
import { useNavMapAnalytics } from './useNavMapAnalytics';

function createAnalyticsAdapter(): AnalyticsAdapter {
  return {
    fetchPageViews: vi.fn().mockResolvedValue({ n1: 5 }),
    fetchTransitions: vi.fn().mockResolvedValue({ e1: 2 }),
  };
}

describe('useNavMapAnalytics', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-05-01T12:00:00Z'));
  });

  it('initializes hidden with a 30-day analytics period', () => {
    const { result } = renderHook(() => useNavMapAnalytics());

    expect(result.current.showAnalytics).toBe(false);
    expect(result.current.analyticsData).toBeNull();
    expect(result.current.analyticsPeriod).toEqual({ start: '2026-04-01', end: '2026-05-01' });
  });

  it('does not fetch analytics until the panel is shown', () => {
    const analyticsAdapter = createAnalyticsAdapter();

    renderHook(() => useNavMapAnalytics(analyticsAdapter));

    expect(analyticsAdapter.fetchPageViews).not.toHaveBeenCalled();
    expect(analyticsAdapter.fetchTransitions).not.toHaveBeenCalled();
  });

  it('fetches analytics when shown', async () => {
    const analyticsAdapter = createAnalyticsAdapter();
    const { result } = renderHook(() => useNavMapAnalytics(analyticsAdapter));

    act(() => {
      result.current.setShowAnalytics(true);
    });

    await waitFor(() => {
      expect(result.current.analyticsData).toEqual({
        period: { start: '2026-04-01', end: '2026-05-01' },
        pageViews: { n1: 5 },
        transitions: { e1: 2 },
      });
    });
  });

  it('refetches analytics when the selected period changes', async () => {
    const analyticsAdapter = createAnalyticsAdapter();
    const { result } = renderHook(() => useNavMapAnalytics(analyticsAdapter));

    act(() => {
      result.current.setShowAnalytics(true);
    });
    await waitFor(() => {
      expect(analyticsAdapter.fetchPageViews).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.setAnalyticsPeriod({ start: '2026-04-15', end: '2026-05-01' });
    });

    await waitFor(() => {
      expect(analyticsAdapter.fetchPageViews).toHaveBeenLastCalledWith({
        start: '2026-04-15',
        end: '2026-05-01',
      });
      expect(analyticsAdapter.fetchTransitions).toHaveBeenLastCalledWith({
        start: '2026-04-15',
        end: '2026-05-01',
      });
    });
  });
});
