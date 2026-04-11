/* eslint-disable max-lines, react-hooks/refs */
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { NavMapGraph, ViewMode, EdgeMode, NavMapTheme } from '../types';
import { rootReducer, initialRootState } from '../state/reducer';
import { useOverlaysActions } from '../state/slices/overlays';
import { useDisplayActions } from '../state/slices/display';
import { useFlowActions } from '../state/slices/flow';
import { useViewActions, createInitialViewState } from '../state/slices/view';
import { useGroupsActions } from '../state/slices/groups';
import { useGraphActions } from '../state/slices/graph';
import { useAnalyticsActions } from '../state/slices/analytics';
import type { GraphValidationError } from '../utils/validateGraph';
import { FlowAnimationOverlay } from './panels/FlowAnimationOverlay';
import { NavMapToolbar } from './panels/NavMapToolbar';
import type { AnalyticsAdapter } from '../analytics/types';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useGraphStyling } from '../hooks/useGraphStyling';
import { NavMapContext, useNavMapState } from '../hooks/useNavMap';
import { useUndoHistory } from '../hooks/useUndoHistory';
import { useViewModeLayout } from '../hooks/useViewModeLayout';
import type { HistoryEntry } from '../hooks/useUndoHistory';
import { buildGraphFromJson, type RFNodeData } from '../utils/graphHelpers';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';
import { computeElkLayout } from '../layout/elkLayout';
import { useWalkthrough } from '../hooks/useWalkthrough';
import { useSemanticZoom } from '../hooks/useSemanticZoom';
import { useResponsive } from '../hooks/useResponsive';
import { useGraphLoading } from '../effects/useGraphLoading';
import { useFocusEffects } from '../effects/useFocusEffects';
import { useAnalyticsFetch } from '../effects/useAnalyticsFetch';
import { useEdgeEffects } from '../effects/useEdgeEffects';
import { useZoomEffects } from '../effects/useZoomEffects';
import { PageNode } from './nodes/PageNode';
import { CompactNode } from './nodes/CompactNode';
import { GroupNode } from './nodes/GroupNode';
import { NavEdge } from './edges/NavEdge';
import { ConnectionPanel } from './panels/ConnectionPanel';
import { LegendPanel } from './panels/LegendPanel';
import { WalkthroughBar } from './panels/WalkthroughBar';
import { StatusBanners } from './panels/StatusBanners';
import { HierarchyControls } from './panels/HierarchyControls';
import { ContextMenu } from './panels/ContextMenu';
import { NavMapOverlays } from './panels/NavMapOverlays';
import { NavMapErrorBoundary } from './NavMapErrorBoundary';
import { ContainerWarning } from './ContainerWarning';

const nodeTypes = {
  pageNode: PageNode,
  compactNode: CompactNode,
  groupNode: GroupNode,
};

const edgeTypes = {
  navEdge: NavEdge,
};

export interface NavMapProps {
  /** Graph data object (pass this OR graphUrl) */
  graph?: NavMapGraph;
  /** URL to fetch graph JSON from */
  graphUrl?: string;
  /** Base path prepended to screenshot URLs */
  screenshotBasePath?: string;
  /** Analytics adapter for page view / transition data */
  analytics?: AnalyticsAdapter;
  /** Additional CSS class on the container */
  className?: string;
  /** Additional inline styles on the container */
  style?: React.CSSProperties;
  /** Initial view mode (default: 'hierarchy') */
  defaultViewMode?: ViewMode;
  /** Initial edge rendering mode (default: 'smooth') */
  defaultEdgeMode?: EdgeMode;
  /** Theme overrides for colors */
  theme?: NavMapTheme;
  /** Hide the top toolbar */
  hideToolbar?: boolean;
  /** Hide the search overlay (also disables Cmd+K shortcut) */
  hideSearch?: boolean;
  /** Hide the help overlay (also disables ? shortcut) */
  hideHelp?: boolean;
  /** Callback fired when graph validation fails */
  onValidationError?: (errors: GraphValidationError[]) => void;
}

