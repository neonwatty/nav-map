/* eslint-disable react-hooks/refs */
import { useCallback, useRef, type RefObject } from 'react';
import type { Node } from '@xyflow/react';
import type { OnSelectionChangeParams } from '@xyflow/react';
import type { NavMapGraph, ViewMode } from '../types';
import type { useOverlaysActions } from '../state/slices/overlays';
import type { useFlowActions } from '../state/slices/flow';
import type { useViewActions } from '../state/slices/view';
import type { useGroupsActions } from '../state/slices/groups';
import type { HistoryEntry } from './useUndoHistory';
import type { RFNodeData } from '../utils/graphHelpers';
import type { useNavMapState } from './useNavMap';
import type { useWalkthrough } from './useWalkthrough';

export interface NavMapHandlersDeps {
  ctx: ReturnType<typeof useNavMapState>;
  walkthrough: ReturnType<typeof useWalkthrough>;
  nodes: Node[];
  graph: NavMapGraph | null;
  viewMode: ViewMode;
  viewModeRef: RefObject<ViewMode>;
  hierarchyExpandedGroups: Set<string>;
  setCenter: (x: number, y: number, opts: { zoom: number; duration: number }) => void;
  pushSnapshot: (entry: HistoryEntry) => void;
  overlays: ReturnType<typeof useOverlaysActions>;
  flow: ReturnType<typeof useFlowActions>;
  view: ReturnType<typeof useViewActions>;
  groups: ReturnType<typeof useGroupsActions>;
}

/**
 * Event handler callbacks extracted from NavMap.
 *
 * Uses internal refs for `ctx`, `walkthrough`, `nodes`, and `beforeDragRef`
 * so the callbacks remain stable while reading the latest values.
 */
export function useNavMapHandlers(deps: NavMapHandlersDeps) {
  const {
    ctx,
    walkthrough,
    nodes,
    graph,
    viewMode,
    viewModeRef,
    hierarchyExpandedGroups,
    setCenter,
    pushSnapshot,
    overlays,
    flow,
    view,
    groups,
  } = deps;

  // Refs to avoid stale closures in callbacks
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const walkthroughRef = useRef(walkthrough);
  walkthroughRef.current = walkthrough;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const beforeDragRef = useRef<HistoryEntry | null>(null);

  // Handle node selection (from React Flow click)
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const selected = selectedNodes[0];
      if (selected) {
        ctxRef.current.setSelectedNodeId(selected.id);
        walkthroughRef.current.push(selected.id);
        if (viewModeRef.current === 'tree') {
          view.setTreeRootId(selected.id);
        }
      }
    },
    [view, viewModeRef]
  );

  // Navigate to a node programmatically
  const navigateToNode = useCallback(
    (nodeId: string) => {
      ctxRef.current.setSelectedNodeId(nodeId);
      walkthroughRef.current.push(nodeId);

      const node = nodesRef.current.find(n => n.id === nodeId);
      if (node) {
        setCenter(node.position.x + 90, node.position.y + 70, {
          zoom: 0.8,
          duration: 300,
        });
      }
    },
    [setCenter]
  );

  // Search navigation: longer flight with closer zoom
  const navigateToNodeFromSearch = useCallback(
    (nodeId: string) => {
      ctxRef.current.setSelectedNodeId(nodeId);
      walkthroughRef.current.push(nodeId);
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (node) {
        setCenter(node.position.x + 90, node.position.y + 70, {
          zoom: 1.0,
          duration: 600,
        });
      }
    },
    [setCenter]
  );

  // Node hover for preview
  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as RFNodeData;
      if (data.screenshot) {
        overlays.showHoverPreview({
          screenshot: data.screenshot,
          label: data.label,
          position: null,
        });
      }
    },
    [overlays]
  );

  const onNodeMouseLeave = useCallback(() => {
    overlays.hideHoverPreview();
  }, [overlays]);

  // Capture node positions before drag for undo
  const onNodeDragStart = useCallback(() => {
    beforeDragRef.current = {
      type: 'node-drag',
      nodePositions: nodesRef.current.map(n => ({
        id: n.id,
        position: { ...n.position },
        parentId: n.parentId,
      })),
    };
  }, []);

  const onNodeDragStop = useCallback(() => {
    if (beforeDragRef.current) {
      pushSnapshot(beforeDragRef.current);
      beforeDragRef.current = null;
    }
  }, [pushSnapshot]);

  // Right-click context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const data = node.data as Record<string, unknown>;
      overlays.showContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        route: (data.route as string) ?? '',
        filePath: data.filePath as string | undefined,
      });
    },
    [overlays]
  );

  // Double-click opens gallery if ANY flow has gallery data for this node
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (viewMode === 'hierarchy') {
        if (node.id.startsWith('hier-group-')) {
          const groupId = node.id.replace('hier-group-', '');
          pushSnapshot({
            type: 'hierarchy-toggle',
            expandedGroups: new Set(hierarchyExpandedGroups),
          });
          groups.toggleHierarchyGroup(groupId);
          return;
        }
      }
      const hasGallery = graph?.flows?.some(f => f.gallery?.[node.id]?.length);
      if (hasGallery) {
        flow.openGallery(node.id);
      }
    },
    [graph, viewMode, pushSnapshot, flow, hierarchyExpandedGroups, groups]
  );

  return {
    onSelectionChange,
    navigateToNode,
    navigateToNodeFromSearch,
    onNodeMouseEnter,
    onNodeMouseLeave,
    onNodeDragStart,
    onNodeDragStop,
    onNodeContextMenu,
    onNodeDoubleClick,
  };
}
