import type { NavMapNode, NavMapGroup } from '../types';

/**
 * Auto-detect groups from route prefixes when groups aren't provided.
 * Groups nodes by their first path segment (e.g., "/blog/[slug]" → "blog").
 * Only creates a group if there are ≥2 nodes with the same prefix.
 */
export function detectGroups(nodes: NavMapNode[]): NavMapGroup[] {
  const prefixCounts = new Map<string, NavMapNode[]>();

  for (const node of nodes) {
    const segments = node.route.split('/').filter(Boolean);
    const prefix = segments[0] ?? 'root';
    const existing = prefixCounts.get(prefix) ?? [];
    existing.push(node);
    prefixCounts.set(prefix, existing);
  }

  const groups: NavMapGroup[] = [];
  for (const [prefix, groupNodes] of prefixCounts) {
    if (groupNodes.length >= 2) {
      groups.push({
        id: prefix,
        label: prefix.charAt(0).toUpperCase() + prefix.slice(1),
        routePrefix: `/${prefix}`,
      });
    }
  }

  return groups;
}

/**
 * Assign group IDs to nodes based on existing group definitions.
 * If a node doesn't have a group, try to match by route prefix.
 */
export function assignGroups(nodes: NavMapNode[], groups: NavMapGroup[]): NavMapNode[] {
  return nodes.map(node => {
    if (node.group) return node;

    const matchingGroup = groups.find(
      g => g.routePrefix && node.route.startsWith(g.routePrefix) && g.routePrefix !== '/'
    );

    return matchingGroup ? { ...node, group: matchingGroup.id } : node;
  });
}
