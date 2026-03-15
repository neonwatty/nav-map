import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 140;
const COMPACT_NODE_WIDTH = 120;
const COMPACT_NODE_HEIGHT = 50;

export interface LayoutOptions {
  direction?: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';
  spacing?: number;
  nodeSpacing?: number;
}

export async function computeElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Promise<Node[]> {
  const {
    direction = 'DOWN',
    spacing = 80,
    nodeSpacing = 50,
  } = options;

  const elkNodes: ElkNode[] = nodes.map(node => {
    const isCompact = node.type === 'compactNode';
    return {
      id: node.id,
      width: isCompact ? COMPACT_NODE_WIDTH : DEFAULT_NODE_WIDTH,
      height: isCompact ? COMPACT_NODE_HEIGHT : DEFAULT_NODE_HEIGHT,
    };
  });

  const elkEdges: ElkExtendedEdge[] = edges.map(edge => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing),
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: elkNodes,
    edges: elkEdges,
  });

  const positionMap = new Map<string, { x: number; y: number }>();
  for (const child of graph.children ?? []) {
    positionMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  return nodes.map(node => ({
    ...node,
    position: positionMap.get(node.id) ?? node.position,
  }));
}
