/* eslint-disable max-lines */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { validateGraph, type GraphValidationError } from '../utils/validateGraph';
import { FlowAnimationOverlay } from './panels/FlowAnimationOverlay';
import { NavMapToolbar } from './panels/NavMapToolbar';
import { CoverageSummary } from './panels/CoverageSummary';
import type { AnalyticsAdapter, NavMapAnalytics } from '../analytics/types';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useGraphStyling } from '../hooks/useGraphStyling';
import { NavMapContext, useNavMapState } from '../hooks/useNavMap';
import { useUndoHistory } from '../hooks/useUndoHistory';
import { useViewModeLayout } from '../hooks/useViewModeLayout';
import type { HistoryEntry } from '../hooks/useUndoHistory';
import { buildGraphFromJson, type RFNodeData } from '../utils/graphHelpers';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';
import { computeElkLayout } from '../layout/elkLayout';
import { computeBundledEdges } from '../layout/edgeBundling';
import { useWalkthrough } from '../hooks/useWalkthrough';
import { useSemanticZoom } from '../hooks/useSemanticZoom';
import { useResponsive } from '../hooks/useResponsive';
import { usePersistentState } from '../hooks/usePersistentState';
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
import { RouteHealthPanel } from './panels/RouteHealthPanel';

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
  const [graph, setGraph] = useState<NavMapGraph | null>(graphProp ?? null);
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
  const [galleryNodeId, setGalleryNodeId] = useState<string | null>(null);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    route: string;
    filePath?: string;
  } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showRouteHealth, setShowRouteHealth] = usePersistentState(
    'nav-map:show-route-health',
    false
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hierarchyExpandedGroups, setHierarchyExpandedGroups] = useState<Set<string>>(new Set());
  const [analyticsData, setAnalyticsData] = useState<NavMapAnalytics | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(() => ({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  }));
  const [hoverPreview, setHoverPreview] = useState<{
    screenshot?: string;
    label: string;
    position: { x: number; y: number } | null;
  } | null>(null);

  const baseEdgesRef = useRef<Edge[]>([]);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const onValidationErrorRef = useRef(onValidationError);
  onValidationErrorRef.current = onValidationError;

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
  const beforeDragRef = useRef<HistoryEntry | null>(null);

  const handleGroupToggle = useCallback(
    (groupId: string, collapsed: boolean) => {
      // Capture before-state for undo
      setCollapsedGroups(prev => {
        pushSnapshot({ type: 'collapse', collapsedGroups: new Set(prev) });
        const next = new Set(prev);
        if (collapsed) next.add(groupId);
        else next.delete(groupId);
        return next;
      });
      if (collapsed) {
        setFocusedGroupId(prev => (prev === groupId ? null : prev));
      }
    },
    [pushSnapshot]
  );
  const handleGroupToggleRef = useRef(handleGroupToggle);
  handleGroupToggleRef.current = handleGroupToggle;
  const handleGroupDoubleClick = useCallback((groupId: string) => {
    setFocusedGroupId(prev => (prev === groupId ? null : groupId));
  }, []);
  const handleGroupDoubleClickRef = useRef(handleGroupDoubleClick);
  handleGroupDoubleClickRef.current = handleGroupDoubleClick;
  const handleHierarchyToggle = useCallback(
    (groupId: string) => {
      setHierarchyExpandedGroups(prev => {
        pushSnapshot({ type: 'hierarchy-toggle', expandedGroups: new Set(prev) });
        const next = new Set(prev);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return next;
      });
    },
    [pushSnapshot]
  );
  const handleHierarchyToggleRef = useRef(handleHierarchyToggle);
  handleHierarchyToggleRef.current = handleHierarchyToggle;
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

  // Zoom to focused group when entering group focus mode
  const prevFocusedGroupRef = useRef<string | null>(null);
  useEffect(() => {
    if (focusedGroupId === prevFocusedGroupRef.current) return;
    prevFocusedGroupRef.current = focusedGroupId;
    if (!focusedGroupId) {
      fitView({ padding: 0.15, duration: 300 });
      return;
    }
    const focusedNodes = nodes
      .filter(n => {
        if (n.type === 'groupNode') {
          return (n.data as Record<string, unknown>).groupId === focusedGroupId;
        }
        return (n.data as Record<string, unknown>).group === focusedGroupId;
      })
      .map(n => ({ id: n.id }));
    if (focusedNodes.length > 0) {
      fitView({ nodes: focusedNodes, padding: 0.3, duration: 300 });
    }
  }, [focusedGroupId, nodes, fitView]);

  // Load graph from URL if provided
  useEffect(() => {
    if (graphUrl && !graphProp) {
      fetch(graphUrl)
        .then(r => r.json())
        .then((data: NavMapGraph) => {
          const result = validateGraph(data);
          if (!result.valid) {
            onValidationErrorRef.current?.(result.errors);
            console.warn('[NavMap] Graph validation failed:', result.errors);
          }
          setGraph(data);
        });
    }
  }, [graphUrl, graphProp]);

  // Update graph when prop changes
  useEffect(() => {
    if (graphProp) {
      const result = validateGraph(graphProp);
      if (!result.valid) {
        onValidationErrorRef.current?.(result.errors);
        console.warn('[NavMap] Graph validation failed:', result.errors);
      }
      setGraph(graphProp);
    }
  }, [graphProp]);

  // Expand all hierarchy groups when graph first loads in hierarchy mode
  useEffect(() => {
    if (graph && viewMode === 'hierarchy' && hierarchyExpandedGroups.size === 0) {
      setHierarchyExpandedGroups(new Set(graph.groups.map(g => g.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Fetch analytics data
  useEffect(() => {
    if (!analyticsAdapter || !showAnalytics) return;
    Promise.all([
      analyticsAdapter.fetchPageViews(analyticsPeriod),
      analyticsAdapter.fetchTransitions(analyticsPeriod),
    ]).then(([pageViews, transitions]) => {
      setAnalyticsData({ period: analyticsPeriod, pageViews, transitions });
    });
  }, [analyticsAdapter, showAnalytics, analyticsPeriod]);

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
  }, [graph, setNodes, setEdges]);

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

  // In hierarchy view, auto-collapse groups at overview zoom, auto-expand at detail
  const prevZoomTierRef = useRef(zoomTier);
  useEffect(() => {
    if (viewMode !== 'hierarchy' || !graph || zoomTier === prevZoomTierRef.current) return;
    const prev = prevZoomTierRef.current;
    prevZoomTierRef.current = zoomTier;

    if (zoomTier === 'overview' && prev !== 'overview') {
      // Zoomed out → collapse all
      setHierarchyExpandedGroups(new Set());
    } else if (zoomTier === 'detail' && prev === 'overview') {
      // Zoomed back in from overview → expand all
      setHierarchyExpandedGroups(new Set(graph.groups.map(g => g.id)));
    }
  }, [zoomTier, viewMode, graph]);

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
  // overview (<0.12): hide child nodes, show only group containers
  // compact (0.12-0.25): compact labels, no screenshots
  // detail (>0.25): full page nodes with screenshots
  const zoomedNodes = useMemo(() => {
    const addGalleryFlag = (node: Node) => {
      if (node.type === 'groupNode') return node;
      const hasGallery = galleryNodeIds.has(node.id);
      if (!hasGallery) return node;
      return { ...node, data: { ...node.data, hasGallery: true } };
    };

    if (zoomTier === 'overview') {
      // Only show group nodes; hide individual pages
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

    // compact tier: all page nodes become compact
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
  const onSelectionChange = useCallback(({ nodes: selectedNodes }: OnSelectionChangeParams) => {
    const selected = selectedNodes[0];
    if (selected) {
      ctxRef.current.setSelectedNodeId(selected.id);
      walkthroughRef.current.push(selected.id);
      if (viewModeRef.current === 'tree') {
        setTreeRootId(selected.id);
      }
    }
  }, []);

  // Navigate to a node programmatically
  const navigateToNode = useCallback(
    (nodeId: string) => {
      ctxRef.current.setSelectedNodeId(nodeId);
      walkthroughRef.current.push(nodeId);

      // Center the view on the node
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

  // Node hover for preview
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    const data = node.data as RFNodeData;
    if (data.screenshot) {
      setHoverPreview({
        screenshot: data.screenshot,
        label: data.label,
        position: null,
      });
    }
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoverPreview(null);
  }, []);

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
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const data = node.data as Record<string, unknown>;
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      route: (data.route as string) ?? '',
      filePath: data.filePath as string | undefined,
    });
  }, []);

  // Track mouse position for hover preview
  useEffect(() => {
    if (!hoverPreview) return;
    const handler = (e: MouseEvent) => {
      setHoverPreview(prev =>
        prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null
      );
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [hoverPreview]);

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

  const hasCoverageData = useMemo(
    () => graph?.nodes.some(n => n.coverage !== undefined) ?? false,
    [graph]
  );

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
      const hasGallery = graph?.flows?.some(f => f.gallery?.[node.id]?.length);
      if (hasGallery) {
        setGalleryNodeId(node.id);
      }
    },
    [graph, viewMode, pushSnapshot]
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
            graph={graph}
            onClearFocus={() => setFocusedGroupId(null)}
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
          <CoverageSummary />

          {graph && showRouteHealth && (
            <RouteHealthPanel
              graph={graph}
              isDark={ctx.isDark}
              onClose={() => setShowRouteHealth(false)}
              onNavigate={navigateToNode}
            />
          )}

          {viewMode === 'hierarchy' && graph && (
            <HierarchyControls
              allGroupIds={graph.groups.map(g => g.id)}
              expandedGroups={hierarchyExpandedGroups}
              onExpandAll={() => {
                pushSnapshot({
                  type: 'hierarchy-toggle',
                  expandedGroups: new Set(hierarchyExpandedGroups),
                });
                setHierarchyExpandedGroups(new Set(graph.groups.map(g => g.id)));
              }}
              onCollapseAll={() => {
                pushSnapshot({
                  type: 'hierarchy-toggle',
                  expandedGroups: new Set(hierarchyExpandedGroups),
                });
                setHierarchyExpandedGroups(new Set());
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
            onClose={() => setContextMenu(null)}
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
          onCloseGallery={() => setGalleryNodeId(null)}
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
