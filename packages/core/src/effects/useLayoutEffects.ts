import { useEffect, type RefObject } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NavMapGraph } from '../types';
import { buildGraphFromJson } from '../utils/graphHelpers';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';
import { computeElkLayout } from '../layout/elkLayout';

interface UseLayoutEffectsOptions {
  graph: NavMapGraph | null;
  viewModeRef: RefObject<string>;
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  baseEdgesRef: RefObject<Edge[]>;
  sharedNavEdgesRef: RefObject<Edge[]>;
  handleGroupToggleRef: RefObject<(groupId: string, collapsed: boolean) => void>;
  handleGroupDoubleClickRef: RefObject<(groupId: string) => void>;
  graphActions: { setLayoutDone: (done: boolean) => void };
}

/**
 * Converts the graph to ReactFlow elements and runs ELK layout.
 * For non-map view modes, skips layout and marks layoutDone immediately.
 */
export function useLayoutEffects({
  graph,
  viewModeRef,
  setNodes,
  setEdges,
  baseEdgesRef,
  sharedNavEdgesRef,
  handleGroupToggleRef,
  handleGroupDoubleClickRef,
  graphActions,
}: UseLayoutEffectsOptions): void {
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
  }, [
    graph,
    setNodes,
    setEdges,
    graphActions,
    viewModeRef,
    baseEdgesRef,
    sharedNavEdgesRef,
    handleGroupToggleRef,
    handleGroupDoubleClickRef,
  ]);
}
