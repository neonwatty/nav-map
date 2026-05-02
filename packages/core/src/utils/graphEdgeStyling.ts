import type { CSSProperties } from 'react';
import type { Edge } from '@xyflow/react';
import type { NavMapFlow } from '../types';
import type { StyleEdgesOptions } from './graphStyling';

export function styleEdges({
  filteredEdges,
  selectedNodeId,
  focusMode,
  viewMode,
  activeFlow,
  focusedGroupId,
  nodeGroupMap,
  auditFocusNodeIds,
}: StyleEdgesOptions): Edge[] {
  if (auditFocusNodeIds && auditFocusNodeIds.size > 0) {
    return filteredEdges.map(edge => styleAuditEdge(edge, auditFocusNodeIds));
  }

  if (viewMode === 'map' && activeFlow) return styleFlowEdges(filteredEdges, activeFlow);
  if (focusedGroupId) {
    return filteredEdges.map(edge => styleFocusedGroupEdge(edge, nodeGroupMap, focusedGroupId));
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
  return filteredEdges.map(edge => styleSelectedEdge(edge, selectedNodeId, focusMode));
}

function styleAuditEdge(edge: Edge, auditFocusNodeIds: Set<string>): Edge {
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
      pointerEvents: (isFocused ? 'auto' : 'none') as CSSProperties['pointerEvents'],
      transition: 'opacity 200ms ease',
    },
  };
}

function styleFlowEdges(edges: Edge[], activeFlow: NavMapFlow): Edge[] {
  const flowEdgePairs = new Set<string>();
  for (let index = 0; index < activeFlow.steps.length - 1; index++) {
    flowEdgePairs.add(`${activeFlow.steps[index]}->${activeFlow.steps[index + 1]}`);
  }

  return edges.map(edge => {
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

function styleFocusedGroupEdge(
  edge: Edge,
  nodeGroupMap: Map<string, string>,
  focusedGroupId: string
): Edge {
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
      pointerEvents: (opacity > 0 ? 'auto' : 'none') as CSSProperties['pointerEvents'],
      transition: 'opacity 300ms ease',
    },
  };
}

function styleSelectedEdge(edge: Edge, selectedNodeId: string, focusMode: boolean): Edge {
  const isConnected = edge.source === selectedNodeId || edge.target === selectedNodeId;
  return {
    ...edge,
    style: {
      ...edge.style,
      opacity: isConnected ? 1 : focusMode ? 0 : 0.15,
      pointerEvents: (isConnected || !focusMode
        ? 'auto'
        : 'none') as CSSProperties['pointerEvents'],
      transition: 'opacity 0.2s',
    },
  };
}
