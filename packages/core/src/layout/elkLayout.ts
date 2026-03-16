import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
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
  const { direction = 'RIGHT', spacing = 100, nodeSpacing = 50 } = options;

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

  // ALL edges at root level — INCLUDE_CHILDREN handles cross-hierarchy routing
  const elkEdges: ElkExtendedEdge[] = edges.map(edge => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  // Run layout with INCLUDE_CHILDREN for proper cross-group edge routing
  const graph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.spacing.edgeEdge': '15',
      'elk.spacing.edgeNode': '25',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing),
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    },
    children: [...elkGroupNodes, ...ungroupedNodes],
    edges: elkEdges,
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
  // Group nodes need explicit width/height for React Flow to size them properly
  const layoutedNodes = nodes.map(node => {
    const pos = positionMap.get(node.id);
    const size = sizeMap.get(node.id);
    if (node.type === 'groupNode' && size) {
      return {
        ...node,
        position: pos ?? node.position,
        measured: { width: size.width, height: size.height },
        style: {
          ...node.style,
          width: size.width,
          height: size.height,
        },
      };
    }
    return {
      ...node,
      position: pos ?? node.position,
    };
  });

  // Build map of group positions for coordinate transformation
  const groupPositions = new Map<string, { x: number; y: number }>();
  for (const node of layoutedNodes) {
    if (node.type === 'groupNode') {
      groupPositions.set(node.id, node.position);
    }
  }

  // Build map of node → parent group
  const nodeParentMap = new Map<string, string>();
  for (const node of layoutedNodes) {
    if (node.parentId) nodeParentMap.set(node.id, node.parentId);
  }

  // Edges: don't attach ELK bend points since they're in root-absolute space
  // which conflicts with React Flow's parent-relative coordinate system.
  // Instead, rely on React Flow's smoothstep edge type for routing.
  const layoutedEdges = edges;

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
