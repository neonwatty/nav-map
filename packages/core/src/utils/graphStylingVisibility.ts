import type { Edge, Node } from '@xyflow/react';

export function getVisibleNodes(zoomedNodes: Node[], collapsedGroups: Set<string>): Node[] {
  if (collapsedGroups.size === 0) return zoomedNodes;
  return zoomedNodes.filter(node => {
    if (!node.parentId) return true;
    const groupId = node.parentId.slice('group-'.length);
    return !collapsedGroups.has(groupId);
  });
}

export function getVisibleEdges(
  edges: Edge[],
  nodes: Node[],
  collapsedGroups: Set<string>
): Edge[] {
  if (collapsedGroups.size === 0) return edges;

  const collapsedChildIds = new Set(
    nodes
      .filter(node => node.parentId && collapsedGroups.has(node.parentId.slice('group-'.length)))
      .map(node => node.id)
  );

  const reroutedEdges = edges.map(edge => rerouteCollapsedEdge(edge, nodes, collapsedChildIds));
  return mergeDuplicateEdges(reroutedEdges).filter(edge => edge.source !== edge.target);
}

export function filterRedirectEdges(edges: Edge[], showRedirects: boolean): Edge[] {
  if (showRedirects) return edges;
  return edges.filter(edge => {
    const edgeType = (edge.data as Record<string, unknown>)?.edgeType ?? edge.type;
    return edgeType !== 'redirect';
  });
}

function rerouteCollapsedEdge(edge: Edge, nodes: Node[], collapsedChildIds: Set<string>): Edge {
  let { source, target } = edge;
  const sourceNode = nodes.find(node => node.id === source);
  const targetNode = nodes.find(node => node.id === target);
  if (sourceNode?.parentId && collapsedChildIds.has(source)) source = sourceNode.parentId;
  if (targetNode?.parentId && collapsedChildIds.has(target)) target = targetNode.parentId;
  if (source === edge.source && target === edge.target) return edge;
  return { ...edge, source, target, id: `${edge.id}-rerouted` };
}

function mergeDuplicateEdges(edges: Edge[]): Edge[] {
  const edgeBuckets = new Map<string, Edge[]>();
  for (const edge of edges) {
    const key = `${edge.source}->${edge.target}`;
    const bucket = edgeBuckets.get(key) ?? [];
    bucket.push(edge);
    edgeBuckets.set(key, bucket);
  }

  const merged: Edge[] = [];
  for (const [key, bucket] of edgeBuckets) {
    if (bucket.length === 1) merged.push(bucket[0]);
    else {
      merged.push({
        ...bucket[0],
        id: `merged-${key}`,
        data: {
          ...bucket[0].data,
          label: `${bucket.length} connections`,
          edgeCount: bucket.length,
          edgeType: 'link',
        },
      });
    }
  }
  return merged;
}
