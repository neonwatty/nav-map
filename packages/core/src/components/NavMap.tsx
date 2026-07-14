import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties, ErrorInfo, MouseEvent } from 'react';
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

import type { NavMapGraph, ViewMode, EdgeMode, NavMapTheme, NavMapPreviewMode } from '../types';
import type { GraphValidationError } from '../utils/validateGraph';
import { getGraphNodeId } from '../utils/graphHelpers';
import type { AnalyticsAdapter } from '../analytics/types';
import type { WorkflowFilter } from '../workflowFilters';
import { matchWorkflowFilter } from '../workflowFilters';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useGraphStyling } from '../hooks/useGraphStyling';
import { useNavMapState } from '../hooks/useNavMap';
import { useUndoHistory } from '../hooks/useUndoHistory';
import { useNodeDragUndo } from '../hooks/useNodeDragUndo';
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
import { useNavMapLayoutEffects } from '../hooks/useNavMapLayoutEffects';
import { useNavMapNavigation } from '../hooks/useNavMapNavigation';
import { useFlowAutoSelection } from '../hooks/useFlowAutoSelection';
import { useLiveReadiness } from '../hooks/useLiveReadiness';
import { NavMapErrorBoundary } from './NavMapErrorBoundary';
import { ContainerWarning } from './ContainerWarning';
import { NavMapShell } from './NavMapShell';

