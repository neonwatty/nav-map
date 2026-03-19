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

import type { NavMapGraph, ViewMode } from '../types';
import { BundledEdge } from './edges/BundledEdge';
import { computeBundledEdges } from '../layout/edgeBundling';
import { FlowAnimator } from './panels/FlowAnimator';
import { NavMapToolbar } from './panels/NavMapToolbar';
import type { AnalyticsAdapter, NavMapAnalytics } from '../analytics/types';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useGraphStyling } from '../hooks/useGraphStyling';
import { NavMapContext, useNavMapState } from '../hooks/useNavMap';
import { buildGraphFromJson, type RFNodeData } from '../utils/graphHelpers';
import { computeElkLayout } from '../layout/elkLayout';
import { useWalkthrough } from '../hooks/useWalkthrough';
import { useSemanticZoom } from '../hooks/useSemanticZoom';
import { useResponsive } from '../hooks/useResponsive';
import { PageNode } from './nodes/PageNode';
import { CompactNode } from './nodes/CompactNode';
import { GroupNode } from './nodes/GroupNode';
import { NavEdge } from './edges/NavEdge';
import { ConnectionPanel } from './panels/ConnectionPanel';
import { LegendPanel } from './panels/LegendPanel';
import { WalkthroughBar } from './panels/WalkthroughBar';
import { HelpOverlay } from './panels/HelpOverlay';
import { HoverPreview } from './panels/HoverPreview';
import { SearchPanel } from './panels/SearchPanel';
import { PresentationBar } from './panels/PresentationBar';
import { AnalyticsOverlay } from './panels/AnalyticsOverlay';
import { GalleryViewer } from './panels/GalleryViewer';

const nodeTypes = {
  pageNode: PageNode,
  compactNode: CompactNode,
  groupNode: GroupNode,
};

const edgeTypes = {
  navEdge: NavEdge,
  bundledEdge: BundledEdge,
};

export interface NavMapProps {
  graph?: NavMapGraph;
  graphUrl?: string;
  screenshotBasePath?: string;
  analytics?: AnalyticsAdapter;
  className?: string;
  style?: React.CSSProperties;
}

