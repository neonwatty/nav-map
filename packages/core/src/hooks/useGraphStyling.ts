import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NavMapFlow, ViewMode } from '../types';

interface GraphStylingDeps {
  nodes: Node[];
  edges: Edge[];
  zoomedNodes: Node[];
  collapsedGroups: Set<string>;
  selectedNodeId: string | null;
  focusMode: boolean;
  viewMode: ViewMode;
  activeFlow: NavMapFlow | null;
}

export function useGraphStyling(deps: GraphStylingDeps): { styledNodes: Node[]; styledEdges: Edge[] } {
  const {
    nodes,
    edges,
    zoomedNodes,
    collapsedGroups,
    selectedNodeId,
    focusMode,
    viewMode,
    activeFlow,
  } = deps;

  // Filter collapsed group children
  const visibleNodes = useMemo(() => {
    if (collapsedGroups.size === 0) return zoomedNodes;
    return zoomedNodes.filter(node => {
      if (!node.parentId) return true;
      const groupId = node.parentId.slice('group-'.length);
      return !collapsedGroups.has(groupId);
    });
  }, [zoomedNodes, collapsedGroups]);

  // Re-route edges targeting collapsed children to the group node
  const visibleEdges = useMemo(() => {
    if (collapsedGroups.size === 0) return edges;

    const collapsedChildIds = new Set(
      nodes
        .filter(n => n.parentId && collapsedGroups.has(n.parentId.slice('group-'.length)))
        .map(n => n.id)
    );

    const reroutedEdges = edges.map(edge => {
      let { source, target } = edge;
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
      if (sourceNode?.parentId && collapsedChildIds.has(source)) source = sourceNode.parentId;
      if (targetNode?.parentId && collapsedChildIds.has(target)) target = targetNode.parentId;
      if (source === edge.source && target === edge.target) return edge;
      return { ...edge, source, target, id: `${edge.id}-rerouted` };
    });

    // Merge edges with same source+target
    const edgeBuckets = new Map<string, Edge[]>();
    for (const edge of reroutedEdges) {
      const key = `${edge.source}->${edge.target}`;
      const bucket = edgeBuckets.get(key) ?? [];
      bucket.push(edge);
      edgeBuckets.set(key, bucket);
    }

    const merged: Edge[] = [];
    for (const [key, bucket] of edgeBuckets) {
      if (bucket.length === 1) {
        merged.push(bucket[0]);
      } else {
        merged.push({
          ...bucket[0],
          id: `merged-${key}`,
          data: { ...bucket[0].data, label: `${bucket.length} connections`, edgeCount: bucket.length, edgeType: 'link' },
        });
      }
    }

    return merged.filter(e => e.source !== e.target);
  }, [edges, nodes, collapsedGroups]);

  // Dimming: selection, flow highlighting, or default
  const styledNodes = useMemo(() => {
    if (viewMode === 'map' && activeFlow) {
      const flowStepSet = new Set(activeFlow.steps);
      const flowStepMap = new Map(activeFlow.steps.map((id, i) => [id, i + 1]));
      return visibleNodes.map(node => {
        const isFlowNode = flowStepSet.has(node.id);
        return {
          ...node,
          data: { ...node.data, ...(isFlowNode ? { flowStepNumber: flowStepMap.get(node.id) } : {}) },
          style: { ...node.style, opacity: isFlowNode ? 1 : 0.2, transition: 'opacity 0.2s' },
        };
      });
    }

    if (!selectedNodeId) return visibleNodes;

    const connectedNodeIds = new Set<string>([selectedNodeId]);
    for (const edge of visibleEdges) {
      if (edge.source === selectedNodeId) connectedNodeIds.add(edge.target);
      if (edge.target === selectedNodeId) connectedNodeIds.add(edge.source);
    }

    return visibleNodes.map(node => ({
      ...node,
      style: { ...node.style, opacity: connectedNodeIds.has(node.id) ? 1 : 0.25, transition: 'opacity 0.2s' },
    }));
  }, [visibleNodes, visibleEdges, selectedNodeId, viewMode, activeFlow]);

  const styledEdges = useMemo(() => {
    if (viewMode === 'map' && activeFlow) {
      const flowEdgePairs = new Set<string>();
      for (let i = 0; i < activeFlow.steps.length - 1; i++) {
        flowEdgePairs.add(`${activeFlow.steps[i]}->${activeFlow.steps[i + 1]}`);
      }
      return visibleEdges.map(edge => {
        const isFlowEdge = flowEdgePairs.has(`${edge.source}->${edge.target}`);
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isFlowEdge ? 1 : 0.08,
            stroke: isFlowEdge ? '#3355aa' : undefined,
            strokeWidth: isFlowEdge ? 2.5 : undefined,
            transition: 'opacity 0.2s',
          },
        };
      });
    }

    if (focusMode && !selectedNodeId) {
      return visibleEdges.map(edge => ({
        ...edge,
        style: { ...edge.style, opacity: 0, pointerEvents: 'none' as const, transition: 'opacity 0.2s' },
      }));
    }

    if (!selectedNodeId) return visibleEdges;

    return visibleEdges.map(edge => {
      const isConnected = edge.source === selectedNodeId || edge.target === selectedNodeId;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isConnected ? 1 : focusMode ? 0 : 0.15,
          pointerEvents: (isConnected || !focusMode ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
          transition: 'opacity 0.2s',
        },
      };
    });
  }, [visibleEdges, selectedNodeId, focusMode, viewMode, activeFlow]);

  return { styledNodes, styledEdges };
}