const EMPTY_LIVE_URL_OVERRIDES: Record<string, string> = {};

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
  style?: CSSProperties;
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
  /** Show the help overlay when the map first mounts */
  defaultShowHelp?: boolean;
  /** Callback fired when graph validation fails */
  onValidationError?: (errors: GraphValidationError[]) => void;
  /** Callback fired when the help overlay closes */
  onHelpClose?: () => void;
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
  defaultViewMode,
  defaultEdgeMode = 'smooth',
  theme,
  hideToolbar = false,
  hideSearch = false,
  hideHelp = false,
  defaultShowHelp = false,
  onValidationError,
  onHelpClose,
}: NavMapProps) {
  const graph = useNavMapGraphSource({ graph: graphProp, graphUrl, onValidationError });
  const graphStateScopeKey = useMemo(() => getGraphStateScopeKey(graph), [graph]);
  const workflowLayout = graph?.meta.workflow?.layout;
  const initialViewMode = defaultViewMode ?? workflowLayout?.defaultViewMode ?? 'hierarchy';
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutDone, setLayoutDone] = useState(false);
  const [showSharedNav, setShowSharedNav] = usePersistentState('nav-map:show-shared-nav', false);
  const [focusMode, setFocusMode] = usePersistentState('nav-map:focus-mode', false);
  const [showRedirects, setShowRedirects] = usePersistentState('nav-map:show-redirects', false);
  const [viewMode, setViewMode] = usePersistentState<ViewMode>(
    `nav-map:${graphStateScopeKey}:view-mode`,
    initialViewMode
  );
  const [selectedFlowIndex, setSelectedFlowIndex] = useState<number | null>(null);
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter | null>(null);
  const [treeRootId, setTreeRootId] = useState<string | null>(null);
  const resolvedTreeRootId =
    treeRootId ?? resolveDefaultTreeRootId(graph, workflowLayout?.defaultTreeRootId);
  const [edgeMode, setEdgeMode] = usePersistentState<EdgeMode>(
    `nav-map:${graphStateScopeKey}:edge-mode`,
    defaultEdgeMode
  );
  const [previewMode, setPreviewMode] = usePersistentState<NavMapPreviewMode>(
    `nav-map:${graphStateScopeKey}:preview-mode`,
    'screenshots'
  );
  const liveTargetScopeKey = useMemo(() => getLiveTargetScopeKey(graph), [graph]);
  const [liveBaseUrlOverrides, setLiveBaseUrlOverrides] = usePersistentState<
    Record<string, string>
  >('nav-map:live-base-url-overrides', {});
  const [liveUrlOverridesByGraph, setLiveUrlOverridesByGraph] = usePersistentState<
    Record<string, Record<string, string>>
  >('nav-map:live-url-overrides', {});
  const liveBaseUrlOverride = liveBaseUrlOverrides[liveTargetScopeKey] ?? '';
  const liveUrlOverrides = liveUrlOverridesByGraph[liveTargetScopeKey] ?? EMPTY_LIVE_URL_OVERRIDES;
  const setLiveBaseUrlOverride = useCallback(
    (url: string) => {
      setLiveBaseUrlOverrides(prev => {
        const next = { ...prev };
        const normalized = url.trim();
        if (normalized) next[liveTargetScopeKey] = normalized;
        else delete next[liveTargetScopeKey];
        return next;
      });
    },
    [liveTargetScopeKey, setLiveBaseUrlOverrides]
  );
  const setLiveUrlOverride = useCallback(
    (nodeId: string, url: string) => {
      setLiveUrlOverridesByGraph(prev => {
        const current = prev[liveTargetScopeKey] ?? {};
        const nextForGraph = { ...current };
        const normalized = url.trim();
        if (normalized) nextForGraph[nodeId] = normalized;
        else delete nextForGraph[nodeId];

        const next = { ...prev };
        if (Object.keys(nextForGraph).length > 0) next[liveTargetScopeKey] = nextForGraph;
        else delete next[liveTargetScopeKey];
        return next;
      });
    },
    [liveTargetScopeKey, setLiveUrlOverridesByGraph]
  );
  const clearLiveUrlOverride = useCallback(
    (nodeId: string) => setLiveUrlOverride(nodeId, ''),
    [setLiveUrlOverride]
  );
  const [isAnimatingFlow, setIsAnimatingFlow] = useState(false);
  const [showHelp, setShowHelp] = useState(defaultShowHelp && !hideHelp);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { contextMenu, onNodeContextMenu, closeContextMenu } = useNavMapContextMenu();
  const [showRouteHealth, setShowRouteHealth] = usePersistentState(
    `nav-map:${graphStateScopeKey}:show-route-health`,
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
  const { setSelectedNodeId } = ctx;
  const { clear: clearWalkthrough } = walkthrough;
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

  useFlowAutoSelection({ graph, viewMode, selectedFlowIndex, setSelectedFlowIndex });

  useNavMapLayoutEffects({
    graph,
    layoutDone,
    setLayoutDone,
    viewMode,
    viewModeRef,
    selectedFlowIndex,
    treeRootId: resolvedTreeRootId,
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
  });

  const { activeFlow, nodeGroupMap, zoomedNodes } = useNavMapDerivedGraph({
    graph,
    nodes,
    zoomTier,
    galleryNodeIds,
    selectedFlowIndex,
  });
  const { liveReadinessByNode, liveReadinessSummary } = useLiveReadiness({
    graph,
    previewMode,
    viewMode,
    selectedFlowIndex,
    selectedNodeId: ctx.selectedNodeId,
    liveBaseUrlOverride,
    liveUrlOverrides,
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
  const handleWorkflowFilterChange = useCallback(
    (filter: WorkflowFilter | null) => {
      setWorkflowFilter(filter);
      if (filter) {
        setFocusedGroupId(null);
        setAuditFocus(null);
        guardedSetShowSearch(false);
        setSearchQuery('');
      }
    },
    [guardedSetShowSearch, setAuditFocus, setFocusedGroupId]
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
    workflowFilterActive: Boolean(workflowFilter),
    clearWorkflowFilter: () => handleWorkflowFilterChange(null),
    setShowRedirects,
    undo,
    canUndo,
    setCollapsedGroups,
    setHierarchyExpandedGroups,
  });

  const { onNodeDragStart, onNodeDragStop } = useNodeDragUndo({ nodesRef, pushSnapshot });
  const workflowFilterMatch = useMemo(
    () => matchWorkflowFilter(graph, workflowFilter),
    [graph, workflowFilter]
  );

  useEffect(() => {
    setSelectedNodeId(null);
    setWorkflowFilter(null);
    setTreeRootId(null);
    setAuditFocus(null);
    setShowSearch(false);
    setSearchQuery('');
    clearWalkthrough();
    closeGallery();
    setIsAnimatingFlow(false);
  }, [clearWalkthrough, closeGallery, graphStateScopeKey, setAuditFocus, setSelectedNodeId]);

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
    workflowFocusNodeIds: workflowFilterMatch?.nodeIds ?? null,
    workflowFocusEdgeIds: workflowFilterMatch?.edgeIds ?? null,
  });

  // Double-click opens gallery if ANY flow has gallery data for this node
  const onNodeDoubleClick = useCallback(
    (_: MouseEvent, node: Node) => {
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
      openGalleryForNode(getGraphNodeId(node));
    },
    [viewMode, pushSnapshot, setHierarchyExpandedGroups, openGalleryForNode]
  );

  const selectedNode = graph?.nodes.find(n => n.id === ctx.selectedNodeId);

  const effectiveShowHelp = hideHelp ? false : showHelp;
  const effectiveShowSearch = hideSearch ? false : showSearch;

  const shellProps: ComponentProps<typeof NavMapShell> = {
    ctx,
    graph,
    containerRef,
    className,
    style,
    theme,
    hideToolbar,
    isNarrow,
    analyticsAdapter,
    viewMode,
    setViewMode,
    selectedFlowIndex,
    setSelectedFlowIndex,
    treeRootId: resolvedTreeRootId,
    setTreeRootId,
    focusedGroupId,
    setFocusedGroupId,
    edgeMode,
    setEdgeMode,
    showSharedNav,
    setShowSharedNav,
    showRedirects,
    setShowRedirects,
    focusMode,
    setFocusMode,
    isAnimatingFlow,
    setIsAnimatingFlow,
    previewMode,
    setPreviewMode,
    searchQuery,
    showAnalytics,
    setShowAnalytics,
    showRouteHealth,
    setShowRouteHealth,
    showCoverage,
    liveReadinessByNode,
    liveReadinessSummary,
    liveBaseUrlOverride,
    setLiveBaseUrlOverride,
    liveUrlOverrides,
    setLiveUrlOverride,
    clearLiveUrlOverride,
    setShowCoverage,
    hasCoverageData,
    auditFocusLabel: auditFocus?.label ?? null,
    workflowFilter,
    setWorkflowFilter: handleWorkflowFilterChange,
    clearAuditFocus: () => setAuditFocus(null),
    walkthrough,
    layoutDone,
    nodes,
    styledNodes,
    styledEdges,
    viewport,
    hierarchyExpandedGroups,
    setHierarchyExpandedGroups,
    expandAllHierarchyGroups,
    collapseAllHierarchyGroups,
    selectedNode,
    contextMenu,
    effectiveShowHelp,
    effectiveShowSearch,
    hoverPreview,
    analyticsData,
    analyticsPeriod,
    galleryNodeId,
    screenshotBasePath,
    guardedSetShowHelp,
    guardedSetShowSearch,
    setSearchQuery,
    onHelpClose,
    setAnalyticsPeriod,
    closeContextMenu,
    closeGallery,
    navigateToNode,
    navigateToNodeFromSearch,
    handleAuditIssueFocus,
    fitView,
    onNodesChange,
    onEdgesChange,
    onSelectionChange,
    onNodeDragStart,
    onNodeDragStop,
    onNodeContextMenu,
    onNodeMouseEnter,
    onNodeMouseLeave,
    onNodeDoubleClick,
  };

  return <NavMapShell {...shellProps} />;
}

