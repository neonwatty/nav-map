import { useEffect, type RefObject } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NavMapGraph, ViewMode } from '../types';
import { computeElkLayout } from '../layout/elkLayout';
import { applyLayoutResult, applyMapLayoutResult } from './useViewModeLayoutApply';
import {
  buildFlowLayoutInput,
  buildHierarchyLayoutInput,
  buildMapLayoutInput,
  buildTreeLayoutInput,
} from './useViewModeLayoutBuilders';

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
      const layoutInput = buildFlowLayoutInput(graph, selectedFlowIndex);
      if (!layoutInput) return;

      computeElkLayout(layoutInput.nodes, layoutInput.edges, {
        direction: 'RIGHT',
        spacing: 120,
      }).then(({ nodes: ln, edges: le }) => {
        applyLayoutResult(ln, le, {
          setNodes,
          setEdges,
          baseEdgesRef,
          fitView,
          fitViewPadding: 0.2,
        });
      });
    } else if (viewMode === 'tree' && treeRootId) {
      const layoutInput = buildTreeLayoutInput(graph, treeRootId);

      computeElkLayout(layoutInput.nodes, layoutInput.edges, {
        direction: 'RIGHT',
        spacing: 100,
      }).then(({ nodes: ln, edges: le }) => {
        applyLayoutResult([...ln, ...layoutInput.nonReachableNodes], le, {
          setNodes,
          setEdges,
          baseEdgesRef,
          fitView,
          fitViewPadding: 0.2,
        });
      });
    } else if (viewMode === 'hierarchy') {
      const layoutInput = buildHierarchyLayoutInput(graph, {
        expandedGroups: hierarchyExpandedGroups,
        onGroupToggle: handleGroupToggleRef.current,
        onHierarchyToggle: handleHierarchyToggleRef.current,
      });

      computeElkLayout(layoutInput.nodes, layoutInput.edges, {
        direction: 'DOWN',
        spacing: 80,
      }).then(({ nodes: ln, edges: le }) => {
        applyLayoutResult(ln, le, {
          setNodes,
          setEdges,
          baseEdgesRef,
          fitView,
          fitViewPadding: 0.2,
        });
      });
    } else if (viewMode === 'map') {
      const layoutInput = buildMapLayoutInput(graph, {
        onGroupToggle: handleGroupToggleRef.current,
        onGroupDoubleClick: handleGroupDoubleClickRef.current,
      });

      computeElkLayout(layoutInput.nodes, layoutInput.edges).then(({ nodes: ln, edges: le }) => {
        applyMapLayoutResult(ln, le, {
          graph,
          setNodes,
          setEdges,
          baseEdgesRef,
          sharedNavEdgesRef,
          fitView,
          fitViewPadding: 0.15,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedFlowIndex, treeRootId, hierarchyExpandedGroups]);
}
