import type { Edge, Node } from '@xyflow/react';
import type { NavMapFlow, ViewMode } from '../types';

export interface StyleNodesOptions {
  visibleNodes: Node[];
  filteredEdges: Edge[];
  selectedNodeId: string | null;
  focusMode: boolean;
  viewMode: ViewMode;
  activeFlow: NavMapFlow | null;
  focusedGroupId: string | null;
  searchMatchIds: Set<string> | null;
  auditFocusNodeIds: Set<string> | null;
}

export interface StyleEdgesOptions {
  filteredEdges: Edge[];
  selectedNodeId: string | null;
  focusMode: boolean;
  viewMode: ViewMode;
  activeFlow: NavMapFlow | null;
  focusedGroupId: string | null;
  nodeGroupMap: Map<string, string>;
  auditFocusNodeIds: Set<string> | null;
}

export { filterRedirectEdges, getVisibleEdges, getVisibleNodes } from './graphStylingVisibility';
export { styleEdges } from './graphEdgeStyling';
export { styleNodes } from './graphNodeStyling';
