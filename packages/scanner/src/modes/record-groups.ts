import type { PageRecord } from './dedup.js';
import type { NavMapGraph } from './record-types.js';

const GROUP_COLORS = ['#5b9bf5', '#4eca6a', '#b07ce8', '#f0a050', '#6e8ca8', '#556878'];

export function buildGroups(pages: Iterable<PageRecord>): NavMapGraph['groups'] {
  const groupMap = new Map<string, Set<string>>();
  for (const page of pages) {
    const existing = groupMap.get(page.group) ?? new Set();
    existing.add(page.id);
    groupMap.set(page.group, existing);
  }

  return [...groupMap.entries()]
    .filter(([, members]) => members.size > 0)
    .map(([id], i) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: GROUP_COLORS[i % GROUP_COLORS.length],
      routePrefix: id === 'root' ? '/' : `/${id}`,
    }));
}
