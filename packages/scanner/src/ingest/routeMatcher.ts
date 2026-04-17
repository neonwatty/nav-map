export type RouteMatchResult = { matched: true; nodeId: string } | { matched: false; nodeId: null };

interface NodeLike {
  id: string;
  route: string;
}

function normalize(route: string): string {
  let r = route.toLowerCase();
  if (r.length > 1 && r.endsWith('/')) {
    r = r.slice(0, -1);
  }
  return r;
}

function routeToRegex(routePattern: string): RegExp | null {
  const escaped = routePattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\[\\*\\\]/g, '.*')
    .replace(/\\\[[^\]]+\\\]/g, '[^/]+');
  try {
    return new RegExp(`^${escaped}$`, 'i');
  } catch {
    return null;
  }
}

export function matchRoute(route: string, nodes: NodeLike[]): RouteMatchResult {
  const normalizedRoute = normalize(route);

  // Pass 1: exact match
  for (const node of nodes) {
    if (normalize(node.route) === normalizedRoute) {
      return { matched: true, nodeId: node.id };
    }
  }

  // Pass 2: pattern match (dynamic routes with [param])
  for (const node of nodes) {
    if (!node.route.includes('[')) continue;
    const regex = routeToRegex(normalize(node.route));
    if (!regex) continue;
    if (regex.test(normalizedRoute)) {
      return { matched: true, nodeId: node.id };
    }
  }

  return { matched: false, nodeId: null };
}
