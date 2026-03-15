import type { Node, Edge } from '@xyflow/react';
import type { NavMapGraph, NavMapNode, NavMapEdge } from '../types';

export interface RFNodeData {
  label: string;
  route: string;
  group: string;
  screenshot?: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export function toReactFlowNodes(nodes: NavMapNode[]): Node<RFNodeData>[] {
  return nodes.map(n => ({
    id: n.id,
    type: n.screenshot ? 'pageNode' : 'compactNode',
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      route: n.route,
      group: n.group,
      screenshot: n.screenshot,
      filePath: n.filePath,
      metadata: n.metadata,
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
    },
  }));
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
    nodes: toReactFlowNodes(graph.nodes),
    edges: toReactFlowEdges(graph.edges),
  };
}
