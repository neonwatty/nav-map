import type { BrowserContext } from 'playwright';
import { discoverInteractiveNavigations } from './crawl-interactions.js';
import type { CrawlOptions, CrawlState, DiscoveredNavigation } from './crawl-types.js';
import { groupFromPath, pathToId, resolveDiscoveredNavigations } from './crawl-url-utils.js';

export async function processCrawlPage(options: {
  context: BrowserContext;
  currentUrl: string;
  origin: string;
  state: CrawlState;
  screenshotDir?: string;
  interactions: boolean;
  maxInteractionsPerPage: number;
  includeInteraction: NonNullable<CrawlOptions['includeInteraction']>;
  excludeInteraction: NonNullable<CrawlOptions['excludeInteraction']>;
}): Promise<void> {
  const page = await options.context.newPage();
  try {
    try {
      await page.goto(options.currentUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    } catch (error) {
      options.state.failedPages.push({ url: options.currentUrl, reason: errorMessage(error) });
      return;
    }

    const pageTitle = await page.title();
    const pathname = new URL(options.currentUrl).pathname;
    const nodeId = pathToId(pathname);
    const groupId = groupFromPath(pathname);
    const screenshotPath = await captureScreenshot({
      page,
      screenshotDir: options.screenshotDir,
      nodeId,
      currentUrl: options.currentUrl,
      state: options.state,
    });

    addNode(options.state, nodeId, pathname, pageTitle, groupId, screenshotPath);
    addGroup(options.state, groupId);

    const navigations = await collectNavigations({
      page,
      currentUrl: options.currentUrl,
      interactions: options.interactions,
      maxInteractionsPerPage: options.maxInteractionsPerPage,
      includeInteraction: options.includeInteraction,
      excludeInteraction: options.excludeInteraction,
    });

    enqueueDiscoveredNavigations({
      sourceId: nodeId,
      currentUrl: options.currentUrl,
      origin: options.origin,
      navigations,
      state: options.state,
    });
  } finally {
    await page.close();
  }
}

async function captureScreenshot(options: {
  page: Awaited<ReturnType<BrowserContext['newPage']>>;
  screenshotDir?: string;
  nodeId: string;
  currentUrl: string;
  state: CrawlState;
}): Promise<string | undefined> {
  if (!options.screenshotDir) return undefined;

  const filename = options.nodeId === 'index' ? 'index.png' : `${options.nodeId}.png`;
  const screenshotPath = `${options.screenshotDir}/${filename}`;
  try {
    await options.page.screenshot({ path: screenshotPath, fullPage: false });
    return screenshotPath;
  } catch (error) {
    options.state.screenshotFailures.push({
      url: options.currentUrl,
      path: screenshotPath,
      reason: errorMessage(error),
    });
    return undefined;
  }
}

function addNode(
  state: CrawlState,
  nodeId: string,
  pathname: string,
  pageTitle: string,
  groupId: string,
  screenshotPath: string | undefined
): void {
  if (state.nodesMap.has(nodeId)) return;
  state.nodesMap.set(nodeId, {
    id: nodeId,
    route: pathname,
    label: pageTitle || pathname,
    group: groupId,
    ...(screenshotPath ? { screenshot: screenshotPath } : {}),
  });
}

function addGroup(state: CrawlState, groupId: string): void {
  if (state.groupsSet.has(groupId)) return;
  state.groupsSet.set(groupId, {
    id: groupId,
    label: groupId.charAt(0).toUpperCase() + groupId.slice(1),
    routePrefix: groupId === 'root' ? '/' : `/${groupId}`,
  });
}

async function collectNavigations(options: {
  page: Awaited<ReturnType<BrowserContext['newPage']>>;
  currentUrl: string;
  interactions: boolean;
  maxInteractionsPerPage: number;
  includeInteraction: string[];
  excludeInteraction: string[];
}): Promise<DiscoveredNavigation[]> {
  const links: DiscoveredNavigation[] = await options.page.evaluate(
    `
        Array.from(document.querySelectorAll('a[href]')).map(a => ({
          href: a.href,
          text: (a.textContent || '').trim(),
          discovery: 'static-link',
        }))
      ` as unknown as string
  );

  if (!options.interactions) return links;
  return [
    ...links,
    ...(await discoverInteractiveNavigations(
      options.page,
      options.currentUrl,
      options.maxInteractionsPerPage,
      { include: options.includeInteraction, exclude: options.excludeInteraction }
    )),
  ];
}

function enqueueDiscoveredNavigations(options: {
  sourceId: string;
  currentUrl: string;
  origin: string;
  navigations: DiscoveredNavigation[];
  state: CrawlState;
}): void {
  for (const { normalizedUrl, edge } of resolveDiscoveredNavigations(
    options.sourceId,
    options.currentUrl,
    options.origin,
    options.navigations
  )) {
    if (!options.state.edgesMap.has(edge.id)) options.state.edgesMap.set(edge.id, edge);
    if (!options.state.visited.has(normalizedUrl) && !options.state.queue.includes(normalizedUrl)) {
      options.state.queue.push(normalizedUrl);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
