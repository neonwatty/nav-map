import { useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NavMapGraph } from '../types';
import type { HistoryEntry } from './useUndoHistory';
import { computeElkLayout } from '../layout/elkLayout';

interface KeyboardNavDeps {
  ctx: { selectedNodeId: string | null; setSelectedNodeId: (id: string | null) => void };
  graph: NavMapGraph | null;
  walkthrough: {
    path: string[];
    goBack: () => void;
    clear: () => void;
  };
  nodes: Node[];
  showSearch: boolean;
  showHelp: boolean;
  showSharedNav: boolean;
  focusMode: boolean;
  setShowSearch: (v: boolean | ((p: boolean) => boolean)) => void;
  setShowHelp: (v: boolean | ((p: boolean) => boolean)) => void;
  setShowSharedNav: (v: boolean | ((p: boolean) => boolean)) => void;
  setFocusMode: (v: boolean | ((p: boolean) => boolean)) => void;
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[]) => void;
  fitView: (opts?: { padding?: number; duration?: number }) => void;
  setCenter: (x: number, y: number, opts?: { zoom?: number; duration?: number }) => void;
  navigateToNode: (nodeId: string) => void;
  baseEdgesRef: React.MutableRefObject<Edge[]>;
  sharedNavEdgesRef: React.MutableRefObject<Edge[]>;
  focusedGroupId: string | null;
  groups: {
    setFocusedGroup: (id: string | null) => void;
    restoreCollapsed: (groups: Set<string>) => void;
    setHierarchyExpanded: (groups: Set<string>) => void;
  };
  setShowRedirects: (v: boolean | ((p: boolean) => boolean)) => void;
  undo: () => HistoryEntry | null;
  canUndo: boolean;
}

export function useKeyboardNav(deps: KeyboardNavDeps) {
  const {
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
    focusedGroupId,
    groups,
    setShowRedirects,
    undo,
    canUndo,
  } = deps;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const selectedId = ctx.selectedNodeId;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight': {
          if (!selectedId || !graph) return;
          e.preventDefault();
          const outgoing = graph.edges.filter(edge => edge.source === selectedId);
          if (outgoing.length > 0) navigateToNode(outgoing[0].target);
          break;
        }
        case 'ArrowUp':
        case 'ArrowLeft': {
          if (!selectedId || !graph) return;
          e.preventDefault();
          const incoming = graph.edges.filter(edge => edge.target === selectedId);
          if (incoming.length > 0) navigateToNode(incoming[0].source);
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
              setCenter(node.position.x + 90, node.position.y + 70, { zoom: 0.8, duration: 300 });
            }
          } else {
            ctx.setSelectedNodeId(null);
          }
          break;
        }
        case 'Escape':
          if (showSearch) setShowSearch(false);
          else if (showHelp) setShowHelp(false);
          else if (focusedGroupId) groups.setFocusedGroup(null);
          else {
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
          setShowHelp((prev: boolean) => !prev);
          break;
        case '0':
          fitView({ padding: 0.15, duration: 300 });
          break;
        case 'l':
        case 'L':
          if (graph) {
            const currentEdges = showSharedNav
              ? [...baseEdgesRef.current, ...sharedNavEdgesRef.current]
              : baseEdgesRef.current;
            computeElkLayout(nodes, currentEdges, {
              direction: e.shiftKey ? 'RIGHT' : 'DOWN',
            }).then(({ nodes: ln, edges: le }) => {
              setNodes(ln);
              setEdges(le);
              baseEdgesRef.current = le;
              setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
            });
          }
          break;
        case 'n':
        case 'N':
          setShowSharedNav((prev: boolean) => !prev);
          break;
        case 'z':
        case 'Z': {
          if (!(e.metaKey || e.ctrlKey) || !canUndo) break;
          e.preventDefault();
          const entry = undo();
          if (!entry) break;
          if (entry.type === 'node-drag') {
            setNodes(prev =>
              prev.map(n => {
                const saved = entry.nodePositions.find(p => p.id === n.id);
                if (!saved) return n;
                return { ...n, position: saved.position, parentId: saved.parentId };
              })
            );
          } else if (entry.type === 'collapse') {
            groups.restoreCollapsed(new Set(entry.collapsedGroups));
            // Sync GroupNode internal state
            setNodes(prev =>
              prev.map(n => {
                if (n.type !== 'groupNode') return n;
                const groupId = (n.data as Record<string, unknown>).groupId as string;
                return { ...n, data: { ...n.data, collapsed: entry.collapsedGroups.has(groupId) } };
              })
            );
          } else if (entry.type === 'hierarchy-toggle') {
            groups.setHierarchyExpanded(new Set(entry.expandedGroups));
          }
          break;
        }
        case 'r':
        case 'R':
          setShowRedirects((prev: boolean) => !prev);
          break;
        case 'f':
        case 'F':
          setFocusMode((prev: boolean) => !prev);
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
    focusMode,
    fitView,
    setCenter,
    setNodes,
    setEdges,
    navigateToNode,
    setShowSearch,
    setShowHelp,
    setShowSharedNav,
    setFocusMode,
    baseEdgesRef,
    sharedNavEdgesRef,
    focusedGroupId,
    groups,
    setShowRedirects,
    undo,
    canUndo,
  ]);
}
