import type { AnalyticsAdapter } from './types.js';

export interface PostHogConfig {
  apiKey: string;
  projectId: string | number;
  host?: string; // default: https://us.posthog.com
}

export class PostHogAnalytics implements AnalyticsAdapter {
  private config: PostHogConfig;

  constructor(config: PostHogConfig) {
    this.config = config;
  }

  async fetchPageViews(period: { start: string; end: string }): Promise<Record<string, number>> {
    const host = this.config.host ?? 'https://us.posthog.com';
    const query = `SELECT properties.$pathname as path, count() as views FROM events WHERE event = '$pageview' AND timestamp >= '${period.start}' AND timestamp <= '${period.end}' GROUP BY path ORDER BY views DESC`;

    const response = await fetch(`${host}/api/projects/${this.config.projectId}/query/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    });

    const data = await response.json();
    const result: Record<string, number> = {};

    if (data.results) {
      for (const [path, views] of data.results) {
        result[path] = views;
      }
    }

    return result;
  }

  async fetchTransitions(period: { start: string; end: string }): Promise<Record<string, number>> {
    // PostHog doesn't have a direct transitions API; we use session recordings
    // For now, return empty - could be enhanced with funnel queries
    return {};
  }
}