function NavMapInner({
  graph: graphProp,
  graphUrl,
  screenshotBasePath = '',
  analytics: analyticsAdapter,
  className,
  style,
  defaultViewMode = 'hierarchy',
  defaultEdgeMode = 'smooth',
  theme,
  hideToolbar = false,
  hideSearch = false,
  hideHelp = false,
  onValidationError,
}: NavMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [state, dispatch] = useReducer(rootReducer, undefined, () => ({
    ...initialRootState,
    view: createInitialViewState(defaultViewMode, defaultEdgeMode),
    graph: { graph: graphProp ?? null, layoutDone: false },
  }));
  const overlays = useOverlaysActions(dispatch);
  const { showHelp, showSearch, searchQuery, showAnalytics, contextMenu, hoverPreview } =
    state.overlays;
  const display = useDisplayActions(dispatch);
  const { showSharedNav, focusMode, showRedirects } = state.display;
  const flow = useFlowActions(dispatch);
  const { selectedFlowIndex, isAnimatingFlow, galleryNodeId } = state.flow;
  const view = useViewActions(dispatch);
  const { viewMode, edgeMode, treeRootId } = state.view;
  const groups = useGroupsActions(dispatch);
  const { focusedGroupId, collapsedGroups, hierarchyExpandedGroups } = state.groups;
  const graphActions = useGraphActions(dispatch);
  const { graph, layoutDone } = state.graph;
  const analyticsActions = useAnalyticsActions(dispatch);
  const { data: analyticsData, period: analyticsPeriod } = state.analytics;

  const baseEdgesRef = useRef<Edge[]>([]);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const guardedSetShowSearch = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      if (hideSearch) return;
      const next = typeof v === 'function' ? v(showSearch) : v;
      if (next) overlays.openSearch();
      else overlays.closeSearch();
    },
    [hideSearch, overlays, showSearch]
  );

  const guardedSetShowHelp = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      if (hideHelp) return;
      const next = typeof v === 'function' ? v(showHelp) : v;
      if (next) overlays.openHelp();
      else overlays.closeHelp();
    },
    [hideHelp, overlays, showHelp]
  );

  const toggleableSetShowSharedNav = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(showSharedNav) : v;
      if (next) display.showSharedNav();
      else display.hideSharedNav();
    },
    [display, showSharedNav]
  );

  const toggleableSetFocusMode = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(focusMode) : v;
      if (next) display.enableFocusMode();
      else display.disableFocusMode();
    },
    [display, focusMode]
  );

  const toggleableSetShowRedirects = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(showRedirects) : v;
      if (next) display.showRedirects();
      else display.hideRedirects();
    },
    [display, showRedirects]
  );

  // Undo history for node drags and group collapse
  const { pushSnapshot, undo, canUndo } = useUndoHistory();
  const beforeDragRef = useRef<HistoryEntry | null>(null);

  // Refs to read current state inside stable callbacks (for undo snapshots)
  const collapsedGroupsRef = useRef(collapsedGroups);
  collapsedGroupsRef.current = collapsedGroups;
  const hierarchyExpandedGroupsRef = useRef(hierarchyExpandedGroups);
  hierarchyExpandedGroupsRef.current = hierarchyExpandedGroups;

  // Stable callbacks for GroupNode onToggle/onDoubleClick (passed via useViewModeLayout)
  const handleGroupToggleRef = useRef((groupId: string, collapsed: boolean) => {
    pushSnapshot({ type: 'collapse', collapsedGroups: new Set(collapsedGroupsRef.current) });
    if (collapsed) groups.collapseGroup(groupId);
    else groups.expandGroup(groupId);
    if (collapsed) groups.clearFocusIfMatch(groupId);
  });
  const handleGroupDoubleClickRef = useRef((groupId: string) => {
    groups.toggleFocusedGroup(groupId);
  });
  const handleHierarchyToggleRef = useRef((groupId: string) => {
    pushSnapshot({
      type: 'hierarchy-toggle',
      expandedGroups: new Set(hierarchyExpandedGroupsRef.current),
    });
    groups.toggleHierarchyGroup(groupId);
  });
  const sharedNavEdgesRef = useRef<Edge[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const ctx = useNavMapState(graph, screenshotBasePath, theme);
  const walkthrough = useWalkthrough();
  const { zoomTier } = useSemanticZoom();
  const { isNarrow } = useResponsive();
  const viewportX = useStore(s => s.transform[0]);
  const viewportY = useStore(s => s.transform[1]);
  const viewportZoom = useStore(s => s.transform[2]);
  const viewport = { x: viewportX, y: viewportY, zoom: viewportZoom };
  const { fitView, setCenter } = useReactFlow();

  // Effect hooks: graph loading, focus, analytics
  useGraphLoading({
    graphProp,
    graphUrl,
    viewMode,
    hierarchyExpandedGroups,
    onValidationError,
    setGraph: graphActions.setGraph,
    setHierarchyExpanded: groups.setHierarchyExpanded,
  });

  useFocusEffects({ focusedGroupId, nodes, fitView });

  useAnalyticsFetch({
    analyticsAdapter,
    showAnalytics,
    analyticsPeriod,
    setData: analyticsActions.setData,
  });

  // Convert graph to React Flow elements and compute layout
  useEffect(() => {
    if (!graph) return;

    // For non-map default views, just mark layoutDone so useViewModeLayout runs
    if (viewModeRef.current !== 'map') {
      graphActions.setLayoutDone(true);
      return;
    }

    const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);

    // Inject onToggle and onDoubleClick into group nodes
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
      graphActions.setLayoutDone(true);
    });
  }, [graph, setNodes, setEdges, graphActions]);

  // Edge effects: shared nav toggle, bundled edges, mode restore
  useEdgeEffects({
    layoutDone,
    showSharedNav,
    edgeMode,
    nodes,
    setEdges,
    baseEdgesRef,
    sharedNavEdgesRef,
  });

  // Re-layout when view mode changes (extracted to hook)
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

  // Zoom effects: auto-collapse/expand hierarchy on zoom tier change
  useZoomEffects({
    zoomTier,
    viewMode,
    graph,
    clearHierarchyExpanded: groups.clearHierarchyExpanded,
    setHierarchyExpanded: groups.setHierarchyExpanded,
  });

  // Identify nodes that have gallery data from any flow
  const galleryNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const flow of graph?.flows ?? []) {
      for (const nodeId of Object.keys(flow.gallery ?? {})) {
        if ((flow.gallery?.[nodeId]?.length ?? 0) > 0) ids.add(nodeId);
      }
    }
    return ids;
  }, [graph]);

  // Map node IDs to their group for edge dimming in group focus mode
  const nodeGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of graph?.nodes ?? []) {
      map.set(node.id, node.group);
    }
    return map;
  }, [graph]);

  // Semantic zoom: 3 tiers based on zoom level
  const zoomedNodes = useMemo(() => {
    const addGalleryFlag = (node: Node) => {
      if (node.type === 'groupNode') return node;
      const hasGallery = galleryNodeIds.has(node.id);
      if (!hasGallery) return node;
      return { ...node, data: { ...node.data, hasGallery: true } };
    };

    if (zoomTier === 'overview') {
      return nodes.map(node => {
        if (node.type === 'groupNode') return node;
        return {
          ...node,
          type: 'compactNode',
          style: { ...node.style, opacity: 0, pointerEvents: 'none' as const },
        };
      });
    }

    if (zoomTier === 'detail') return nodes.map(addGalleryFlag);

    return nodes.map(node => {
      if (node.type === 'groupNode') return node;
      const withGallery = addGalleryFlag(node);
      return { ...withGallery, type: 'compactNode' };
    });
  }, [nodes, zoomTier, galleryNodeIds]);

  // Use refs to avoid stale closures in callbacks
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const walkthroughRef = useRef(walkthrough);
  walkthroughRef.current = walkthrough;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

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
    [view]
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

  // Keyboard navigation (extracted to hook)
  useKeyboardNav({
    ctx,
    graph,
    walkthrough,
    nodes,
    showSearch,
    showHelp,
    showSharedNav,
    focusMode,
    setShowSearch: guardedSetShowSearch,
    setShowHelp: guardedSetShowHelp,
    setShowSharedNav: toggleableSetShowSharedNav,
    setFocusMode: toggleableSetFocusMode,
    setNodes,
    setEdges,
    fitView,
    setCenter,
    navigateToNode,
    baseEdgesRef,
    sharedNavEdgesRef,
    focusedGroupId,
    groups,
    setShowRedirects: toggleableSetShowRedirects,
    undo,
    canUndo,
  });

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

  // Track mouse position for hover preview
  const hasHoverPreview = hoverPreview !== null;
  useEffect(() => {
    if (!hasHoverPreview) return;
    const handler = (e: MouseEvent) => {
      overlays.updateHoverPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [hasHoverPreview, overlays]);

  // Graph styling (extracted to hook)
  const activeFlow = useMemo(() => {
    if (selectedFlowIndex === null || !graph?.flows) return null;
    return graph.flows[selectedFlowIndex] ?? null;
  }, [selectedFlowIndex, graph]);

  // Compute search match IDs for canvas highlighting
  const searchMatchIds = useMemo(() => {
    if (!showSearch || !searchQuery.trim() || !graph) return null;
    const q = searchQuery.toLowerCase().trim();
    const ids = new Set<string>();
    for (const n of graph.nodes) {
      if (
        n.label.toLowerCase().includes(q) ||
        n.route.toLowerCase().includes(q) ||
        n.group.toLowerCase().includes(q)
      ) {
        ids.add(n.id);
      }
    }
    return ids.size > 0 ? ids : null;
  }, [showSearch, searchQuery, graph]);

  const { styledNodes, styledEdges } = useGraphStyling({
    nodes,
    edges,
    zoomedNodes,
    collapsedGroups,
    selectedNodeId: ctx.selectedNodeId,
    focusMode,
    viewMode,
    activeFlow,
    focusedGroupId,
    nodeGroupMap,
    showRedirects,
    searchMatchIds,
  });

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

  const selectedNode = graph?.nodes.find(n => n.id === ctx.selectedNodeId);

  const effectiveShowHelp = hideHelp ? false : showHelp;
  const effectiveShowSearch = hideSearch ? false : showSearch;

  return (
    <NavMapContext.Provider value={{ ...ctx, focusedGroupId, edgeMode }}>
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          background: ctx.isDark
            ? (theme?.dark?.background ?? '#0a0a0f')
            : (theme?.light?.background ?? '#f4f5f8'),
          color: ctx.isDark ? (theme?.dark?.text ?? '#c8c8d0') : (theme?.light?.text ?? '#333'),
          ...style,
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Toolbar */}
          {!hideToolbar && (
            <NavMapToolbar
              graph={graph}
              viewMode={viewMode}
              selectedFlowIndex={selectedFlowIndex}
              showSharedNav={showSharedNav}
              showRedirects={showRedirects}
              focusMode={focusMode}
              edgeMode={edgeMode}
              isAnimatingFlow={isAnimatingFlow}
              showAnalytics={showAnalytics}
              analyticsAdapter={analyticsAdapter}
              onViewModeChange={mode => {
                view.setViewMode(mode);
                if (mode !== 'flow') flow.clearFlow();
                if (mode !== 'tree') view.setTreeRootId(null);
                if (mode === 'hierarchy' && graph) {
                  groups.setHierarchyExpanded(new Set(graph.groups.map(g => g.id)));
                }
              }}
              onFlowSelect={idx => {
                if (idx === null) flow.clearFlow();
                else flow.selectFlow(idx);
                groups.setFocusedGroup(null);
              }}
              onResetView={() => {
                groups.setFocusedGroup(null);
                fitView({ padding: 0.15, duration: 300 });
              }}
              onToggleSharedNav={() => display.toggleSharedNav()}
              onToggleRedirects={() => display.toggleRedirects()}
              onToggleFocusMode={() => display.toggleFocusMode()}
              onEdgeModeChange={view.setEdgeMode}
              onAnimate={() => flow.startAnimation()}
              onToggleAnalytics={() => {
                if (showAnalytics) overlays.closeAnalytics();
                else overlays.openAnalytics();
              }}
              onSearch={() => guardedSetShowSearch(true)}
              onHelp={() => guardedSetShowHelp(true)}
            />
          )}

          <StatusBanners
            isDark={ctx.isDark}
            viewMode={viewMode}
            selectedFlowIndex={selectedFlowIndex}
            treeRootId={treeRootId}
            focusedGroupId={focusedGroupId}
            graph={graph}
            onClearFocus={() => groups.setFocusedGroup(null)}
          />

          {/* Walkthrough breadcrumb */}
          {graph && (
            <WalkthroughBar
              path={walkthrough.path}
              nodes={graph.nodes}
              onGoTo={index => {
                walkthrough.goTo(index);
                const nodeId = walkthrough.path[index];
                if (nodeId) navigateToNode(nodeId);
              }}
              onPresent={() => walkthrough.setMode('presentation')}
              onClear={() => {
                walkthrough.clear();
                ctx.setSelectedNodeId(null);
              }}
            />
          )}

          {layoutDone && (
            <ReactFlow
              nodes={styledNodes}
              edges={styledEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={onSelectionChange}
              onNodeDragStart={onNodeDragStart}
              onNodeDragStop={onNodeDragStop}
              onNodeContextMenu={onNodeContextMenu}
              onNodeMouseEnter={onNodeMouseEnter}
              onNodeMouseLeave={onNodeMouseLeave}
              onNodeDoubleClick={onNodeDoubleClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              defaultEdgeOptions={{ type: 'navEdge', animated: false }}
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color={ctx.isDark ? '#1a1a28' : '#ddd'}
              />
              <Controls
                showInteractive={false}
                style={{
                  background: ctx.isDark ? '#14141e' : '#fff',
                  border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#d0d0d8'}`,
                  borderRadius: 8,
                }}
              />
              {!isNarrow && (
                <MiniMap
                  nodeStrokeWidth={3}
                  nodeColor={node => {
                    const nodeData = node.data as { group?: string } | undefined;
                    const colors = ctx.getGroupColors(nodeData?.group ?? '');
                    return colors.border;
                  }}
                  style={{
                    background: ctx.isDark ? '#14141e' : '#fff',
                    border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#d0d0d8'}`,
                    borderRadius: 8,
                  }}
                />
              )}
            </ReactFlow>
          )}
          {graph && <LegendPanel groups={graph.groups} />}

          {viewMode === 'hierarchy' && graph && (
            <HierarchyControls
              allGroupIds={graph.groups.map(g => g.id)}
              expandedGroups={hierarchyExpandedGroups}
              onExpandAll={() => {
                pushSnapshot({
                  type: 'hierarchy-toggle',
                  expandedGroups: new Set(hierarchyExpandedGroups),
                });
                groups.setHierarchyExpanded(new Set(graph.groups.map(g => g.id)));
              }}
              onCollapseAll={() => {
                pushSnapshot({
                  type: 'hierarchy-toggle',
                  expandedGroups: new Set(hierarchyExpandedGroups),
                });
                groups.clearHierarchyExpanded();
              }}
            />
          )}

          <FlowAnimationOverlay
            isDark={ctx.isDark}
            isAnimatingFlow={isAnimatingFlow}
            selectedFlowIndex={selectedFlowIndex}
            graph={graph}
            layoutDone={layoutDone}
            nodes={nodes}
            viewport={viewport}
            onAnimationEnd={() => flow.stopAnimation()}
            onStop={() => flow.stopAnimation()}
          />
        </div>

        {selectedNode && graph && (
          <ConnectionPanel
            node={selectedNode}
            edges={graph.edges}
            nodes={graph.nodes}
            onNavigate={navigateToNode}
            isNarrow={isNarrow}
          />
        )}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            route={contextMenu.route}
            filePath={contextMenu.filePath}
            baseUrl={graph?.meta.baseUrl}
            onClose={() => overlays.hideContextMenu()}
          />
        )}

        <NavMapOverlays
          graph={graph}
          isDark={ctx.isDark}
          showHelp={effectiveShowHelp}
          showSearch={effectiveShowSearch}
          showAnalytics={showAnalytics}
          hoverPreview={hoverPreview}
          analyticsData={analyticsData}
          analyticsPeriod={analyticsPeriod}
          walkthrough={walkthrough}
          galleryNodeId={galleryNodeId}
          screenshotBasePath={screenshotBasePath}
          onCloseHelp={() => guardedSetShowHelp(false)}
          onCloseSearch={() => guardedSetShowSearch(false)}
          onCloseAnalytics={() => overlays.closeAnalytics()}
          onSearchSelect={nodeId => {
            overlays.setSearchQuery('');
            navigateToNodeFromSearch(nodeId);
          }}
          onSearchQueryChange={overlays.setSearchQuery}
          onPeriodChange={analyticsActions.setPeriod}
          onCloseGallery={() => flow.closeGallery()}
        />
      </div>
    </NavMapContext.Provider>
  );
}

export function NavMap(props: NavMapProps) {
  return (
    <NavMapErrorBoundary>
      <ContainerWarning>
        <ReactFlowProvider>
          <NavMapInner {...props} />
        </ReactFlowProvider>
      </ContainerWarning>
    </NavMapErrorBoundary>
  );
}
