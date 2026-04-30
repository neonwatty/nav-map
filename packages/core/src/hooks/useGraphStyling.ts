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
  focusedGroupId: string | null;
  nodeGroupMap: Map<string, string>;
  showRedirects: boolean;
  searchMatchIds: Set<string> | null;
  auditFocusNodeIds: Set<string> | null;
}

export function useGraphStyling(deps: GraphStylingDeps): {
  styledNodes: Node[];
  styledEdges: Edge[];
} {
  const {
    nodes,
    edges,
    zoomedNodes,
    collapsedGroups,
    selectedNodeId,
    focusMode,
    viewMode,
    activeFlow,
    focusedGroupId,
    nodeGroupMap,
    showRedirects,
    searchMatchIds,
    auditFocusNodeIds,
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
          data: {
            ...bucket[0].data,
            label: `${bucket.length} connections`,
            edgeCount: bucket.length,
            edgeType: 'link',
          },
        });
      }
    }

    return merged.filter(e => e.source !== e.target);
  }, [edges, nodes, collapsedGroups]);

  // Filter out redirect edges when toggle is off
  const filteredEdges = useMemo(() => {
    if (showRedirects) return visibleEdges;
    return visibleEdges.filter(e => {
      const edgeType = (e.data as Record<string, unknown>)?.edgeType ?? e.type;
      return edgeType !== 'redirect';
    });
  }, [visibleEdges, showRedirects]);

  // Dimming: search > audit focus > flow highlighting > group focus > selection > default
  const styledNodes = useMemo(() => {
    // Search highlighting takes top priority
    if (searchMatchIds && searchMatchIds.size > 0) {
      return visibleNodes.map(node => {
        const isMatch = searchMatchIds.has(node.id);
        return {
          ...node,
          style: {
            ...node.style,
            opacity: isMatch ? 1 : 0.12,
            transition: 'opacity 200ms ease',
            ...(isMatch
              ? { filter: 'drop-shadow(0 0 6px rgba(91,155,245,0.5))' }
              : { pointerEvents: 'none' as React.CSSProperties['pointerEvents'] }),
          },
        };
      });
    }

    if (auditFocusNodeIds && auditFocusNodeIds.size > 0) {
      return visibleNodes.map(node => {
        const isFocused = auditFocusNodeIds.has(node.id);
        return {
          ...node,
          style: {
            ...node.style,
            opacity: isFocused ? 1 : 0.18,
            pointerEvents: (isFocused ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
            transition: 'opacity 200ms ease',
            ...(isFocused ? { filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.55))' } : {}),
          },
        };
      });
    }

    if (viewMode === 'map' && activeFlow) {
      const flowStepSet = new Set(activeFlow.steps);
      const flowStepMap = new Map(activeFlow.steps.map((id, i) => [id, i + 1]));
      return visibleNodes.map(node => {
        const isFlowNode = flowStepSet.has(node.id);
        return {
          ...node,
          data: {
            ...node.data,
            ...(isFlowNode ? { flowStepNumber: flowStepMap.get(node.id) } : {}),
          },
          style: { ...node.style, opacity: isFlowNode ? 1 : 0.2, transition: 'opacity 0.2s' },
        };
      });
    }

    if (focusedGroupId) {
      return visibleNodes.map(node => {
        if (node.type === 'groupNode') {
          const groupId = (node.data as Record<string, unknown>).groupId as string;
          const isFocused = groupId === focusedGroupId;
          return {
            ...node,
            style: {
              ...node.style,
              opacity: isFocused ? 1 : 0.15,
              transition: 'opacity 300ms ease',
            },
          };
        }
        const nodeGroup = (node.data as Record<string, unknown>).group as string | undefined;
        const isFocused = nodeGroup === focusedGroupId;
        return {
          ...node,
          style: {
            ...node.style,
            opacity: isFocused ? 1 : 0.15,
            pointerEvents: (isFocused ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
            transition: 'opacity 300ms ease',
          },
        };
      });
    }

    // Only dim non-connected nodes when focus mode is active
    if (!selectedNodeId || !focusMode) return visibleNodes;

    const connectedNodeIds = new Set<string>([selectedNodeId]);
    for (const edge of filteredEdges) {
      if (edge.source === selectedNodeId) connectedNodeIds.add(edge.target);
      if (edge.target === selectedNodeId) connectedNodeIds.add(edge.source);
    }

    return visibleNodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: connectedNodeIds.has(node.id) ? 1 : 0.25,
        transition: 'opacity 0.2s',
      },
    }));
  }, [
    visibleNodes,
    filteredEdges,
    selectedNodeId,
    focusMode,
    viewMode,
    activeFlow,
    focusedGroupId,
    searchMatchIds,
    auditFocusNodeIds,
  ]);

  const styledEdges = useMemo(() => {
    if (auditFocusNodeIds && auditFocusNodeIds.size > 0) {
      return filteredEdges.map(edge => {
        const sourceIn = auditFocusNodeIds.has(edge.source);
        const targetIn = auditFocusNodeIds.has(edge.target);
        const isFocused = sourceIn && targetIn;
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isFocused ? 1 : 0.08,
            stroke: isFocused ? '#ef4444' : undefined,
            strokeWidth: isFocused ? 2.5 : undefined,
            pointerEvents: (isFocused ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
            transition: 'opacity 200ms ease',
          },
        };
      });
    }

    if (viewMode === 'map' && activeFlow) {
      const flowEdgePairs = new Set<string>();
      for (let i = 0; i < activeFlow.steps.length - 1; i++) {
        flowEdgePairs.add(`${activeFlow.steps[i]}->${activeFlow.steps[i + 1]}`);
      }
      return filteredEdges.map(edge => {
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

    if (focusedGroupId) {
      return filteredEdges.map(edge => {
        const sourceGroup = nodeGroupMap.get(edge.source);
        const targetGroup = nodeGroupMap.get(edge.target);
        const sourceIn = sourceGroup === focusedGroupId;
        const targetIn = targetGroup === focusedGroupId;
        let opacity = 0;
        if (sourceIn && targetIn) opacity = 1;
        else if (sourceIn || targetIn) opacity = 0.15;
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity,
            pointerEvents: (opacity > 0 ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
            transition: 'opacity 300ms ease',
          },
        };
      });
    }

    if (focusMode && !selectedNodeId) {
      return filteredEdges.map(edge => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 0,
          pointerEvents: 'none' as const,
          transition: 'opacity 0.2s',
        },
      }));
    }

    if (!selectedNodeId) return filteredEdges;

    return filteredEdges.map(edge => {
      const isConnected = edge.source === selectedNodeId || edge.target === selectedNodeId;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isConnected ? 1 : focusMode ? 0 : 0.15,
          pointerEvents: (isConnected || !focusMode
            ? 'auto'
            : 'none') as React.CSSProperties['pointerEvents'],
          transition: 'opacity 0.2s',
        },
      };
    });
  }, [
    filteredEdges,
    selectedNodeId,
    focusMode,
    viewMode,
    activeFlow,
    focusedGroupId,
    nodeGroupMap,
    auditFocusNodeIds,
  ]);

  return { styledNodes, styledEdges };
}
