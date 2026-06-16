import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NavMapFlow, ViewMode } from '../types';
import {
  filterRedirectEdges,
  getVisibleEdges,
  getVisibleNodes,
  styleEdges,
  styleNodes,
} from '../utils/graphStyling';

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
  workflowFocusNodeIds?: Set<string> | null;
  workflowFocusEdgeIds?: Set<string> | null;
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
    workflowFocusNodeIds = null,
    workflowFocusEdgeIds = null,
  } = deps;

  const visibleNodes = useMemo(() => {
    return getVisibleNodes(zoomedNodes, collapsedGroups);
  }, [zoomedNodes, collapsedGroups]);

  const visibleEdges = useMemo(() => {
    return getVisibleEdges(edges, nodes, collapsedGroups);
  }, [edges, nodes, collapsedGroups]);

  const filteredEdges = useMemo(() => {
    return filterRedirectEdges(visibleEdges, showRedirects);
  }, [visibleEdges, showRedirects]);

  const styledNodes = useMemo(() => {
    return styleNodes({
      visibleNodes,
      filteredEdges,
      selectedNodeId,
      focusMode,
      viewMode,
      activeFlow,
      focusedGroupId,
      searchMatchIds,
      auditFocusNodeIds,
      workflowFocusNodeIds,
    });
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
    workflowFocusNodeIds,
  ]);

  const styledEdges = useMemo(() => {
    return styleEdges({
      filteredEdges,
      selectedNodeId,
      focusMode,
      viewMode,
      activeFlow,
      focusedGroupId,
      nodeGroupMap,
      auditFocusNodeIds,
      searchMatchIds,
      workflowFocusEdgeIds,
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
    searchMatchIds,
    workflowFocusEdgeIds,
  ]);

  return { styledNodes, styledEdges };
}
