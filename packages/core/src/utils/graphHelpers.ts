import type { Node, Edge } from '@xyflow/react';
import type {
  NavMapGraph,
  NavMapNode,
  NavMapEdge,
  NavMapGroup,
  CoverageData,
  NavMapWorkflowMetadata,
} from '../types';
import type { GroupNodeData } from '../components/nodes/GroupNode';

export interface RFNodeData {
  nodeId?: string;
  label: string;
  route: string;
  group: string;
  screenshot?: string;
  filePath?: string;
  metadata?: NavMapWorkflowMetadata;
  coverage?: CoverageData;
  [key: string]: unknown;
}

export function buildCompoundNodes(nodes: NavMapNode[], groups: NavMapGroup[]): Node[] {
  const groupIds = new Set(groups.map(g => g.id));
  const groupChildCounts = new Map<string, number>();

  for (const n of nodes) {
    if (groupIds.has(n.group)) {
      groupChildCounts.set(n.group, (groupChildCounts.get(n.group) ?? 0) + 1);
    }
  }

  const rfNodes: Node[] = [];

  // Create group container nodes (skip empty groups)
  for (const g of groups) {
    const count = groupChildCounts.get(g.id) ?? 0;
    if (count === 0) continue;

    rfNodes.push({
      id: `group-${g.id}`,
      type: 'groupNode',
      position: { x: 0, y: 0 },
      data: {
        label: g.label,
        groupId: g.id,
        childCount: count,
        collapsed: false,
      } satisfies GroupNodeData,
    });
  }

  // Create page nodes with parentId
  for (const n of nodes) {
    const hasGroup = groupIds.has(n.group) && (groupChildCounts.get(n.group) ?? 0) > 0;
    rfNodes.push({
      id: n.id,
      type: n.screenshot ? 'pageNode' : 'compactNode',
      position: { x: 0, y: 0 },
      ...(hasGroup ? { parentId: `group-${n.group}` } : {}),
      data: {
        nodeId: n.id,
        label: n.label,
        route: n.route,
        group: n.group,
        screenshot: n.screenshot,
        filePath: n.filePath,
        metadata: n.metadata,
        coverage: n.coverage,
      } satisfies RFNodeData,
    });
  }

  return rfNodes;
}

// Keep old function for backward compatibility
export function toReactFlowNodes(nodes: NavMapNode[]): Node<RFNodeData>[] {
  return nodes.map(n => ({
    id: n.id,
    type: n.screenshot ? 'pageNode' : 'compactNode',
    position: { x: 0, y: 0 },
    data: {
      nodeId: n.id,
      label: n.label,
      route: n.route,
      group: n.group,
      screenshot: n.screenshot,
      filePath: n.filePath,
      metadata: n.metadata,
      coverage: n.coverage,
    },
  }));
}

export function toReactFlowEdges(edges: NavMapEdge[]): Edge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'navEdge',
    data: {
      label: e.label,
      edgeType: e.type,
      action: e.action,
      personas: e.personas,
      discovery: e.discovery,
      metadata: e.metadata,
    },
  }));
}

export function getGraphNodeId(node: Pick<Node, 'id' | 'data'>): string {
  const nodeData = node.data as Partial<RFNodeData> | undefined;
  return typeof nodeData?.nodeId === 'string' && nodeData.nodeId.length > 0
    ? nodeData.nodeId
    : node.id;
}

export function getConnectedNodes(
  nodeId: string,
  edges: NavMapEdge[]
): { incoming: NavMapEdge[]; outgoing: NavMapEdge[] } {
  return {
    incoming: edges.filter(e => e.target === nodeId),
    outgoing: edges.filter(e => e.source === nodeId),
  };
}

export function buildGraphFromJson(graph: NavMapGraph) {
  return {
    nodes: buildCompoundNodes(graph.nodes, graph.groups),
    edges: toReactFlowEdges(graph.edges),
  };
}
