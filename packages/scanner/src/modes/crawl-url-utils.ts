import type { DiscoveredNavigation, NavMapGraph } from './crawl-types.js';

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
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
