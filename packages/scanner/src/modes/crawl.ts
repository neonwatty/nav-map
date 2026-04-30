import { chromium } from 'playwright';
import fs from 'node:fs';
import { discoverInteractiveNavigations } from './crawl-interactions.js';

interface NavMapGraph {
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

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    // Remove hash
    url.hash = '';
    // Remove trailing slash (but keep root "/")
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;
    return url.toString();
  } catch {
    return raw;
  }
}

export function pathToId(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'index';
  return pathname
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-');
}

export function groupFromPath(pathname: string): string {
  const segments = pathname.replace(/^\//, '').split('/');
  if (!segments[0] || segments[0] === '') return 'root';
  return segments[0];
}

export function createEdgeId(sourceId: string, targetId: string, discovery: string): string {
  return `${sourceId}->${targetId}:${discovery}`;
}

export function shouldCrawlUrl(rawUrl: string, origin: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.origin === origin && ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function resolveDiscoveredNavigations(
  sourceId: string,
  currentUrl: string,
  origin: string,
  navigations: DiscoveredNavigation[]
): { normalizedUrl: string; edge: NavMapGraph['edges'][number] }[] {
  const results: { normalizedUrl: string; edge: NavMapGraph['edges'][number] }[] = [];

  for (const navigation of navigations) {
    let linkUrl: URL;
    try {
      linkUrl = new URL(navigation.href, currentUrl);
    } catch {
      continue;
    }

    if (!shouldCrawlUrl(linkUrl.toString(), origin)) continue;

    const normalizedUrl = normalizeUrl(linkUrl.toString());
    const targetPathname = new URL(normalizedUrl).pathname;
    const targetId = pathToId(targetPathname);
    if (sourceId === targetId) continue;

    results.push({
      normalizedUrl,
      edge: {
        id: createEdgeId(sourceId, targetId, navigation.discovery),
        source: sourceId,
        target: targetId,
        label: navigation.text || undefined,
        type: navigation.discovery === 'observed-interaction' ? 'router-push' : 'link',
        discovery: navigation.discovery,
      },
    });
  }

  return results;
}

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

  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(startUrl)];

  const nodesMap = new Map<string, NavMapGraph['nodes'][number]>();
  const edgesMap = new Map<string, NavMapGraph['edges'][number]>();
  const groupsSet = new Map<string, NavMapGraph['groups'][number]>();
  const failedPages: CrawlFailure[] = [];
  const screenshotFailures: ScreenshotFailure[] = [];

  const externalContext = options.context;
  const browser = externalContext ? null : await chromium.launch({ headless: true });
  const context = externalContext ?? (await browser!.newContext());

  try {
    while (queue.length > 0 && visited.size < maxPages) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      const page = await context.newPage();
      try {
        await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      } catch (error) {
        failedPages.push({ url: currentUrl, reason: errorMessage(error) });
        await page.close();
        continue;
      }

      const pageTitle = await page.title();
      const currentParsed = new URL(currentUrl);
      const pathname = currentParsed.pathname;
      const nodeId = pathToId(pathname);
      const groupId = groupFromPath(pathname);

      let screenshotPath: string | undefined;
      if (screenshotDir) {
        const filename = nodeId === 'index' ? 'index.png' : `${nodeId}.png`;
        screenshotPath = `${screenshotDir}/${filename}`;
        try {
          await page.screenshot({ path: screenshotPath, fullPage: false });
        } catch (error) {
          screenshotFailures.push({
            url: currentUrl,
            path: screenshotPath,
            reason: errorMessage(error),
          });
          screenshotPath = undefined;
        }
      }

      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          route: pathname,
          label: pageTitle || pathname,
          group: groupId,
          ...(screenshotPath ? { screenshot: screenshotPath } : {}),
        });
      }

      if (!groupsSet.has(groupId)) {
        groupsSet.set(groupId, {
          id: groupId,
          label: groupId.charAt(0).toUpperCase() + groupId.slice(1),
          routePrefix: groupId === 'root' ? '/' : `/${groupId}`,
        });
      }

      const links: DiscoveredNavigation[] = await page.evaluate(
        `
        Array.from(document.querySelectorAll('a[href]')).map(a => ({
          href: a.href,
          text: (a.textContent || '').trim(),
          discovery: 'static-link',
        }))
      ` as unknown as string
      );

      const navigations = [...links];

      if (interactions) {
        navigations.push(
          ...(await discoverInteractiveNavigations(page, currentUrl, maxInteractionsPerPage, {
            include: includeInteraction,
            exclude: excludeInteraction,
          }))
        );
      }

      for (const { normalizedUrl, edge } of resolveDiscoveredNavigations(
        nodeId,
        currentUrl,
        origin,
        navigations
      )) {
        if (!edgesMap.has(edge.id)) {
          edgesMap.set(edge.id, edge);
        }

        if (!visited.has(normalizedUrl) && !queue.includes(normalizedUrl)) {
          queue.push(normalizedUrl);
        }
      }

      await page.close();
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const graph: NavMapGraph = {
    version: '1.0',
    meta: {
      name: name || new URL(startUrl).hostname,
      baseUrl: origin,
      generatedAt: new Date().toISOString(),
      generatedBy: 'url-crawl',
      diagnostics: {
        crawl: {
          attemptedPages: visited.size,
          successfulPages: nodesMap.size,
          failedPages,
          screenshotFailures,
          maxPagesReached: queue.length > 0 && visited.size >= maxPages,
        },
      },
    },
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    groups: Array.from(groupsSet.values()),
  };

  return graph;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
