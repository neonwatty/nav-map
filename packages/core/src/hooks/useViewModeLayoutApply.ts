import type { RefObject } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { NavMapGraph } from '../types';
import { buildSharedNavEdges } from '../utils/sharedNavEdges';

interface LayoutApplyOptions {
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  baseEdgesRef: RefObject<Edge[]>;
  fitView: (options?: { padding?: number; duration?: number }) => void;
  fitViewPadding: number;
}

interface MapLayoutApplyOptions extends LayoutApplyOptions {
  graph: NavMapGraph;
  sharedNavEdgesRef: RefObject<Edge[]>;
}

export function applyLayoutResult(
  nodes: Node[],
  edges: Edge[],
  { setNodes, setEdges, baseEdgesRef, fitView, fitViewPadding }: LayoutApplyOptions
): void {
  setNodes(nodes);
  setEdges(edges);
  baseEdgesRef.current = edges;
  setTimeout(() => fitView({ padding: fitViewPadding, duration: 300 }), 50);
}

export function applyMapLayoutResult(
  nodes: Node[],
  edges: Edge[],
  {
    graph,
    setNodes,
    setEdges,
    baseEdgesRef,
    sharedNavEdgesRef,
    fitView,
    fitViewPadding,
  }: MapLayoutApplyOptions
): void {
  setNodes(nodes);
  setEdges(edges);
  baseEdgesRef.current = edges;
  sharedNavEdgesRef.current = buildSharedNavEdges(graph);
  setTimeout(() => fitView({ padding: fitViewPadding, duration: 300 }), 50);
}
