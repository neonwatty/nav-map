import { chromium } from 'playwright';

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
}

function normalizeUrl(raw: string): string {
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

function pathToId(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'index';
  return pathname
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-');
}

function groupFromPath(pathname: string): string {
  const segments = pathname.replace(/^\//, '').split('/');
  if (!segments[0] || segments[0] === '') return 'root';
  return segments[0];
}

export async function crawlUrl(options: CrawlOptions): Promise<NavMapGraph> {
  const { startUrl, name, screenshotDir, maxPages = 50 } = options;

  const origin = new URL(startUrl).origin;

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

      // Discover links (runs in browser context)
      const links: { href: string; text: string }[] = await page.evaluate(
        `
        Array.from(document.querySelectorAll('a[href]')).map(a => ({
          href: a.href,
          text: (a.textContent || '').trim(),
        }))
      ` as unknown as string
      );

      for (const link of links) {
        let linkUrl: URL;
        try {
          linkUrl = new URL(link.href, currentUrl);
        } catch {
          continue;
        }

        // Same-origin only
        if (linkUrl.origin !== origin) continue;

        const normalized = normalizeUrl(linkUrl.toString());
        const targetPathname = new URL(normalized).pathname;
        const targetId = pathToId(targetPathname);
        const edgeId = `${nodeId}->${targetId}`;

        if (!edgesMap.has(edgeId) && nodeId !== targetId) {
          edgesMap.set(edgeId, {
            id: edgeId,
            source: nodeId,
            target: targetId,
            label: link.text || undefined,
            type: 'link',
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