function buildSharedNavEdges(graph: NavMapGraph): Edge[] {
  if (!graph.sharedNav) return [];
  const existingEdges = new Set(graph.edges.map(e => `${e.source}->${e.target}`));
  const allTargets = [
    ...new Set([...graph.sharedNav.navbar.targets, ...graph.sharedNav.footer.targets]),
  ];
  const allPages = [...new Set([...graph.sharedNav.navbar.pages, ...graph.sharedNav.footer.pages])];

  const edges: Edge[] = [];
  for (const src of allPages) {
    for (const tgt of allTargets) {
      if (src === tgt) continue;
      if (existingEdges.has(`${src}->${tgt}`)) continue;
      edges.push({
        id: `shared-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: 'navEdge',
        data: { label: 'shared nav', edgeType: 'shared-nav' },
      });
    }
  }
  return edges;
}

function NavMapInner({
  graph: graphProp,
  graphUrl,
  screenshotBasePath = '',
  analytics: analyticsAdapter,
  className,
  style,
}: NavMapProps) {
  const [graph, setGraph] = useState<NavMapGraph | null>(graphProp ?? null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutDone, setLayoutDone] = useState(false);
  const [showSharedNav, setShowSharedNav] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedFlowIndex, setSelectedFlowIndex] = useState<number | null>(null);
  const [treeRootId, setTreeRootId] = useState<string | null>(null);
  const [useBundledEdges, setUseBundledEdges] = useState(false);
  const [isAnimatingFlow, setIsAnimatingFlow] = useState(false);
  const [galleryNodeId, setGalleryNodeId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [analyticsData, setAnalyticsData] = useState<NavMapAnalytics | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [hoverPreview, setHoverPreview] = useState<{
    screenshot?: string;
    label: string;
    position: { x: number; y: number } | null;
  } | null>(null);

  const baseEdgesRef = useRef<Edge[]>([]);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const handleGroupToggle = useCallback((groupId: string, collapsed: boolean) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (collapsed) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  }, []);
  const handleGroupToggleRef = useRef(handleGroupToggle);
  handleGroupToggleRef.current = handleGroupToggle;
  const sharedNavEdgesRef = useRef<Edge[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const ctx = useNavMapState(graph, screenshotBasePath);
  const walkthrough = useWalkthrough();
  const { showDetail } = useSemanticZoom();
  const { isNarrow } = useResponsive();
  const viewportX = useStore(s => s.transform[0]);
  const viewportY = useStore(s => s.transform[1]);
  const viewportZoom = useStore(s => s.transform[2]);
  const viewport = { x: viewportX, y: viewportY, zoom: viewportZoom };
  const { fitView, setCenter } = useReactFlow();

  // Load graph from URL if provided
  useEffect(() => {
    if (graphUrl && !graphProp) {
      fetch(graphUrl)
        .then(r => r.json())
        .then((data: NavMapGraph) => setGraph(data));
    }
  }, [graphUrl, graphProp]);

  // Update graph when prop changes
  useEffect(() => {
    if (graphProp) setGraph(graphProp);
  }, [graphProp]);

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

    const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);

    // Inject onToggle into group nodes
    for (const node of rfNodes) {
      if (node.type === 'groupNode') {
        (node.data as Record<string, unknown>).onToggle = handleGroupToggleRef.current;
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

  // Compute bundled edges when toggle is enabled
  useEffect(() => {
    if (!layoutDone || !useBundledEdges) return;
    const currentEdges = showSharedNav
      ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current]
      : baseEdgesRef.current;
    const bundledResults = computeBundledEdges(nodes, currentEdges);
    const bundledPathMap = new Map(bundledResults.map(r => [r.edgeId, r.path]));
    const bundled = currentEdges.map(edge => {
      const bp = bundledPathMap.get(edge.id);
      return bp ? { ...edge, type: 'bundledEdge', data: { ...edge.data, bundledPath: bp } } : edge;
    });
    setEdges(bundled);
  }, [useBundledEdges, layoutDone, nodes, showSharedNav, setEdges]);

  // When bundling is turned off, restore original edges
  useEffect(() => {
    if (!layoutDone || useBundledEdges) return;
    setEdges(
      showSharedNav ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current] : baseEdgesRef.current
    );
  }, [useBundledEdges, layoutDone, showSharedNav, setEdges]);

  // Re-layout when view mode changes
  useEffect(() => {
    if (!graph || !layoutDone) return;

    if (viewMode === 'flow' && selectedFlowIndex !== null) {
      const flow = graph.flows?.[selectedFlowIndex];
      if (!flow) return;

      const flowEdges: Edge[] = [];
      for (let i = 0; i < flow.steps.length - 1; i++) {
        const src = flow.steps[i];
        const tgt = flow.steps[i + 1];
        const existingEdge = graph.edges.find(e => e.source === src && e.target === tgt);
        flowEdges.push({
          id: existingEdge?.id ?? `flow-${src}-${tgt}`,
          source: src,
          target: tgt,
          type: 'navEdge',
          data: { label: existingEdge?.label ?? '', edgeType: existingEdge?.type ?? 'link' },
        });
      }

      const flowNodes: Node[] = flow.steps.map((stepId, index) => {
        const graphNode = graph.nodes.find(n => n.id === stepId);
        return {
          id: stepId,
          type: graphNode?.screenshot ? 'pageNode' : 'compactNode',
          position: { x: 0, y: 0 },
          data: {
            label: graphNode?.label ?? stepId,
            route: graphNode?.route ?? '',
            group: graphNode?.group ?? '',
            screenshot: graphNode?.screenshot,
            flowStepNumber: index + 1,
          },
        };
      });

      computeElkLayout(flowNodes, flowEdges, { direction: 'RIGHT', spacing: 120 }).then(
        ({ nodes: ln, edges: le }) => {
          setNodes(ln);
          setEdges(le);
          baseEdgesRef.current = le;
          setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
        }
      );
    } else if (viewMode === 'tree' && treeRootId) {
      const adjacency = new Map<string, string[]>();
      for (const edge of graph.edges) {
        const existing = adjacency.get(edge.source) ?? [];
        existing.push(edge.target);
        adjacency.set(edge.source, existing);
      }

      const visited = new Set<string>();
      const queue = [treeRootId];
      visited.add(treeRootId);
      const treeEdges: Edge[] = [];

      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const neighbor of adjacency.get(current) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
            const existingEdge = graph.edges.find(
              e => e.source === current && e.target === neighbor
            );
            treeEdges.push({
              id: existingEdge?.id ?? `tree-${current}-${neighbor}`,
              source: current,
              target: neighbor,
              type: 'navEdge',
              data: { label: existingEdge?.label ?? '', edgeType: existingEdge?.type ?? 'link' },
            });
          }
        }
      }

      const treeNodes: Node[] = graph.nodes.map(n => ({
        id: n.id,
        type: n.screenshot ? 'pageNode' : 'compactNode',
        position: { x: 0, y: 0 },
        data: { label: n.label, route: n.route, group: n.group, screenshot: n.screenshot },
        style: { opacity: visited.has(n.id) ? 1 : 0.1, transition: 'opacity 0.3s' },
      }));

      computeElkLayout(
        treeNodes.filter(n => visited.has(n.id)),
        treeEdges,
        { direction: 'RIGHT', spacing: 100 }
      ).then(({ nodes: ln, edges: le }) => {
        const nonReachable = treeNodes
          .filter(n => !visited.has(n.id))
          .map((n, i) => ({ ...n, position: { x: -300, y: i * 60 } }));
        setNodes([...ln, ...nonReachable]);
        setEdges(le);
        baseEdgesRef.current = le;
        setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
      });
    } else if (viewMode === 'map') {
      const { nodes: rfNodes, edges: rfEdges } = buildGraphFromJson(graph);
      for (const node of rfNodes) {
        if (node.type === 'groupNode') {
          (node.data as Record<string, unknown>).onToggle = handleGroupToggleRef.current;
        }
      }
      computeElkLayout(rfNodes, rfEdges).then(({ nodes: ln, edges: le }) => {
        setNodes(ln);
        setEdges(le);
        baseEdgesRef.current = le;
        sharedNavEdgesRef.current = buildSharedNavEdges(graph);
        setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedFlowIndex, treeRootId]);

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

  // Semantic zoom: swap node types based on zoom level (skip group nodes)
  // Also inject hasGallery flag into node data
  const zoomedNodes = useMemo(() => {
    const addGalleryFlag = (node: Node) => {
      if (node.type === 'groupNode') return node;
      const hasGallery = galleryNodeIds.has(node.id);
      if (!hasGallery) return node;
      return { ...node, data: { ...node.data, hasGallery: true } };
    };

    if (showDetail) return nodes.map(addGalleryFlag);
    return nodes.map(node => {
      if (node.type === 'groupNode') return node;
      const withGallery = addGalleryFlag(node);
      return { ...withGallery, type: 'compactNode' };
    });
  }, [nodes, showDetail, galleryNodeIds]);

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
    setShowSearch,
    setShowHelp,
    setShowSharedNav,
    setFocusMode,
    setNodes,
    setEdges,
    fitView,
    setCenter,
    navigateToNode,
    baseEdgesRef,
    sharedNavEdgesRef,
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

  const { styledNodes, styledEdges } = useGraphStyling({
    nodes,
    edges,
    zoomedNodes,
    collapsedGroups,
    selectedNodeId: ctx.selectedNodeId,
    focusMode,
    viewMode,
    activeFlow,
  });

  // Double-click opens gallery if ANY flow has gallery data for this node
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const hasGallery = graph?.flows?.some(f => f.gallery?.[node.id]?.length);
      if (hasGallery) {
        setGalleryNodeId(node.id);
      }
    },
    [graph]
  );

  const selectedNode = graph?.nodes.find(n => n.id === ctx.selectedNodeId);

  return (
    <NavMapContext.Provider value={ctx}>
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          background: ctx.isDark ? '#0a0a0f' : '#f4f5f8',
          color: ctx.isDark ? '#c8c8d0' : '#333',
          ...style,
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Toolbar */}
          <NavMapToolbar
            graph={graph}
            viewMode={viewMode}
            selectedFlowIndex={selectedFlowIndex}
            showSharedNav={showSharedNav}
            focusMode={focusMode}
            useBundledEdges={useBundledEdges}
            isAnimatingFlow={isAnimatingFlow}
            showAnalytics={showAnalytics}
            analyticsAdapter={analyticsAdapter}
            onViewModeChange={mode => {
              setViewMode(mode);
              if (mode !== 'flow') setSelectedFlowIndex(null);
              if (mode !== 'tree') setTreeRootId(null);
            }}
            onFlowSelect={setSelectedFlowIndex}
            onResetView={() => fitView({ padding: 0.15, duration: 300 })}
            onToggleSharedNav={() => setShowSharedNav(prev => !prev)}
            onToggleFocusMode={() => setFocusMode(prev => !prev)}
            onToggleBundledEdges={() => setUseBundledEdges(prev => !prev)}
            onAnimate={() => setIsAnimatingFlow(true)}
            onToggleAnalytics={() => setShowAnalytics(prev => !prev)}
            onSearch={() => setShowSearch(true)}
            onHelp={() => setShowHelp(true)}
          />

          {/* Flow/Tree mode banners */}
          {viewMode === 'flow' &&
            selectedFlowIndex !== null &&
            graph?.flows?.[selectedFlowIndex] && (
              <div
                style={{
                  position: 'absolute',
                  top: 50,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: ctx.isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
                  border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
                  borderRadius: 8,
                  padding: '6px 16px',
                  zIndex: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  color: ctx.isDark ? '#7aacff' : '#3355aa',
                }}
              >
                Flow: {graph.flows![selectedFlowIndex].name}
              </div>
            )}
          {viewMode === 'tree' && !treeRootId && (
            <div
              style={{
                position: 'absolute',
                top: 50,
                left: '50%',
                transform: 'translateX(-50%)',
                background: ctx.isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
                border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
                borderRadius: 8,
                padding: '6px 16px',
                zIndex: 20,
                fontSize: 13,
                color: ctx.isDark ? '#888' : '#666',
              }}
            >
              Click any node to set it as tree root
            </div>
          )}
          {viewMode === 'tree' && treeRootId && (
            <div
              style={{
                position: 'absolute',
                top: 50,
                left: '50%',
                transform: 'translateX(-50%)',
                background: ctx.isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
                border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
                borderRadius: 8,
                padding: '6px 16px',
                zIndex: 20,
                fontSize: 13,
                fontWeight: 600,
                color: ctx.isDark ? '#7aacff' : '#3355aa',
              }}
            >
              Tree from: {graph?.nodes.find(n => n.id === treeRootId)?.label ?? treeRootId}
            </div>
          )}

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

          {/* Flow animation overlay */}
          {isAnimatingFlow &&
            selectedFlowIndex !== null &&
            graph?.flows?.[selectedFlowIndex] &&
            layoutDone && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 25,
                  overflow: 'hidden',
                }}
              >
                <FlowAnimator
                  flowSteps={graph.flows[selectedFlowIndex].steps}
                  nodes={nodes}
                  isAnimating={isAnimatingFlow}
                  onAnimationEnd={() => setIsAnimatingFlow(false)}
                  viewport={viewport}
                />
              </div>
            )}
          {isAnimatingFlow && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: ctx.isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
                border: `1px solid ${ctx.isDark ? '#2a2a3a' : '#e0e2ea'}`,
                borderRadius: 8,
                padding: '8px 16px',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 600, color: ctx.isDark ? '#7aacff' : '#3355aa' }}
              >
                Animating flow...
              </span>
              <button
                onClick={() => setIsAnimatingFlow(false)}
                style={{
                  background: 'none',
                  border: `1px solid ${ctx.isDark ? '#333' : '#ccc'}`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: ctx.isDark ? '#888' : '#666',
                  cursor: 'pointer',
                }}
              >
                Stop
              </button>
            </div>
          )}
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

        {/* Overlays */}
        <HelpOverlay isOpen={showHelp} onClose={() => setShowHelp(false)} />

        {graph && (
          <SearchPanel
            nodes={graph.nodes}
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            onSelect={nodeId => {
              setShowSearch(false);
              navigateToNode(nodeId);
            }}
            isDark={ctx.isDark}
          />
        )}

        {hoverPreview && (
          <HoverPreview
            screenshot={hoverPreview.screenshot}
            label={hoverPreview.label}
            position={hoverPreview.position}
          />
        )}

        {/* Analytics Overlay */}
        {showAnalytics && (
          <AnalyticsOverlay
            analytics={analyticsData}
            isVisible={showAnalytics}
            onClose={() => setShowAnalytics(false)}
            period={analyticsPeriod}
            onPeriodChange={setAnalyticsPeriod}
          />
        )}

        {/* Presentation Mode */}
        {walkthrough.mode === 'presentation' && graph && (
          <PresentationBar
            currentNodeId={walkthrough.currentNodeId}
            nodes={graph.nodes}
            stepLabel={walkthrough.stepLabel}
            canGoBack={walkthrough.canGoBack}
            canGoForward={walkthrough.canGoForward}
            onBack={walkthrough.goBack}
            onForward={walkthrough.goForward}
            onExit={() => walkthrough.setMode('explore')}
            screenshotBasePath={screenshotBasePath}
          />
        )}

        {/* Gallery Viewer */}
        {galleryNodeId &&
          (() => {
            const flow = graph?.flows?.find(f => f.gallery?.[galleryNodeId]?.length);
            if (!flow?.gallery?.[galleryNodeId]) return null;
            return (
              <GalleryViewer
                nodeLabel={graph?.nodes.find(n => n.id === galleryNodeId)?.label ?? galleryNodeId}
                steps={flow.gallery[galleryNodeId]}
                flowName={flow.name}
                onClose={() => setGalleryNodeId(null)}
              />
            );
          })()}
      </div>
    </NavMapContext.Provider>
  );
}

export function NavMap(props: NavMapProps) {
  return (
    <ReactFlowProvider>
      <NavMapInner {...props} />
    </ReactFlowProvider>
  );
}
