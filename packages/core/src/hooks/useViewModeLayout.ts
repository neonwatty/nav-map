import { useEffect, type RefObject } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NavMapGraph, ViewMode } from '../types';
import { buildGraphFromJson } from '../utils/graphHelpers';
import { computeElkLayout } from '../layout/elkLayout';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';
import { buildRouteHierarchy } from '../utils/routeHierarchy';

interface UseViewModeLayoutOptions {
  graph: NavMapGraph | null;
  layoutDone: boolean;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  treeRootId: string | null;
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  fitView: (options?: { padding?: number; duration?: number }) => void;
  baseEdgesRef: RefObject<Edge[]>;
  sharedNavEdgesRef: RefObject<Edge[]>;
  handleGroupToggleRef: RefObject<(groupId: string, collapsed: boolean) => void>;
  handleGroupDoubleClickRef: RefObject<(groupId: string) => void>;
  hierarchyExpandedGroups: Set<string>;
  handleHierarchyToggleRef: RefObject<(groupId: string) => void>;
}

export function useViewModeLayout({
  graph,
  layoutDone,
  viewMode,
  selectedFlowIndex,
  treeRootId,
  setNodes,
  setEdges,
  fitView,
  baseEdgesRef,
  sharedNavEdgesRef,
  handleGroupToggleRef,
  handleGroupDoubleClickRef,
  hierarchyExpandedGroups,
  handleHierarchyToggleRef,
}: UseViewModeLayoutOptions): void {
  // Re-layout when view mode changes
  useEffect(() => {
    if (!graph || !layoutDone) return;

    if (viewMode === 'flow' && selectedFlowIndex !== null) {
      const flow = graph.flows?.[selectedFlowIndex];
      if (!flow) return;

      const flowEdges: Edge[] = [];
      for (let i = 0; i < flow.steps.length - 1; i++) {
        const src = flow.steps[i];
        const tgt = flow.steps[i + 1];
        const existingEdge = graph.edges.find(e => e.source === src && e.target === tgt);
        flowEdges.push({
          id: existingEdge?.id ?? `flow-${src}-${tgt}`,
          source: src,
          target: tgt,
          type: 'navEdge',
          data: { label: existingEdge?.label ?? '', edgeType: existingEdge?.type ?? 'link' },
        });
      }

      const flowNodes: Node[] = flow.steps.map((stepId, index) => {
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

      computeElkLayout(flowNodes, flowEdges, { direction: 'RIGHT', spacing: 120 }).then(
        ({ nodes: ln, edges: le }) => {
          setNodes(ln);
          setEdges(le);
          baseEdgesRef.current = le;
          setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
        }
      );
    } else if (viewMode === 'tree' && treeRootId) {
      const adjacency = new Map<string, string[]>();
      for (const edge of graph.edges) {
        const existing = adjacency.get(edge.source) ?? [];
        existing.push(edge.target);
        adjacency.set(edge.source, existing);
      }

      const visited = new Set<string>();
      const queue = [treeRootId];
      visited.add(treeRootId);
      const treeEdges: Edge[] = [];

      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const neighbor of adjacency.get(current) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
            const existingEdge = graph.edges.find(
              e => e.source === current && e.target === neighbor
            );
            treeEdges.push({
              id: existingEdge?.id ?? `tree-${current}-${neighbor}`,
              source: current,
              target: neighbor,
              type: 'navEdge',
              data: { label: existingEdge?.label ?? '', edgeType: existingEdge?.type ?? 'link' },
            });
          }
        }
      }

      const treeNodes: Node[] = graph.nodes.map(n => ({
        id: n.id,
        type: n.screenshot ? 'pageNode' : 'compactNode',
        position: { x: 0, y: 0 },
        data: { label: n.label, route: n.route, group: n.group, screenshot: n.screenshot },
        style: { opacity: visited.has(n.id) ? 1 : 0.1, transition: 'opacity 0.3s' },
      }));

      computeElkLayout(
        treeNodes.filter(n => visited.has(n.id)),
        treeEdges,
        { direction: 'RIGHT', spacing: 100 }
      ).then(({ nodes: ln, edges: le }) => {
        const nonReachable = treeNodes
          .filter(n => !visited.has(n.id))
          .map((n, i) => ({ ...n, position: { x: -300, y: i * 60 } }));
        setNodes([...ln, ...nonReachable]);
        setEdges(le);
        baseEdgesRef.current = le;
        setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
      });
    } else if (viewMode === 'hierarchy') {
      // Build route hierarchy edges
      const hierarchy = buildRouteHierarchy(graph.nodes);

      // Group nodes by their group ID, sorted alphabetically for stable layout
      const groupMembers = new Map<string, typeof graph.nodes>();
      for (const n of [...graph.nodes].sort((a, b) => a.label.localeCompare(b.label))) {
        if (!n.group) continue;
        const members = groupMembers.get(n.group) ?? [];
        members.push(n);
        groupMembers.set(n.group, members);
      }

      const groupIds = new Set(graph.groups.map(g => g.id));
      // Sort groups alphabetically for stable ELK input ordering
      const sortedGroups = [...graph.groups].sort((a, b) => a.label.localeCompare(b.label));

      const hierNodes: Node[] = [];
      const includedNodeIds = new Set<string>();

      // Add non-grouped nodes (like root "/"), sorted for stability
      const ungrouped = graph.nodes
        .filter(n => !n.group || !groupIds.has(n.group))
        .sort((a, b) => a.label.localeCompare(b.label));
      for (const n of ungrouped) {
        hierNodes.push({
          id: n.id,
          type: n.screenshot ? 'pageNode' : 'compactNode',
          position: { x: 0, y: 0 },
          data: { label: n.label, route: n.route, group: n.group, screenshot: n.screenshot },
        });
        includedNodeIds.add(n.id);
      }

      // For each group: collapsed → summary node, expanded → group container + children
      for (const group of sortedGroups) {
        const members = groupMembers.get(group.id);
        if (!members || members.length === 0) continue;

        if (hierarchyExpandedGroups.has(group.id)) {
          // Expanded: group container node + child pages inside it
          const groupNodeId = `hier-group-${group.id}`;
          hierNodes.push({
            id: groupNodeId,
            type: 'groupNode',
            position: { x: 0, y: 0 },
            data: {
              label: group.label,
              groupId: group.id,
              childCount: members.length,
              collapsed: false,
              onToggle: handleGroupToggleRef.current,
              onDoubleClick: handleHierarchyToggleRef.current,
            },
          });
          includedNodeIds.add(groupNodeId);

          for (const n of members) {
            hierNodes.push({
              id: n.id,
              type: n.screenshot ? 'pageNode' : 'compactNode',
              position: { x: 0, y: 0 },
              parentId: groupNodeId,
              data: { label: n.label, route: n.route, group: n.group, screenshot: n.screenshot },
            });
            includedNodeIds.add(n.id);
          }
        } else {
          // Collapsed: single summary node
          hierNodes.push({
            id: `hier-group-${group.id}`,
            type: 'compactNode',
            position: { x: 0, y: 0 },
            data: {
              label: `${group.label} (${members.length})`,
              route: group.routePrefix ?? '',
              group: group.id,
            },
          });
          includedNodeIds.add(`hier-group-${group.id}`);
        }
      }

      // Build edges: redirect edges pointing to collapsed group members → group summary
      const nodeToGroup = new Map<string, string>();
      for (const n of graph.nodes) {
        if (n.group && groupIds.has(n.group) && !hierarchyExpandedGroups.has(n.group)) {
          nodeToGroup.set(n.id, `hier-group-${n.group}`);
        }
      }

      const hierEdges: Edge[] = [];
      const edgeDedup = new Set<string>();

      for (const { parentId, childId } of hierarchy) {
        const resolvedParent = nodeToGroup.get(parentId) ?? parentId;
        const resolvedChild = nodeToGroup.get(childId) ?? childId;

        if (resolvedParent === resolvedChild) continue;
        if (!includedNodeIds.has(resolvedParent) || !includedNodeIds.has(resolvedChild)) continue;

        const key = `${resolvedParent}->${resolvedChild}`;
        if (edgeDedup.has(key)) continue;
        edgeDedup.add(key);

        hierEdges.push({
          id: `hier-${resolvedParent}-${resolvedChild}`,
          source: resolvedParent,
          target: resolvedChild,
          type: 'navEdge',
          data: { label: '', edgeType: 'link' },
        });
      }

      computeElkLayout(hierNodes, hierEdges, { direction: 'DOWN', spacing: 80 }).then(
        ({ nodes: ln, edges: le }) => {
          setNodes(ln);
          setEdges(le);
          baseEdgesRef.current = le;
          setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
        }
      );
    } else if (viewMode === 'map') {
      const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);
      for (const node of rfNodes) {
        if (node.type === 'groupNode') {
          (node.data as Record<string, unknown>).onToggle = handleGroupToggleRef.current;
          (node.data as Record<string, unknown>).onDoubleClick = handleGroupDoubleClickRef.current;
        }
      }
      computeElkLayout(rfNodes, rfEdges).then(({ nodes: ln, edges: le }) => {
        setNodes(ln);
        setEdges(le);
        baseEdgesRef.current = le;
        sharedNavEdgesRef.current = buildSharedNavEdges(graph);
        setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedFlowIndex, treeRootId, hierarchyExpandedGroups]);
}
