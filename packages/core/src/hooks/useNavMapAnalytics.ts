import { useEffect, useState } from 'react';
import type { AnalyticsAdapter, NavMapAnalytics } from '../analytics/types';

interface UseNavMapAnalyticsResult {
  showAnalytics: boolean;
  setShowAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
  analyticsData: NavMapAnalytics | null;
  analyticsPeriod: NavMapAnalytics['period'];
  setAnalyticsPeriod: React.Dispatch<React.SetStateAction<NavMapAnalytics['period']>>;
}

export function useNavMapAnalytics(analyticsAdapter?: AnalyticsAdapter): UseNavMapAnalyticsResult {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<NavMapAnalytics | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(() => ({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  }));

  useEffect(() => {
    if (!analyticsAdapter || !showAnalytics) return;
    Promise.all([
      analyticsAdapter.fetchPageViews(analyticsPeriod),
      analyticsAdapter.fetchTransitions(analyticsPeriod),
    ]).then(([pageViews, transitions]) => {
      setAnalyticsData({ period: analyticsPeriod, pageViews, transitions });
    });
  }, [analyticsAdapter, showAnalytics, analyticsPeriod]);

  return {
    showAnalytics,
    setShowAnalytics,
    analyticsData,
    analyticsPeriod,
    setAnalyticsPeriod,
  };
}
