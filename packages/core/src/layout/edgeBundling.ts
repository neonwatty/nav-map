import { hierarchy, cluster } from 'd3-hierarchy';
import { lineRadial, curveBundle } from 'd3-shape';
import type { Node, Edge } from '@xyflow/react';

interface BundleResult {
  edgeId: string;
  path: string;
  source: string;
  target: string;
}

export function computeBundledEdges(
  nodes: Node[],
  edges: Edge[],
  options: { beta?: number } = {}
): BundleResult[] {
  const { beta = 0.85 } = options;

  const pageNodes = nodes.filter(n => n.type !== 'groupNode');
  const groups = new Set(pageNodes.map(n => (n.data as { group?: string }).group).filter(Boolean));

  const hierarchyData = {
    id: 'root',
    children: [...groups].map(groupId => ({
      id: `group-${groupId}`,
      children: pageNodes
        .filter(n => (n.data as { group?: string }).group === groupId)
        .map(n => ({ id: n.id })),
    })),
  };

  const ungrouped = pageNodes.filter(n => !(n.data as { group?: string }).group);
  if (ungrouped.length > 0) {
    hierarchyData.children.push({
      id: 'group-ungrouped',
      children: ungrouped.map(n => ({ id: n.id })),
    });
  }

  const root = hierarchy(hierarchyData);
  const radius = 350;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cluster<typeof hierarchyData>().size([2 * Math.PI, radius])(root as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeHierarchyMap = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root.each((d: any) => {
    nodeHierarchyMap.set(d.data.id, d);
  });

  const line = lineRadial<{ angle: number; radius: number }>()
    .angle(d => d.angle)
    .radius(d => d.radius)
    .curve(curveBundle.beta(beta));

  const results: BundleResult[] = [];

  for (const edge of edges) {
    const sourceNode = nodeHierarchyMap.get(edge.source);
    const targetNode = nodeHierarchyMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pathNodes: any[] = sourceNode.path(targetNode);
    const pathPoints = pathNodes.map((d: { x: number; y: number }) => ({
      angle: d.x,
      radius: d.y,
    }));

    const svgPath = line(pathPoints);
    if (svgPath) {
      results.push({
        edgeId: edge.id,
        path: svgPath,
        source: edge.source,
        target: edge.target,
      });
    }
  }

  return results;
}
