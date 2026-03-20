import type { Node, Edge } from '@xyflow/react';

const PAGE_NODE_WIDTH = 180;
const PAGE_NODE_HEIGHT = 140;
const COMPACT_NODE_WIDTH = 120;
const COMPACT_NODE_HEIGHT = 50;

export interface BundleResult {
  edgeId: string;
  path: string;
}

/**
 * Cartesian corridor-based edge bundling.
 * Edges between the same group pair curve toward a shared corridor centroid.
 * Intra-group edges curve toward the group center.
 */
export function computeBundledEdges(
  nodes: Node[],
  edges: Edge[],
  options: { beta?: number } = {}
): BundleResult[] {
  const { beta = 0.65 } = options;

  // Resolve absolute positions for all non-group nodes
  const positionMap = new Map<string, { x: number; y: number }>();
  const parentPositions = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    if (node.type === 'groupNode') {
      parentPositions.set(node.id, node.position);
    }
  }

  for (const node of nodes) {
    if (node.type === 'groupNode') continue;
    const isCompact = node.type === 'compactNode';
    const w = isCompact ? COMPACT_NODE_WIDTH : PAGE_NODE_WIDTH;
    const h = isCompact ? COMPACT_NODE_HEIGHT : PAGE_NODE_HEIGHT;
    let x = node.position.x + w / 2;
    let y = node.position.y + h / 2;
    if (node.parentId) {
      const parent = parentPositions.get(node.parentId);
      if (parent) {
        x += parent.x;
        y += parent.y;
      }
    }
    positionMap.set(node.id, { x, y });
  }

  // Build corridor map: group edges by their group pair
  const corridorEdges = new Map<
    string,
    Array<{ edge: Edge; src: { x: number; y: number }; tgt: { x: number; y: number } }>
  >();

  for (const edge of edges) {
    const src = positionMap.get(edge.source);
    const tgt = positionMap.get(edge.target);
    if (!src || !tgt) continue;

    const srcGroup =
      ((nodes.find(n => n.id === edge.source)?.data as Record<string, unknown>)?.group as string) ??
      '';
    const tgtGroup =
      ((nodes.find(n => n.id === edge.target)?.data as Record<string, unknown>)?.group as string) ??
      '';
    const key = [srcGroup, tgtGroup].sort().join(':');

    const bucket = corridorEdges.get(key) ?? [];
    bucket.push({ edge, src, tgt });
    corridorEdges.set(key, bucket);
  }

  // Compute corridor centroids
  const corridorCentroids = new Map<string, { x: number; y: number }>();
  for (const [key, members] of corridorEdges) {
    let cx = 0;
    let cy = 0;
    for (const { src, tgt } of members) {
      cx += (src.x + tgt.x) / 2;
      cy += (src.y + tgt.y) / 2;
    }
    cx /= members.length;
    cy /= members.length;
    corridorCentroids.set(key, { x: cx, y: cy });
  }

  // Generate cubic bezier paths
  const results: BundleResult[] = [];

  for (const [key, members] of corridorEdges) {
    const centroid = corridorCentroids.get(key)!;
    const pullStrength = members.length === 1 ? beta * 0.3 : beta;

    for (const { edge, src, tgt } of members) {
      const cp1x = src.x + (centroid.x - src.x) * pullStrength;
      const cp1y = src.y + (centroid.y - src.y) * pullStrength;
      const cp2x = tgt.x + (centroid.x - tgt.x) * pullStrength;
      const cp2y = tgt.y + (centroid.y - tgt.y) * pullStrength;

      const path = `M ${src.x} ${src.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tgt.x} ${tgt.y}`;
      results.push({ edgeId: edge.id, path });
    }
  }

  return results;
}
