import { chromium } from 'playwright';
import fs from 'node:fs';

interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual';
    framework?: string;
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

export interface CrawlOptions {
  startUrl: string;
  name?: string;
  screenshotDir?: string;
  maxPages?: number;
  context?: import('playwright').BrowserContext;
  interactions?: boolean;
  maxInteractionsPerPage?: number;
}

interface DiscoveredNavigation {
  href: string;
  text: string;
  discovery: 'static-link' | 'observed-interaction';
}

interface InteractiveCandidate {
  id: string;
  text: string;
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

export async function crawlUrl(options: CrawlOptions): Promise<NavMapGraph> {
  const {
    startUrl,
    name,
    screenshotDir,
    maxPages = 50,
    interactions = true,
    maxInteractionsPerPage = 20,
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
      } catch {
        await page.close();
        continue;
      }

      const pageTitle = await page.title();
      const currentParsed = new URL(currentUrl);
      const pathname = currentParsed.pathname;
      const nodeId = pathToId(pathname);
      const groupId = groupFromPath(pathname);

      // Take screenshot if screenshotDir provided
      let screenshotPath: string | undefined;
      if (screenshotDir) {
        const filename = nodeId === 'index' ? 'index.png' : `${nodeId}.png`;
        screenshotPath = `${screenshotDir}/${filename}`;
        try {
          await page.screenshot({ path: screenshotPath, fullPage: false });
        } catch {
          screenshotPath = undefined;
        }
      }

      // Add node
      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          route: pathname,
          label: pageTitle || pathname,
          group: groupId,
          ...(screenshotPath ? { screenshot: screenshotPath } : {}),
        });
      }

      // Add group
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
          ...(await discoverInteractiveNavigations(page, currentUrl, maxInteractionsPerPage))
        );
      }

      for (const link of navigations) {
        let linkUrl: URL;
        try {
          linkUrl = new URL(link.href, currentUrl);
        } catch {
          continue;
        }

        // Same-origin only
        if (!shouldCrawlUrl(linkUrl.toString(), origin)) continue;

        const normalized = normalizeUrl(linkUrl.toString());
        const targetPathname = new URL(normalized).pathname;
        const targetId = pathToId(targetPathname);
        const edgeId = createEdgeId(nodeId, targetId, link.discovery);

        if (!edgesMap.has(edgeId) && nodeId !== targetId) {
          edgesMap.set(edgeId, {
            id: edgeId,
            source: nodeId,
            target: targetId,
            label: link.text || undefined,
            type: link.discovery === 'observed-interaction' ? 'router-push' : 'link',
            discovery: link.discovery,
          });
        }

        // Enqueue unseen URLs
        if (!visited.has(normalized) && !queue.includes(normalized)) {
          queue.push(normalized);
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
    },
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    groups: Array.from(groupsSet.values()),
  };

  return graph;
}

async function discoverInteractiveNavigations(
  page: import('playwright').Page,
  currentUrl: string,
  maxInteractions: number
): Promise<DiscoveredNavigation[]> {
  const results: DiscoveredNavigation[] = [];

  for (let index = 0; index < maxInteractions; index++) {
    const candidates = await markInteractiveCandidates(page);
    const candidate = candidates[index];
    if (!candidate) break;

    try {
      await page.locator(`[data-nav-map-candidate="${candidate.id}"]`).click({ timeout: 1_000 });
      await page.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(150);

      const nextUrl = normalizeUrl(page.url());
      if (nextUrl !== normalizeUrl(currentUrl)) {
        results.push({
          href: nextUrl,
          text: candidate.text,
          discovery: 'observed-interaction',
        });
        await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      }
    } catch {
      if (normalizeUrl(page.url()) !== normalizeUrl(currentUrl)) {
        await page
          .goto(currentUrl, { waitUntil: 'networkidle', timeout: 30_000 })
          .catch(() => undefined);
      }
    }
  }

  return results;
}

async function markInteractiveCandidates(
  page: import('playwright').Page
): Promise<InteractiveCandidate[]> {
  return page.evaluate(`() => {
    const selector = [
      'button',
      '[role="button"]',
      '[role="link"]',
      '[data-href]',
      '[data-url]',
      '[onclick]',
    ].join(',');

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element, index) => {
        if (element.closest('a[href]')) return false;
        if (element.hasAttribute('disabled')) return false;
        if (element.getAttribute('aria-disabled') === 'true') return false;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        element.dataset.navMapCandidate = String(index);
        return true;
      })
      .map(element => ({
        id: element.dataset.navMapCandidate ?? '',
        text:
          element.getAttribute('aria-label') ??
          element.getAttribute('title') ??
          element.textContent?.trim() ??
          '',
      }));
  }`) as Promise<InteractiveCandidate[]>;
}
