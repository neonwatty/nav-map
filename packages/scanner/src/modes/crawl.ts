import { chromium } from 'playwright';
import fs from 'node:fs';
import { buildCrawlGraph, createCrawlState } from './crawl-graph.js';
import { processCrawlPage } from './crawl-page.js';
import type { CrawlOptions, NavMapGraph } from './crawl-types.js';
import { normalizeUrl } from './crawl-url-utils.js';

export type {
  CrawlDiagnostics,
  CrawlFailure,
  CrawlOptions,
  DiscoveredNavigation,
  ScreenshotFailure,
} from './crawl-types.js';
export {
  createEdgeId,
  groupFromPath,
  normalizeUrl,
  pathToId,
  resolveDiscoveredNavigations,
  shouldCrawlUrl,
} from './crawl-url-utils.js';

export async function crawlUrl(options: CrawlOptions): Promise<NavMapGraph> {
  const {
    startUrl,
    name,
    screenshotDir,
    maxPages = 50,
    interactions = true,
    maxInteractionsPerPage = 20,
    includeInteraction = [],
    excludeInteraction = [],
  } = options;

  const origin = new URL(startUrl).origin;
  if (screenshotDir && !fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const state = createCrawlState(normalizeUrl(startUrl));
  const browser = options.context ? null : await chromium.launch({ headless: true });
  const context = options.context ?? (await browser!.newContext());

  try {
    while (state.queue.length > 0 && state.visited.size < maxPages) {
      const currentUrl = state.queue.shift()!;
      if (state.visited.has(currentUrl)) continue;
      state.visited.add(currentUrl);

      await processCrawlPage({
        context,
        currentUrl,
        origin,
        state,
        screenshotDir,
        interactions,
        maxInteractionsPerPage,
        includeInteraction,
        excludeInteraction,
      });
    }
  } finally {
    if (browser) await browser.close();
  }

  return buildCrawlGraph({ state, startUrl, origin, name, maxPages });
}
