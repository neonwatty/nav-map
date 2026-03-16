import ELK, {
  type ElkNode,
  type ElkExtendedEdge,
} from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 140;
const COMPACT_NODE_WIDTH = 120;
const COMPACT_NODE_HEIGHT = 50;
const GROUP_PADDING_TOP = 40;
const GROUP_PADDING = 20;

export interface LayoutOptions {
  direction?: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';
  spacing?: number;
  nodeSpacing?: number;
}

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export async function computeElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Promise<LayoutResult> {
  const {
    direction = 'DOWN',
    spacing = 80,
    nodeSpacing = 50,
  } = options;

  // Separate group nodes from page nodes
  const groupNodes = nodes.filter(n => n.type === 'groupNode');
  const pageNodes = nodes.filter(n => n.type !== 'groupNode');

  // Build group ID → child ELK nodes map
  const groupChildren = new Map<string, ElkNode[]>();
  const ungroupedNodes: ElkNode[] = [];

  for (const node of pageNodes) {
    const parentGroupId = node.parentId;
    const isCompact = node.type === 'compactNode';
    const elkNode: ElkNode = {
      id: node.id,
      width: isCompact ? COMPACT_NODE_WIDTH : DEFAULT_NODE_WIDTH,
      height: isCompact ? COMPACT_NODE_HEIGHT : DEFAULT_NODE_HEIGHT,
    };

    if (parentGroupId) {
      const children = groupChildren.get(parentGroupId) ?? [];
      children.push(elkNode);
      groupChildren.set(parentGroupId, children);
    } else {
      ungroupedNodes.push(elkNode);
    }
  }

  // Build ELK group container nodes
  const elkGroupNodes: ElkNode[] = groupNodes
    .filter(g => (groupChildren.get(g.id)?.length ?? 0) > 0)
    .map(g => ({
      id: g.id,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': String(nodeSpacing),
        'elk.padding': `[top=${GROUP_PADDING_TOP},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
      },
      children: groupChildren.get(g.id) ?? [],
    }));

  // Split edges: intra-group edges go inside their group, cross-group at root
  const nodeToGroup = new Map<string, string>();
  for (const node of pageNodes) {
    if (node.parentId) nodeToGroup.set(node.id, node.parentId);
  }

  const rootEdges: ElkExtendedEdge[] = [];
  const groupEdgesMap = new Map<string, ElkExtendedEdge[]>();

  for (const edge of edges) {
    const srcGroup = nodeToGroup.get(edge.source);
    const tgtGroup = nodeToGroup.get(edge.target);
    const elkEdge: ElkExtendedEdge = {
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    };

    if (srcGroup && tgtGroup && srcGroup === tgtGroup) {
      const existing = groupEdgesMap.get(srcGroup) ?? [];
      existing.push(elkEdge);
      groupEdgesMap.set(srcGroup, existing);
    } else {
      rootEdges.push(elkEdge);
    }
  }

  // Attach intra-group edges to their group ELK nodes
  for (const groupNode of elkGroupNodes) {
    const ge = groupEdgesMap.get(groupNode.id);
    if (ge) groupNode.edges = ge;
  }

  // Run layout
  const graph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.spacing.edgeEdge': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing),
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: [...elkGroupNodes, ...ungroupedNodes],
    edges: rootEdges,
  });

  // Recursively extract positions from ELK output
  const positionMap = new Map<string, { x: number; y: number }>();
  const sizeMap = new Map<string, { width: number; height: number }>();

  function extractPositions(elkNode: ElkNode) {
    positionMap.set(elkNode.id, { x: elkNode.x ?? 0, y: elkNode.y ?? 0 });
    if (elkNode.width && elkNode.height) {
      sizeMap.set(elkNode.id, { width: elkNode.width, height: elkNode.height });
    }
    for (const child of elkNode.children ?? []) {
      extractPositions(child);
    }
  }
  for (const child of graph.children ?? []) {
    extractPositions(child);
  }

  // Apply positions to React Flow nodes
  const layoutedNodes = nodes.map(node => {
    const pos = positionMap.get(node.id);
    const size = sizeMap.get(node.id);
    return {
      ...node,
      position: pos ?? node.position,
      ...(node.type === 'groupNode' && size
        ? { style: { ...node.style, width: size.width, height: size.height } }
        : {}),
    };
  });

  // Extract edge bend points from sections (both root and intra-group)
  const edgePointsMap = new Map<string, { x: number; y: number }[]>();

  function extractEdgePoints(elkEdges: unknown[]) {
    for (const elkEdge of elkEdges) {
      const e = elkEdge as { id: string; sections?: { startPoint?: { x: number; y: number }; endPoint?: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[] };
      const points: { x: number; y: number }[] = [];
      for (const section of e.sections ?? []) {
        if (section.startPoint) points.push(section.startPoint);
        for (const bp of section.bendPoints ?? []) {
          points.push(bp);
        }
        if (section.endPoint) points.push(section.endPoint);
      }
      if (points.length > 0) {
        edgePointsMap.set(e.id, points);
      }
    }
  }

  // Root-level edges
  extractEdgePoints(graph.edges ?? []);
  // Intra-group edges
  for (const child of graph.children ?? []) {
    if ((child as ElkNode & { edges?: unknown[] }).edges) {
      extractEdgePoints((child as ElkNode & { edges?: unknown[] }).edges!);
    }
  }

  // Attach points to React Flow edges
  const layoutedEdges = edges.map(edge => {
    const points = edgePointsMap.get(edge.id);
    if (points) {
      return {
        ...edge,
        data: { ...edge.data, points },
      };
    }
    return edge;
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
