import fs from 'node:fs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;
const OPAQUE_HASH_RE = /^[a-z0-9]{20,}$/i;

export interface RoutePattern {
  route: string;
  id: string;
  group: string;
  label: string;
}

export interface PageRecord {
  id: string;
  route: string;
  label: string;
  group: string;
  screenshot?: string;
  metadata?: Record<string, unknown>;
}

export interface EdgeRecord {
  source: string;
  target: string;
  label?: string;
  type: 'link' | 'redirect' | 'router-push' | 'shared-nav';
  visitCount: number;
}

/**
 * Normalize a URL pathname by collapsing dynamic segments.
 * Uses static route patterns if provided, otherwise heuristic detection.
 */
export function normalizeRoute(
  pathname: string,
  routePatterns?: RoutePattern[]
): { route: string; id: string; label: string; group: string } | null {
  let clean = pathname.replace(/\/$/, '') || '/';
  clean = clean.split('?')[0].split('#')[0];

  if (routePatterns) {
    const match = matchRoutePattern(clean, routePatterns);
    if (match) return match;
  }

  const segments = clean.split('/');
  const normalized = segments.map(seg => {
    if (!seg) return seg;
    if (UUID_RE.test(seg)) return '[id]';
    if (NUMERIC_RE.test(seg)) return '[id]';
    if (OPAQUE_HASH_RE.test(seg)) return '[id]';
    return seg;
  });

  const route = normalized.join('/') || '/';
  const id = routeToId(route);
  const label = routeToLabel(route);
  const group = segments[1] || 'root';

  return { route, id, label, group };
}

function matchRoutePattern(pathname: string, patterns: RoutePattern[]): RoutePattern | null {
  const segments = pathname.split('/');

  for (const pattern of patterns) {
    const patternSegments = pattern.route.split('/');
    if (segments.length !== patternSegments.length) continue;

    let matches = true;
    for (let i = 0; i < segments.length; i++) {
      const ps = patternSegments[i];
      const us = segments[i];
      if (ps.startsWith('[') && ps.endsWith(']')) continue;
      if (ps !== us) {
        matches = false;
        break;
      }
    }

    if (matches) return pattern;
  }

  return null;
}

function routeToId(route: string): string {
  if (route === '/') return 'home';
  return route
    .slice(1)
    .replace(/\//g, '-')
    .replace(/\[(\w+)\]/g, '$1')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '');
}

function routeToLabel(route: string): string {
  if (route === '/') return 'Home';
  const lastSegment = route.split('/').filter(Boolean).pop() ?? '';
  return lastSegment
    .replace(/\[(\w+)\]/g, '$1')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function isLoginPage(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return (
      pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/signin')
    );
  } catch {
    return false;
  }
}

export function loadRoutePatterns(routesJsonPath: string): RoutePattern[] {
  const data = JSON.parse(fs.readFileSync(routesJsonPath, 'utf-8'));
  return (data.nodes ?? []).map(
    (n: { id: string; route: string; group: string; label: string }) => ({
      id: n.id,
      route: n.route,
      group: n.group,
      label: n.label,
    })
  );
}
