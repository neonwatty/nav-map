/* eslint-disable max-lines */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorInfo } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { NavMapGraph, ViewMode, EdgeMode, NavMapTheme } from '../types';
import type { GraphValidationError } from '../utils/validateGraph';
import { FlowAnimationOverlay } from './panels/FlowAnimationOverlay';
import { NavMapToolbar } from './panels/NavMapToolbar';
import { CoverageSummary } from './panels/CoverageSummary';
import type { AnalyticsAdapter } from '../analytics/types';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useGraphStyling } from '../hooks/useGraphStyling';
import { NavMapContext, useNavMapState } from '../hooks/useNavMap';
import { useUndoHistory } from '../hooks/useUndoHistory';
import { useViewModeLayout } from '../hooks/useViewModeLayout';
import { useNodeDragUndo } from '../hooks/useNodeDragUndo';
import { buildGraphFromJson } from '../utils/graphHelpers';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';
import { computeElkLayout } from '../layout/elkLayout';
import { computeBundledEdges } from '../layout/edgeBundling';
import { useWalkthrough } from '../hooks/useWalkthrough';
import { useSemanticZoom } from '../hooks/useSemanticZoom';
import { useResponsive } from '../hooks/useResponsive';
import { usePersistentState } from '../hooks/usePersistentState';
import { useNavMapAnalytics } from '../hooks/useNavMapAnalytics';
import { useNavMapContextMenu } from '../hooks/useNavMapContextMenu';
import { useNavMapDerivedGraph } from '../hooks/useNavMapDerivedGraph';
import { useNavMapGallery } from '../hooks/useNavMapGallery';
import { useNavMapGraphSource } from '../hooks/useNavMapGraphSource';
import { useNavMapHierarchy } from '../hooks/useNavMapHierarchy';
import { useNavMapInsights } from '../hooks/useNavMapInsights';
import { useNavMapNavigation } from '../hooks/useNavMapNavigation';
import { ConnectionPanel } from './panels/ConnectionPanel';
import { LegendPanel } from './panels/LegendPanel';
import { WalkthroughBar } from './panels/WalkthroughBar';
import { StatusBanners } from './panels/StatusBanners';
import { HierarchyControls } from './panels/HierarchyControls';
import { ContextMenu } from './panels/ContextMenu';
import { NavMapOverlays } from './panels/NavMapOverlays';
import { NavMapErrorBoundary } from './NavMapErrorBoundary';
import { ContainerWarning } from './ContainerWarning';
import { RouteHealthPanel } from './panels/RouteHealthPanel';
import { NavMapCanvas } from './NavMapCanvas';

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
  /** Callback fired when NavMap rendering fails and the fallback UI is shown */
  onRenderError?: (error: Error, info: ErrorInfo) => void;
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
  const graph = useNavMapGraphSource({ graph: graphProp, graphUrl, onValidationError });
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutDone, setLayoutDone] = useState(false);
  const [showSharedNav, setShowSharedNav] = usePersistentState('nav-map:show-shared-nav', false);
  const [focusMode, setFocusMode] = usePersistentState('nav-map:focus-mode', false);
  const [showRedirects, setShowRedirects] = usePersistentState('nav-map:show-redirects', false);
  const [viewMode, setViewMode] = usePersistentState<ViewMode>(
    'nav-map:view-mode',
    defaultViewMode
  );
  const [selectedFlowIndex, setSelectedFlowIndex] = useState<number | null>(null);
  const [treeRootId, setTreeRootId] = useState<string | null>(null);
  const [edgeMode, setEdgeMode] = usePersistentState<EdgeMode>(
    'nav-map:edge-mode',
    defaultEdgeMode
  );
  const [isAnimatingFlow, setIsAnimatingFlow] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { contextMenu, onNodeContextMenu, closeContextMenu } = useNavMapContextMenu();
  const [showRouteHealth, setShowRouteHealth] = usePersistentState(
    'nav-map:show-route-health',
    false
  );
  const {
    showCoverage,
    setShowCoverage,
    auditFocus,
    setAuditFocus,
    auditFocusNodeIds,
    handleAuditIssueFocus,
    hasCoverageData,
    searchMatchIds,
  } = useNavMapInsights({ graph, showSearch, searchQuery });
  const { showAnalytics, setShowAnalytics, analyticsData, analyticsPeriod, setAnalyticsPeriod } =
    useNavMapAnalytics(analyticsAdapter);
  const {
    galleryNodeId,
    galleryNodeIds,
    hoverPreview,
    onNodeMouseEnter,
    onNodeMouseLeave,
    openGalleryForNode,
    closeGallery,
  } = useNavMapGallery(graph);

  const baseEdgesRef = useRef<Edge[]>([]);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const guardedSetShowSearch = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      if (hideSearch) return;
      setShowSearch(v);
    },
    [hideSearch]
  );

  const guardedSetShowHelp = useCallback(
    (v: boolean | ((p: boolean) => boolean)) => {
      if (hideHelp) return;
      setShowHelp(v);
    },
    [hideHelp]
  );

  // Undo history for node drags and group collapse
  const { pushSnapshot, undo, canUndo } = useUndoHistory();

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
  const {
    focusedGroupId,
    setFocusedGroupId,
    collapsedGroups,
    setCollapsedGroups,
    hierarchyExpandedGroups,
    setHierarchyExpandedGroups,
    handleGroupToggleRef,
    handleGroupDoubleClickRef,
    handleHierarchyToggleRef,
    expandAllHierarchyGroups,
    collapseAllHierarchyGroups,
  } = useNavMapHierarchy({ graph, viewMode, zoomTier, nodes, fitView, pushSnapshot });

  // Convert graph to React Flow elements and compute layout
  useEffect(() => {
    if (!graph) return;

    // For non-map default views, just mark layoutDone so useViewModeLayout runs
    if (viewModeRef.current !== 'map') {
      setLayoutDone(true);
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
      setLayoutDone(true);
    });
  }, [graph, setNodes, setEdges, handleGroupToggleRef, handleGroupDoubleClickRef]);

  // Toggle shared nav edges
  useEffect(() => {
    if (!layoutDone) return;
    if (showSharedNav) {
      setEdges([...baseEdgesRef.current, ...sharedNavEdgesRef.current]);
    } else {
      setEdges(baseEdgesRef.current);
    }
  }, [showSharedNav, layoutDone, setEdges]);

  // Compute bundled edge paths when edge mode is 'bundled'
  useEffect(() => {
    if (!layoutDone || edgeMode !== 'bundled') return;
    const currentEdges = showSharedNav
      ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current]
      : baseEdgesRef.current;
    const results = computeBundledEdges(nodes, currentEdges);
    const pathMap = new Map(results.map(r => [r.edgeId, r.path]));
    setEdges(
      currentEdges.map(edge => {
        const bundledPath = pathMap.get(edge.id);
        if (!bundledPath) return edge;
        return { ...edge, data: { ...edge.data, bundledPath } };
      })
    );
  }, [edgeMode, layoutDone, nodes, showSharedNav, setEdges]);

  // Restore original edges when leaving bundled mode
  useEffect(() => {
    if (!layoutDone || edgeMode === 'bundled') return;
    setEdges(
      showSharedNav ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current] : baseEdgesRef.current
    );
  }, [edgeMode, layoutDone, showSharedNav, setEdges]);

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

  const { activeFlow, nodeGroupMap, zoomedNodes } = useNavMapDerivedGraph({
    graph,
    nodes,
    zoomTier,
    galleryNodeIds,
    selectedFlowIndex,
  });

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const { onSelectionChange, navigateToNode, navigateToNodeFromSearch } = useNavMapNavigation({
    ctx,
    walkthrough,
    nodes,
    viewMode,
    setTreeRootId,
    setCenter,
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
    setShowSharedNav,
    setFocusMode,
    setNodes,
    setEdges,
    fitView,
    setCenter,
    navigateToNode,
    baseEdgesRef,
    sharedNavEdgesRef,
    focusedGroupId,
    setFocusedGroupId,
    setShowRedirects,
    undo,
    canUndo,
    setCollapsedGroups,
    setHierarchyExpandedGroups,
  });

  const { onNodeDragStart, onNodeDragStop } = useNodeDragUndo({ nodesRef, pushSnapshot });

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
    auditFocusNodeIds,
  });

  // Double-click opens gallery if ANY flow has gallery data for this node
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // In hierarchy mode, toggle group expansion
      if (viewMode === 'hierarchy') {
        // Collapsed summary node (compact node with hier-group- prefix)
        if (node.id.startsWith('hier-group-')) {
          const groupId = node.id.replace('hier-group-', '');
          setHierarchyExpandedGroups(prev => {
            pushSnapshot({ type: 'hierarchy-toggle', expandedGroups: new Set(prev) });
            const next = new Set(prev);
            next.add(groupId);
            return next;
          });
          return;
        }
      }
      openGalleryForNode(node.id);
    },
    [viewMode, pushSnapshot, setHierarchyExpandedGroups, openGalleryForNode]
  );

  const selectedNode = graph?.nodes.find(n => n.id === ctx.selectedNodeId);

  const effectiveShowHelp = hideHelp ? false : showHelp;
  const effectiveShowSearch = hideSearch ? false : showSearch;

  return (
    <NavMapContext.Provider value={{ ...ctx, focusedGroupId, edgeMode, showCoverage }}>
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
              showRouteHealth={showRouteHealth}
              analyticsAdapter={analyticsAdapter}
              onViewModeChange={mode => {
                setViewMode(mode);
                if (mode !== 'flow') setSelectedFlowIndex(null);
                if (mode !== 'tree') setTreeRootId(null);
                if (mode === 'hierarchy' && graph) {
                  setHierarchyExpandedGroups(new Set(graph.groups.map(g => g.id)));
                }
              }}
              onFlowSelect={idx => {
                setSelectedFlowIndex(idx);
                setFocusedGroupId(null);
                setAuditFocus(null);
              }}
              onResetView={() => {
                setFocusedGroupId(null);
                fitView({ padding: 0.15, duration: 300 });
              }}
              onToggleSharedNav={() => setShowSharedNav(prev => !prev)}
              onToggleRedirects={() => setShowRedirects(prev => !prev)}
              onToggleFocusMode={() => setFocusMode(prev => !prev)}
              onEdgeModeChange={setEdgeMode}
              onAnimate={() => setIsAnimatingFlow(true)}
              onToggleAnalytics={() => setShowAnalytics(prev => !prev)}
              onToggleRouteHealth={() => setShowRouteHealth(prev => !prev)}
              onSearch={() => guardedSetShowSearch(true)}
              onHelp={() => guardedSetShowHelp(true)}
              showCoverage={showCoverage}
              hasCoverageData={hasCoverageData}
              onToggleCoverage={() => setShowCoverage(prev => !prev)}
            />
          )}

          <StatusBanners
            isDark={ctx.isDark}
            viewMode={viewMode}
            selectedFlowIndex={selectedFlowIndex}
            treeRootId={treeRootId}
            focusedGroupId={focusedGroupId}
            auditFocusLabel={auditFocus?.label ?? null}
            graph={graph}
            onClearFocus={() => setFocusedGroupId(null)}
            onClearAuditFocus={() => setAuditFocus(null)}
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
            <NavMapCanvas
              nodes={styledNodes}
              edges={styledEdges}
              isDark={ctx.isDark}
              isNarrow={isNarrow}
              getGroupColors={ctx.getGroupColors}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={onSelectionChange}
              onNodeDragStart={onNodeDragStart}
              onNodeDragStop={onNodeDragStop}
              onNodeContextMenu={onNodeContextMenu}
              onNodeMouseEnter={onNodeMouseEnter}
              onNodeMouseLeave={onNodeMouseLeave}
              onNodeDoubleClick={onNodeDoubleClick}
            />
          )}
          {graph && <LegendPanel groups={graph.groups} />}
          <CoverageSummary />

          {graph && showRouteHealth && (
            <RouteHealthPanel
              graph={graph}
              isDark={ctx.isDark}
              onClose={() => setShowRouteHealth(false)}
              onNavigate={navigateToNode}
              onIssueFocus={handleAuditIssueFocus}
            />
          )}

          {viewMode === 'hierarchy' && graph && (
            <HierarchyControls
              allGroupIds={graph.groups.map(g => g.id)}
              expandedGroups={hierarchyExpandedGroups}
              onExpandAll={expandAllHierarchyGroups}
              onCollapseAll={collapseAllHierarchyGroups}
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
            onAnimationEnd={() => setIsAnimatingFlow(false)}
            onStop={() => setIsAnimatingFlow(false)}
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
            onClose={closeContextMenu}
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
          onCloseAnalytics={() => setShowAnalytics(false)}
          onSearchSelect={nodeId => {
            setSearchQuery('');
            navigateToNodeFromSearch(nodeId);
          }}
          onSearchQueryChange={setSearchQuery}
          onPeriodChange={setAnalyticsPeriod}
          onCloseGallery={closeGallery}
        />
      </div>
    </NavMapContext.Provider>
  );
}

export function NavMap(props: NavMapProps) {
  return (
    <NavMapErrorBoundary onError={props.onRenderError}>
      <ContainerWarning>
        <ReactFlowProvider>
          <NavMapInner {...props} />
        </ReactFlowProvider>
      </ContainerWarning>
    </NavMapErrorBoundary>
  );
}
