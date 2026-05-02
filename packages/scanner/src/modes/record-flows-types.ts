export interface FlowStep {
  action: 'goto' | 'waitFor' | 'click' | 'fill' | 'end';
  title: string;
  screenshot?: string;
  timestamp?: number;
}

export interface FlowGallery {
  [nodeId: string]: FlowStep[];
}

export interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual' | 'e2e-record';
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
  flows?: {
    name: string;
    steps: string[];
    gallery?: FlowGallery;
    partial?: boolean;
  }[];
  sharedNav?: unknown;
}

export interface RecordFlowsOptions {
  flowsDir: string;
  baseUrl: string;
  storageState?: string;
  routesJson?: string;
  screenshotDir: string;
  output: string;
  name?: string;
  failOnTestErrors?: boolean;
}

export interface RecordFlowsManifest {
  traces: {
    testName: string;
    tracePath: string;
    status?: string;
  }[];
}
