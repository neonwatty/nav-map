import type { Edge, Node } from '@xyflow/react';
import type { NavMapGraph } from '../types';
import { buildGraphFromJson } from '../utils/graphHelpers';
import { buildRouteHierarchy } from '../utils/routeHierarchy';

export interface LayoutInput {
  nodes: Node[];
  edges: Edge[];
}

export interface TreeLayoutInput extends LayoutInput {
  nonReachableNodes: Node[];
}

interface HierarchyLayoutInputOptions {
  expandedGroups: Set<string>;
  onGroupToggle: ((groupId: string, collapsed: boolean) => void) | null;
  onHierarchyToggle: ((groupId: string) => void) | null;
}

interface MapLayoutInputOptions {
  onGroupToggle: ((groupId: string, collapsed: boolean) => void) | null;
  onGroupDoubleClick: ((groupId: string) => void) | null;
}

export function buildFlowLayoutInput(
  graph: NavMapGraph,
  selectedFlowIndex: number
): LayoutInput | null {
  const flow = graph.flows?.[selectedFlowIndex];
  if (!flow) return null;

  const edges: Edge[] = [];
  for (let i = 0; i < flow.steps.length - 1; i++) {
    const src = flow.steps[i];
    const tgt = flow.steps[i + 1];
    const existingEdge = graph.edges.find(e => e.source === src && e.target === tgt);
    edges.push({
      id: existingEdge?.id ?? `flow-${src}-${tgt}`,
      source: src,
      target: tgt,
      type: 'navEdge',
      data: { label: existingEdge?.label ?? '', edgeType: existingEdge?.type ?? 'link' },
    });
  }

  const nodes: Node[] = flow.steps.map((stepId, index) => {
    const graphNode = graph.nodes.find(n => n.id === stepId);
    return {
      id: stepId,
      type: graphNode?.screenshot ? 'pageNode' : 'compactNode',
      position: { x: 0, y: 0 },
      data: {
        label: graphNode?.label ?? stepId,
        route: graphNode?.route ?? '',
        group: graphNode?.group ?? '',
        screenshot: graphNode?.screenshot,
        flowStepNumber: index + 1,
      },
    };
  });

  return { nodes, edges };
}

export function buildTreeLayoutInput(graph: NavMapGraph, treeRootId: string): TreeLayoutInput {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const existing = adjacency.get(edge.source) ?? [];
    existing.push(edge.target);
    adjacency.set(edge.source, existing);
  }

  const visited = new Set<string>();
  const queue = [treeRootId];
  visited.add(treeRootId);
  const edges: Edge[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        const existingEdge = graph.edges.find(e => e.source === current && e.target === neighbor);
        edges.push({
          id: existingEdge?.id ?? `tree-${current}-${neighbor}`,
          source: current,
          target: neighbor,
          type: 'navEdge',
          data: { label: existingEdge?.label ?? '', edgeType: existingEdge?.type ?? 'link' },
        });
      }
    }
  }

  const allNodes: Node[] = graph.nodes.map(n => ({
    id: n.id,
    type: n.screenshot ? 'pageNode' : 'compactNode',
    position: { x: 0, y: 0 },
    data: { label: n.label, route: n.route, group: n.group, screenshot: n.screenshot },
    style: { opacity: visited.has(n.id) ? 1 : 0.1, transition: 'opacity 0.3s' },
  }));

  return {
    nodes: allNodes.filter(n => visited.has(n.id)),
    edges,
    nonReachableNodes: allNodes
      .filter(n => !visited.has(n.id))
      .map((n, i) => ({ ...n, position: { x: -300, y: i * 60 } })),
  };
}