function resolveDefaultTreeRootId(
  graph: NavMapGraph | null,
  preferredRootId?: string
): string | null {
  if (!graph?.nodes.length) return null;
  if (preferredRootId && graph.nodes.some(node => node.id === preferredRootId)) {
    return preferredRootId;
  }
  const firstFlowStep = graph.flows?.find(flow => flow.steps.length > 0)?.steps[0];
  if (firstFlowStep && graph.nodes.some(node => node.id === firstFlowStep)) {
    return firstFlowStep;
  }
  return graph.nodes[0].id;
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

function getLiveTargetScopeKey(graph: NavMapGraph | null): string {
  if (!graph) return 'no-graph';
  if (graph.meta.projectId) {
    return [graph.meta.projectId, graph.meta.environmentId ?? 'default'].join('|');
  }
  return [graph.meta.name, graph.meta.baseUrl, graph.meta.generatedBy].filter(Boolean).join('|');
}

function getGraphStateScopeKey(graph: NavMapGraph | null): string {
  if (!graph) return 'no-graph';
  if (graph.meta.projectId) {
    return ['project', graph.meta.projectId, graph.meta.environmentId ?? 'default'].join('|');
  }
  return ['graph', graph.meta.name, graph.meta.baseUrl, graph.meta.generatedBy]
    .filter(Boolean)
    .join('|');
}
