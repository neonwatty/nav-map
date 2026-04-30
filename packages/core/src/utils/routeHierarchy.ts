import type { NavMapNode } from '../types';

interface HierarchyEdge {
  parentId: string;
  childId: string;
}

/**
 * Infer parent→child relationships from route paths.
 *
 * `/` is the root. `/blog` is a child of `/`. `/blog/[slug]` is a child of `/blog`.
 * If a direct parent route doesn't exist in the node set, walk up the path
 * until we find the nearest ancestor that does exist.
 */
export function buildRouteHierarchy(nodes: NavMapNode[]): HierarchyEdge[] {
  const routeToId = new Map<string, string>();
  for (const node of nodes) {
    routeToId.set(node.route, node.id);
  }

  const edges: HierarchyEdge[] = [];

  for (const node of nodes) {
    if (node.route === '/') continue; // root has no parent

    // Walk up the route path to find the nearest ancestor
    const segments = node.route.split('/').filter(Boolean);
    let found = false;

    for (let i = segments.length - 1; i >= 1; i--) {
      const parentRoute = '/' + segments.slice(0, i).join('/');
      const parentId = routeToId.get(parentRoute);
      if (parentId) {
        edges.push({ parentId, childId: node.id });
        found = true;
        break;
      }
    }

    // If no intermediate ancestor found, attach to root
    if (!found) {
      const rootId = routeToId.get('/');
      if (rootId && rootId !== node.id) {
        edges.push({ parentId: rootId, childId: node.id });
      }
    }
  }

  return edges;
}
