import { useMemo, type Dispatch } from 'react';
import type { NavMapAnalytics } from '../../analytics/types';

export type AnalyticsPeriod = { start: string; end: string };

export type AnalyticsState = {
  data: NavMapAnalytics | null;
  period: AnalyticsPeriod;
};

export type AnalyticsAction =
  | { type: 'analytics/setData'; data: NavMapAnalytics | null }
  | { type: 'analytics/setPeriod'; period: AnalyticsPeriod };

export const initialAnalyticsState: AnalyticsState = {
  data: null,
  period: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  },
};

export function analyticsReducer(state: AnalyticsState, action: AnalyticsAction): AnalyticsState {
  switch (action.type) {
    case 'analytics/setData':
      if (state.data === action.data) return state;
      return { ...state, data: action.data };

    case 'analytics/setPeriod':
      if (state.period.start === action.period.start && state.period.end === action.period.end)
        return state;
      return { ...state, period: action.period };

    default:
      return state;
  }
}

export function useAnalyticsActions(dispatch: Dispatch<AnalyticsAction>) {
  return useMemo(
    () => ({
      setData: (data: NavMapAnalytics | null) => dispatch({ type: 'analytics/setData', data }),
      setPeriod: (period: AnalyticsPeriod) => dispatch({ type: 'analytics/setPeriod', period }),
    }),
    [dispatch]
  );
}
