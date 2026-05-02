export interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual';
    framework?: string;
    diagnostics?: CrawlDiagnostics;
  };
  nodes: {
    id: string;
    route: string;
    label: string;
    group: string;
    screenshot?: string;
    filePath?: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'link' | 'redirect' | 'router-push' | 'shared-nav';
    discovery?: 'static-link' | 'observed-interaction';
  }[];
  groups: {
    id: string;
    label: string;
    color?: string;
    routePrefix?: string;
  }[];
}

export interface CrawlDiagnostics {
  crawl: {
    attemptedPages: number;
    successfulPages: number;
    failedPages: CrawlFailure[];
    screenshotFailures: ScreenshotFailure[];
    maxPagesReached: boolean;
  };
}

export interface CrawlFailure {
  url: string;
  reason: string;
}

export interface ScreenshotFailure {
  url: string;
  path: string;
  reason: string;
}

export interface CrawlOptions {
  startUrl: string;
  name?: string;
  screenshotDir?: string;
  maxPages?: number;
  context?: import('playwright').BrowserContext;
  interactions?: boolean;
  maxInteractionsPerPage?: number;
  includeInteraction?: string[];
  excludeInteraction?: string[];
}

export interface DiscoveredNavigation {
  href: string;
  text: string;
  discovery: 'static-link' | 'observed-interaction';
}

export interface CrawlState {
  visited: Set<string>;
  queue: string[];
  nodesMap: Map<string, NavMapGraph['nodes'][number]>;
  edgesMap: Map<string, NavMapGraph['edges'][number]>;
  groupsSet: Map<string, NavMapGraph['groups'][number]>;
  failedPages: CrawlFailure[];
  screenshotFailures: ScreenshotFailure[];
}
