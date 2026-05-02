import type { CSSProperties } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { NavMapFlow } from '../types';
import type { StyleNodesOptions } from './graphStyling';

export function styleNodes({
  visibleNodes,
  filteredEdges,
  selectedNodeId,
  focusMode,
  viewMode,
  activeFlow,
  focusedGroupId,
  searchMatchIds,
  auditFocusNodeIds,
}: StyleNodesOptions): Node[] {
  if (searchMatchIds && searchMatchIds.size > 0) {
    return visibleNodes.map(node => styleSearchNode(node, searchMatchIds));
  }

  if (auditFocusNodeIds && auditFocusNodeIds.size > 0) {
    return visibleNodes.map(node => styleAuditNode(node, auditFocusNodeIds));
  }

  if (viewMode === 'map' && activeFlow) return styleFlowNodes(visibleNodes, activeFlow);
  if (focusedGroupId) return visibleNodes.map(node => styleFocusedGroupNode(node, focusedGroupId));
  if (!selectedNodeId || !focusMode) return visibleNodes;

  const connectedNodeIds = getConnectedNodeIds(selectedNodeId, filteredEdges);
  return visibleNodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      opacity: connectedNodeIds.has(node.id) ? 1 : 0.25,
      transition: 'opacity 0.2s',
    },
  }));
}

function styleSearchNode(node: Node, searchMatchIds: Set<string>): Node {
  const isMatch = searchMatchIds.has(node.id);
  return {
    ...node,
    style: {
      ...node.style,
      opacity: isMatch ? 1 : 0.12,
      transition: 'opacity 200ms ease',
      ...(isMatch
        ? { filter: 'drop-shadow(0 0 6px rgba(91,155,245,0.5))' }
        : { pointerEvents: 'none' as CSSProperties['pointerEvents'] }),
    },
  };
}

function styleAuditNode(node: Node, auditFocusNodeIds: Set<string>): Node {
  const isFocused = auditFocusNodeIds.has(node.id);
  return {
    ...node,
    style: {
      ...node.style,
      opacity: isFocused ? 1 : 0.18,
      pointerEvents: (isFocused ? 'auto' : 'none') as CSSProperties['pointerEvents'],
      transition: 'opacity 200ms ease',
      ...(isFocused ? { filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.55))' } : {}),
    },
  };
}

function styleFlowNodes(nodes: Node[], activeFlow: NavMapFlow): Node[] {
  const flowStepSet = new Set(activeFlow.steps);
  const flowStepMap = new Map(activeFlow.steps.map((id, index) => [id, index + 1]));
  return nodes.map(node => {
    const isFlowNode = flowStepSet.has(node.id);
    return {
      ...node,
      data: { ...node.data, ...(isFlowNode ? { flowStepNumber: flowStepMap.get(node.id) } : {}) },
      style: { ...node.style, opacity: isFlowNode ? 1 : 0.2, transition: 'opacity 0.2s' },
    };
  });
}

function styleFocusedGroupNode(node: Node, focusedGroupId: string): Node {
  if (node.type === 'groupNode') {
    const groupId = (node.data as Record<string, unknown>).groupId as string;
    return {
      ...node,
      style: {
        ...node.style,
        opacity: groupId === focusedGroupId ? 1 : 0.15,
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
      pointerEvents: (isFocused ? 'auto' : 'none') as CSSProperties['pointerEvents'],
      transition: 'opacity 300ms ease',
    },
  };
}

function getConnectedNodeIds(selectedNodeId: string, edges: Edge[]): Set<string> {
  const connectedNodeIds = new Set<string>([selectedNodeId]);
  for (const edge of edges) {
    if (edge.source === selectedNodeId) connectedNodeIds.add(edge.target);
    if (edge.target === selectedNodeId) connectedNodeIds.add(edge.source);
  }
  return connectedNodeIds;
}
