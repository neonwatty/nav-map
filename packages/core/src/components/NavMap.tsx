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
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { NavMapGraph } from '../types';
import type { AnalyticsAdapter, NavMapAnalytics } from '../analytics/types';
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

const nodeTypes = {
  pageNode: PageNode,
  compactNode: CompactNode,
  groupNode: GroupNode,
};

const edgeTypes = {
  navEdge: NavEdge,
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
    ...new Set([
      ...graph.sharedNav.navbar.targets,
      ...graph.sharedNav.footer.targets,
    ]),
  ];
  const allPages = [
    ...new Set([
      ...graph.sharedNav.navbar.pages,
      ...graph.sharedNav.footer.pages,
    ]),
  ];

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

  // Semantic zoom: swap node types based on zoom level (skip group nodes)
  const zoomedNodes = useMemo(() => {
    if (showDetail) return nodes;
    return nodes.map(node => {
      if (node.type === 'groupNode') return node;
      return { ...node, type: 'compactNode' };
    });
  }, [nodes, showDetail]);

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
      }
    },
    []
  );

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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const selectedId = ctx.selectedNodeId;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight': {
          if (!selectedId || !graph) return;
          e.preventDefault();
          const outgoing = graph.edges.filter(edge => edge.source === selectedId);
          if (outgoing.length > 0) {
            const next = outgoing[0];
            navigateToNode(next.target);
          }
          break;
        }
        case 'ArrowUp':
        case 'ArrowLeft': {
          if (!selectedId || !graph) return;
          e.preventDefault();
          const incoming = graph.edges.filter(edge => edge.target === selectedId);
          if (incoming.length > 0) {
            const prev = incoming[0];
            navigateToNode(prev.source);
          }
          break;
        }
        case 'Backspace': {
          e.preventDefault();
          walkthrough.goBack();
          const prevNode = walkthrough.path[walkthrough.path.length - 2];
          if (prevNode) {
            ctx.setSelectedNodeId(prevNode);
            const node = nodes.find(n => n.id === prevNode);
            if (node) {
              setCenter(node.position.x + 90, node.position.y + 70, {
                zoom: 0.8,
                duration: 300,
              });
            }
          } else {
            ctx.setSelectedNodeId(null);
          }
          break;
        }
        case 'Escape':
          if (showSearch) {
            setShowSearch(false);
          } else if (showHelp) {
            setShowHelp(false);
          } else {
            ctx.setSelectedNodeId(null);
            walkthrough.clear();
          }
          break;
        case '/':
          e.preventDefault();
          setShowSearch(true);
          break;
        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setShowSearch(true);
          }
          break;
        case '?':
          setShowHelp(prev => !prev);
          break;
        case '0':
          fitView({ padding: 0.15, duration: 300 });
          break;
        case 'l':
        case 'L':
          // Re-compute layout
          if (graph) {
            const currentEdges = showSharedNav
              ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current]
              : baseEdgesRef.current;
            computeElkLayout(nodes, currentEdges, {
              direction: e.shiftKey ? 'RIGHT' : 'DOWN',
            }).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
              setNodes(layoutedNodes);
              setEdges(layoutedEdges);
              baseEdgesRef.current = layoutedEdges;
              setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
            });
          }
          break;
        case 'n':
        case 'N':
          setShowSharedNav(prev => !prev);
          break;
        case 'o':
        case 'O': {
          if (!selectedId || !graph) return;
          const nodeInfo = graph.nodes.find(n => n.id === selectedId);
          if (nodeInfo && graph.meta.baseUrl) {
            window.open(`${graph.meta.baseUrl}${nodeInfo.route}`, '_blank');
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    ctx,
    graph,
    walkthrough,
    nodes,
    showSearch,
    showHelp,
    showSharedNav,
    fitView,
    setCenter,
    setNodes,
    navigateToNode,
  ]);

  // Node hover for preview
  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as RFNodeData;
      if (data.screenshot) {
        setHoverPreview({
          screenshot: data.screenshot,
          label: data.label,
          position: null,
        });
      }
    },
    []
  );

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

  // Filter collapsed group children
  const visibleNodes = useMemo(() => {
    if (collapsedGroups.size === 0) return zoomedNodes;
    return zoomedNodes.filter(node => {
      if (!node.parentId) return true;
      const groupId = node.parentId.slice('group-'.length);
      return !collapsedGroups.has(groupId);
    });
  }, [zoomedNodes, collapsedGroups]);

  // Re-route edges targeting collapsed children to the group node
  const visibleEdges = useMemo(() => {
    if (collapsedGroups.size === 0) return edges;
    const collapsedChildIds = new Set(
      nodes
        .filter(n => n.parentId && collapsedGroups.has(n.parentId.slice('group-'.length)))
        .map(n => n.id)
    );
    return edges.map(edge => {
      let { source, target } = edge;
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
      if (sourceNode?.parentId && collapsedChildIds.has(source)) {
        source = sourceNode.parentId;
      }
      if (targetNode?.parentId && collapsedChildIds.has(target)) {
        target = targetNode.parentId;
      }
      if (source === edge.source && target === edge.target) return edge;
      return { ...edge, source, target, id: `${edge.id}-rerouted` };
    });
  }, [edges, nodes, collapsedGroups]);

  // Dimming: when a node is selected, dim unconnected nodes/edges
  const styledNodes = useMemo(() => {
    if (!ctx.selectedNodeId) return visibleNodes;

    const connectedNodeIds = new Set<string>([ctx.selectedNodeId]);
    for (const edge of visibleEdges) {
      if (edge.source === ctx.selectedNodeId) connectedNodeIds.add(edge.target);
      if (edge.target === ctx.selectedNodeId) connectedNodeIds.add(edge.source);
    }

    return visibleNodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: connectedNodeIds.has(node.id) ? 1 : 0.25,
        transition: 'opacity 0.2s',
      },
    }));
  }, [visibleNodes, visibleEdges, ctx.selectedNodeId]);

  const styledEdges = useMemo(() => {
    if (!ctx.selectedNodeId) return visibleEdges;

    return visibleEdges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity:
          edge.source === ctx.selectedNodeId || edge.target === ctx.selectedNodeId
            ? 1
            : 0.15,
        transition: 'opacity 0.2s',
      },
    }));
  }, [visibleEdges, ctx.selectedNodeId]);

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
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'flex',
              gap: 6,
              zIndex: 15,
            }}
          >
            <button
              onClick={() => fitView({ padding: 0.15, duration: 300 })}
              style={toolbarButtonStyle(ctx.isDark)}
              title="Reset View (0)"
            >
              Reset View
            </button>
            <button
              onClick={() => setShowSharedNav(prev => !prev)}
              style={toolbarButtonStyle(ctx.isDark, showSharedNav)}
              title="Toggle Shared Nav (N)"
            >
              {showSharedNav ? 'Hide' : 'Show'} Shared Nav
            </button>
            {analyticsAdapter && (
              <button
                onClick={() => setShowAnalytics(prev => !prev)}
                style={toolbarButtonStyle(ctx.isDark, showAnalytics)}
                title="Toggle Analytics"
              >
                Analytics
              </button>
            )}
            <button
              onClick={() => setShowSearch(true)}
              style={toolbarButtonStyle(ctx.isDark)}
              title="Search (/ or ⌘K)"
            >
              Search
            </button>
            <button
              onClick={() => setShowHelp(true)}
              style={toolbarButtonStyle(ctx.isDark)}
              title="Help (?)"
            >
              ?
            </button>
          </div>

          {/* Walkthrough breadcrumb */}
          {graph && (
            <WalkthroughBar
              path={walkthrough.path}
              nodes={graph.nodes}
              onGoTo={(index) => {
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
            onSelect={(nodeId) => {
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
      </div>
    </NavMapContext.Provider>
  );
}

function toolbarButtonStyle(isDark: boolean, active = false): React.CSSProperties {
  return {
    background: active
      ? (isDark ? '#1e2540' : '#e0e8ff')
      : (isDark ? '#14141e' : '#fff'),
    border: `1px solid ${active
      ? (isDark ? '#4466aa' : '#6688cc')
      : (isDark ? '#2a2a3a' : '#d8dae0')
    }`,
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    color: active
      ? (isDark ? '#7aacff' : '#3355aa')
      : (isDark ? '#888' : '#666'),
    cursor: 'pointer',
  };
}

export function NavMap(props: NavMapProps) {
  return (
    <ReactFlowProvider>
      <NavMapInner {...props} />
    </ReactFlowProvider>
  );
}