export function buildHierarchyLayoutInput(
  graph: NavMapGraph,
  { expandedGroups, onGroupToggle, onHierarchyToggle }: HierarchyLayoutInputOptions
): LayoutInput {
  const hierarchy = buildRouteHierarchy(graph.nodes);
  const groupMembers = new Map<string, typeof graph.nodes>();
  for (const n of [...graph.nodes].sort((a, b) => a.label.localeCompare(b.label))) {
    if (!n.group) continue;
    const members = groupMembers.get(n.group) ?? [];
    members.push(n);
    groupMembers.set(n.group, members);
  }

  const groupIds = new Set(graph.groups.map(g => g.id));
  const sortedGroups = [...graph.groups].sort((a, b) => a.label.localeCompare(b.label));

  const nodes: Node[] = [];
  const includedNodeIds = new Set<string>();

  const ungrouped = graph.nodes
    .filter(n => !n.group || !groupIds.has(n.group))
    .sort((a, b) => a.label.localeCompare(b.label));
  for (const n of ungrouped) {
    nodes.push({
      id: n.id,
      type: n.screenshot ? 'pageNode' : 'compactNode',
      position: { x: 0, y: 0 },
      data: { label: n.label, route: n.route, group: n.group, screenshot: n.screenshot },
    });
    includedNodeIds.add(n.id);
  }

  for (const group of sortedGroups) {
    const members = groupMembers.get(group.id);
    if (!members || members.length === 0) continue;

    const groupNodeId = `hier-group-${group.id}`;
    if (expandedGroups.has(group.id)) {
      nodes.push({
        id: groupNodeId,
        type: 'groupNode',
        position: { x: 0, y: 0 },
        data: {
          label: group.label,
          groupId: group.id,
          childCount: members.length,
          collapsed: false,
          onToggle: onGroupToggle,
          onDoubleClick: onHierarchyToggle,
        },
      });
      includedNodeIds.add(groupNodeId);

      for (const n of members) {
        nodes.push({
          id: n.id,
          type: n.screenshot ? 'pageNode' : 'compactNode',
          position: { x: 0, y: 0 },
          parentId: groupNodeId,
          data: { label: n.label, route: n.route, group: n.group, screenshot: n.screenshot },
        });
        includedNodeIds.add(n.id);
      }
    } else {
      nodes.push({
        id: groupNodeId,
        type: 'compactNode',
        position: { x: 0, y: 0 },
        data: {
          label: `${group.label} (${members.length})`,
          route: group.routePrefix ?? '',
          group: group.id,
        },
      });
      includedNodeIds.add(groupNodeId);
    }
  }

  const nodeToGroup = new Map<string, string>();
  for (const n of graph.nodes) {
    if (n.group && groupIds.has(n.group) && !expandedGroups.has(n.group)) {
      nodeToGroup.set(n.id, `hier-group-${n.group}`);
    }
  }

  const edges: Edge[] = [];
  const edgeDedup = new Set<string>();

  for (const { parentId, childId } of hierarchy) {
    const resolvedParent = nodeToGroup.get(parentId) ?? parentId;
    const resolvedChild = nodeToGroup.get(childId) ?? childId;

    if (resolvedParent === resolvedChild) continue;
    if (!includedNodeIds.has(resolvedParent) || !includedNodeIds.has(resolvedChild)) continue;

    const key = `${resolvedParent}->${resolvedChild}`;
    if (edgeDedup.has(key)) continue;
    edgeDedup.add(key);

    edges.push({
      id: `hier-${resolvedParent}-${resolvedChild}`,
      source: resolvedParent,
      target: resolvedChild,
      type: 'navEdge',
      data: { label: '', edgeType: 'link' },
    });
  }

  return { nodes, edges };
}

export function buildMapLayoutInput(
  graph: NavMapGraph,
  { onGroupToggle, onGroupDoubleClick }: MapLayoutInputOptions
): LayoutInput {
  const { nodes, edges } = buildGraphFromJson(graph);
  for (const node of nodes) {
    if (node.type === 'groupNode') {
      (node.data as Record<string, unknown>).onToggle = onGroupToggle;
      (node.data as Record<string, unknown>).onDoubleClick = onGroupDoubleClick;
    }
  }

  return { nodes, edges };
}
