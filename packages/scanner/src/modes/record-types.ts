import type { PageRecord } from './dedup.js';

export interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'e2e-record';
  };
  nodes: {
    id: string;
    route: string;
    label: string;
    group: string;
    screenshot?: string;
    metadata?: Record<string, unknown>;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'link' | 'redirect' | 'router-push' | 'shared-nav';
  }[];
  groups: { id: string; label: string; color?: string; routePrefix?: string }[];
  flows?: { name: string; steps: string[] }[];
}

export interface RecordOptions {
  playwrightConfig: string;
  storageState?: string;
  routesJson?: string;
  screenshotDir: string;
  output: string;
  name?: string;
}

export interface TraceEntry {
  testName: string;
  testFile: string;
  workerId: number;
  tracePath: string;
  status: string;
}

export interface AggregatedTraceNavigations {
  pages: Map<string, PageRecord>;
  edgeSet: Map<string, { source: string; target: string; visitCount: number }>;
  flows: { name: string; steps: string[] }[];
  baseUrl?: string;
}
