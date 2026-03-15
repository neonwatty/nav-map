import type { AnalyticsAdapter, NavMapAnalytics } from './types.js';

export class StaticAnalytics implements AnalyticsAdapter {
  private data: NavMapAnalytics;

  constructor(data: NavMapAnalytics) {
    this.data = data;
  }

  async fetchPageViews(): Promise<Record<string, number>> {
    return this.data.pageViews;
  }

  async fetchTransitions(): Promise<Record<string, number>> {
    return this.data.transitions;
  }
}

export class RestAnalytics implements AnalyticsAdapter {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async fetchPageViews(period: { start: string; end: string }): Promise<Record<string, number>> {
    const response = await fetch(`${this.url}/page-views?start=${period.start}&end=${period.end}`);
    return response.json();
  }

  async fetchTransitions(period: { start: string; end: string }): Promise<Record<string, number>> {
    const response = await fetch(`${this.url}/transitions?start=${period.start}&end=${period.end}`);
    return response.json();
  }
}
