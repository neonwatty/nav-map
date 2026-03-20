import { useEffect, type RefObject } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NavMapGraph, ViewMode } from '../types';
import { buildGraphFromJson } from '../utils/graphHelpers';
import { computeElkLayout } from '../layout/elkLayout';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';

interface UseViewModeLayoutOptions {
  graph: NavMapGraph | null;
  layoutDone: boolean;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  treeRootId: string | null;
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  fitView: (options?: { padding?: number; duration?: number }) => void;
  baseEdgesRef: RefObject<Edge[]>;
  sharedNavEdgesRef: RefObject<Edge[]>;
  handleGroupToggleRef: RefObject<(groupId: string, collapsed: boolean) => void>;
  handleGroupDoubleClickRef: RefObject<(groupId: string) => void>;
}

export function useViewModeLayout({
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
}: UseViewModeLayoutOptions): void {
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
          (node.data as Record<string, unknown>).onDoubleClick = handleGroupDoubleClickRef.current;
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
}
