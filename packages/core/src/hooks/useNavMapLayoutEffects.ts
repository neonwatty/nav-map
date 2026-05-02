import { useEffect, type RefObject } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { EdgeMode, NavMapGraph, ViewMode } from '../types';
import { computeBundledEdges } from '../layout/edgeBundling';
import { computeElkLayout } from '../layout/elkLayout';
import { buildGraphFromJson } from '../utils/graphHelpers';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';
import { useViewModeLayout } from './useViewModeLayout';

interface UseNavMapLayoutEffectsOptions {
  graph: NavMapGraph | null;
  layoutDone: boolean;
  setLayoutDone: (done: boolean) => void;
  viewMode: ViewMode;
  viewModeRef: RefObject<ViewMode>;
  selectedFlowIndex: number | null;
  treeRootId: string | null;
  edgeMode: EdgeMode;
  showSharedNav: boolean;
  nodes: Node[];
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

export function useNavMapLayoutEffects({
  graph,
  layoutDone,
  setLayoutDone,
  viewMode,
  viewModeRef,
  selectedFlowIndex,
  treeRootId,
  edgeMode,
  showSharedNav,
  nodes,
  setNodes,
  setEdges,
  fitView,
  baseEdgesRef,
  sharedNavEdgesRef,
  handleGroupToggleRef,
  handleGroupDoubleClickRef,
  hierarchyExpandedGroups,
  handleHierarchyToggleRef,
}: UseNavMapLayoutEffectsOptions): void {
  useEffect(() => {
    if (!graph) return;

    if (viewModeRef.current !== 'map') {
      setLayoutDone(true);
      return;
    }

    const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);

    for (const node of rfNodes) {
      if (node.type === 'groupNode') {
        (node.data as Record<string, unknown>).onToggle = handleGroupToggleRef.current;
        (node.data as Record<string, unknown>).onDoubleClick = handleGroupDoubleClickRef.current;
      }
    }

    computeElkLayout(rfNodes, rfEdges).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      baseEdgesRef.current = layoutedEdges;
      sharedNavEdgesRef.current = buildSharedNavEdges(graph);
      setLayoutDone(true);
    });
  }, [
    graph,
    setLayoutDone,
    setNodes,
    setEdges,
    viewModeRef,
    baseEdgesRef,
    sharedNavEdgesRef,
    handleGroupToggleRef,
    handleGroupDoubleClickRef,
  ]);

  useEffect(() => {
    if (!layoutDone) return;
    if (showSharedNav) {
      setEdges([...baseEdgesRef.current, ...sharedNavEdgesRef.current]);
    } else {
      setEdges(baseEdgesRef.current);
    }
  }, [showSharedNav, layoutDone, setEdges, baseEdgesRef, sharedNavEdgesRef]);

  useEffect(() => {
    if (!layoutDone || edgeMode !== 'bundled') return;
    const currentEdges = showSharedNav
      ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current]
      : baseEdgesRef.current;
    const results = computeBundledEdges(nodes, currentEdges);
    const pathMap = new Map(results.map(result => [result.edgeId, result.path]));
    setEdges(
      currentEdges.map(edge => {
        const bundledPath = pathMap.get(edge.id);
        if (!bundledPath) return edge;
        return { ...edge, data: { ...edge.data, bundledPath } };
      })
    );
  }, [edgeMode, layoutDone, nodes, showSharedNav, setEdges, baseEdgesRef, sharedNavEdgesRef]);

  useEffect(() => {
    if (!layoutDone || edgeMode === 'bundled') return;
    setEdges(
      showSharedNav ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current] : baseEdgesRef.current
    );
  }, [edgeMode, layoutDone, showSharedNav, setEdges, baseEdgesRef, sharedNavEdgesRef]);

  useViewModeLayout({
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
  });
}
