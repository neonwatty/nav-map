import type { CrawlOptions, CrawlState, NavMapGraph } from './crawl-types.js';

export function createCrawlState(startUrl: string): CrawlState {
  return {
    visited: new Set<string>(),
    queue: [startUrl],
    nodesMap: new Map(),
    edgesMap: new Map(),
    groupsSet: new Map(),
    failedPages: [],
    screenshotFailures: [],
  };
}

export function buildCrawlGraph(options: {
  state: CrawlState;
  startUrl: string;
  origin: string;
  name?: CrawlOptions['name'];
  maxPages: number;
}): NavMapGraph {
  return {
    version: '1.0',
    meta: {
      name: options.name || new URL(options.startUrl).hostname,
      baseUrl: options.origin,
      generatedAt: new Date().toISOString(),
      generatedBy: 'url-crawl',
      diagnostics: {
        crawl: {
          attemptedPages: options.state.visited.size,
          successfulPages: options.state.nodesMap.size,
          failedPages: options.state.failedPages,
          screenshotFailures: options.state.screenshotFailures,
          maxPagesReached:
            options.state.queue.length > 0 && options.state.visited.size >= options.maxPages,
        },
      },
    },
    nodes: Array.from(options.state.nodesMap.values()),
    edges: Array.from(options.state.edgesMap.values()),
    groups: Array.from(options.state.groupsSet.values()),
  };
}
