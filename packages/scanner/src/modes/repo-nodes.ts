import { detectGroupsFromRoutes } from './shared-nav.js';
import type { NavMapGraph, RepoRoute } from './repo-types.js';

export function buildNodesAndGroups(routeMap: Map<string, RepoRoute>): {
  nodes: NavMapGraph['nodes'];
  groups: NavMapGraph['groups'];
} {
  const routes = Array.from(routeMap.values());
  const groups = detectGroupsFromRoutes(routes.map(r => ({ id: r.id, route: r.route })));

  const nodes: NavMapGraph['nodes'] = routes.map(r => {
    const group =
      groups.find(
        g => g.routePrefix && g.routePrefix !== '/' && r.route.startsWith(g.routePrefix)
      ) ??
      groups.find(g => g.id === 'root') ??
      groups[0];

    return {
      id: r.id,
      route: r.route,
      label: r.label,
      group: group?.id ?? 'other',
      filePath: r.filePath,
    };
  });

  return { nodes, groups };
}
