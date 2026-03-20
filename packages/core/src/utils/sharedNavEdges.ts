import type { Edge } from '@xyflow/react';
import type { NavMapGraph } from '../types';

export function buildSharedNavEdges(graph: NavMapGraph): Edge[] {
  if (!graph.sharedNav) return [];
  const existingEdges = new Set(graph.edges.map(e => `${e.source}->${e.target}`));
  const allTargets = [
    ...new Set([...graph.sharedNav.navbar.targets, ...graph.sharedNav.footer.targets]),
  ];
  const allPages = [...new Set([...graph.sharedNav.navbar.pages, ...graph.sharedNav.footer.pages])];

  const edges: Edge[] = [];
  for (const src of allPages) {
    for (const tgt of allTargets) {
      if (src === tgt) continue;
      if (existingEdges.has(`${src}->${tgt}`)) continue;
      edges.push({
        id: `shared-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: 'navEdge',
        data: { label: 'shared nav', edgeType: 'shared-nav' },
      });
    }
  }
  return edges;
}
