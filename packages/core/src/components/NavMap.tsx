/* eslint-disable max-lines, react-hooks/refs */
// max-lines: orchestration layer wiring 7 slices, 6 effect hooks, ~15 panels.
// react-hooks/refs: render-time ref syncs for useViewModeLayout compatibility.
import { useEffect, useReducer, useRef } from 'react';
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
import { useSetterWrappers } from '../hooks/useSetterWrappers';
import { useNavMapMemos } from '../hooks/useNavMapMemos';
import { useNavMapHandlers } from '../hooks/useNavMapHandlers';
import { useGraphStyling } from '../hooks/useGraphStyling';
import { NavMapContext, useNavMapState } from '../hooks/useNavMap';
import { useUndoHistory } from '../hooks/useUndoHistory';
import { useViewModeLayout } from '../hooks/useViewModeLayout';
import { useWalkthrough } from '../hooks/useWalkthrough';
import { useSemanticZoom } from '../hooks/useSemanticZoom';
import { useResponsive } from '../hooks/useResponsive';
import { useGraphLoading } from '../effects/useGraphLoading';
import { useFocusEffects } from '../effects/useFocusEffects';
import { useAnalyticsFetch } from '../effects/useAnalyticsFetch';
import { useEdgeEffects } from '../effects/useEdgeEffects';
import { useZoomEffects } from '../effects/useZoomEffects';
import { useLayoutEffects } from '../effects/useLayoutEffects';
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

  const {
    guardedSetShowSearch,
    guardedSetShowHelp,
    toggleableSetShowSharedNav,
    toggleableSetFocusMode,
    toggleableSetShowRedirects,
  } = useSetterWrappers({
    hideSearch,
    hideHelp,
    showSearch,
    showHelp,
    showSharedNav,
    focusMode,
    showRedirects,
    overlays,
    display,
  });

  // Undo history for node drags and group collapse
  const { pushSnapshot, undo, canUndo } = useUndoHistory();
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
  useLayoutEffects({
    graph,
    viewModeRef,
    setNodes,
    setEdges,
    baseEdgesRef,
    sharedNavEdgesRef,
    handleGroupToggleRef,
    handleGroupDoubleClickRef,
    graphActions,
  });

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

  const { nodeGroupMap, zoomedNodes, activeFlow, searchMatchIds } = useNavMapMemos({
    graph,
    selectedFlowIndex,
    showSearch,
    searchQuery,
    zoomTier,
    nodes,
  });

  const {
    onSelectionChange,
    navigateToNode,
    navigateToNodeFromSearch,
    onNodeMouseEnter,
    onNodeMouseLeave,
    onNodeDragStart,
    onNodeDragStop,
    onNodeContextMenu,
    onNodeDoubleClick,
  } = useNavMapHandlers({
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
  });

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
