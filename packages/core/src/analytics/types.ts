export interface NavMapAnalytics {
  period: { start: string; end: string };
  pageViews: Record<string, number>;  // nodeId → count
  transitions: Record<string, number>; // edgeId → count
}

export interface AnalyticsAdapter {
  fetchPageViews(period: { start: string; end: string }): Promise<Record<string, number>>;
  fetchTransitions(period: { start: string; end: string }): Promise<Record<string, number>>;
}
