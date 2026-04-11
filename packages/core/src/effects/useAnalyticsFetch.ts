import { useEffect } from 'react';
import type { AnalyticsAdapter, NavMapAnalytics } from '../analytics/types';
import type { AnalyticsPeriod } from '../state/slices/analytics';

interface UseAnalyticsFetchOptions {
  analyticsAdapter: AnalyticsAdapter | undefined;
  showAnalytics: boolean;
  analyticsPeriod: AnalyticsPeriod;
  setData: (data: NavMapAnalytics | null) => void;
}

/**
 * Fetches analytics data when analytics panel is visible and period changes.
 * Dispatches analytics/setData via the provided setter.
 */
export function useAnalyticsFetch({
  analyticsAdapter,
  showAnalytics,
  analyticsPeriod,
  setData,
}: UseAnalyticsFetchOptions): void {
  useEffect(() => {
    if (!analyticsAdapter || !showAnalytics) return;
    Promise.all([
      analyticsAdapter.fetchPageViews(analyticsPeriod),
      analyticsAdapter.fetchTransitions(analyticsPeriod),
    ]).then(([pageViews, transitions]) => {
      setData({ period: analyticsPeriod, pageViews, transitions });
    });
  }, [analyticsAdapter, showAnalytics, analyticsPeriod, setData]);
}
