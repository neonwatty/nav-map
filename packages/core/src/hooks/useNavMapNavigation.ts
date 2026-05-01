import { useCallback, useRef } from 'react';
import type { Node, OnSelectionChangeParams } from '@xyflow/react';
import type { ViewMode } from '../types';
import type { WalkthroughState } from './useWalkthrough';

interface NavMapSelectionState {
  setSelectedNodeId: (id: string | null) => void;
}

interface CenterOptions {
  zoom: number;
  duration: number;
}

interface UseNavMapNavigationOptions {
  ctx: NavMapSelectionState;
  walkthrough: Pick<WalkthroughState, 'push'>;
  nodes: Node[];
  viewMode: ViewMode;
  setTreeRootId: (nodeId: string) => void;
  setCenter: (x: number, y: number, options: CenterOptions) => void;
}

function centerOnNode(
  nodes: Node[],
  nodeId: string,
  zoom: number,
  duration: number,
  setCenter: (x: number, y: number, options: CenterOptions) => void
): void {
  const node = nodes.find(candidate => candidate.id === nodeId);
  if (node) {
    setCenter(node.position.x + 90, node.position.y + 70, { zoom, duration });
  }
}

export function useNavMapNavigation({
  ctx,
  walkthrough,
  nodes,
  viewMode,
  setTreeRootId,
  setCenter,
}: UseNavMapNavigationOptions) {
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const walkthroughRef = useRef(walkthrough);
  walkthroughRef.current = walkthrough;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const selected = selectedNodes[0];
      if (selected) {
        ctxRef.current.setSelectedNodeId(selected.id);
        walkthroughRef.current.push(selected.id);
        if (viewModeRef.current === 'tree') {
          setTreeRootId(selected.id);
        }
      }
    },
    [setTreeRootId]
  );

  const navigateToNode = useCallback(
    (nodeId: string) => {
      ctxRef.current.setSelectedNodeId(nodeId);
      walkthroughRef.current.push(nodeId);
      centerOnNode(nodesRef.current, nodeId, 0.8, 300, setCenter);
    },
    [setCenter]
  );

  const navigateToNodeFromSearch = useCallback(
    (nodeId: string) => {
      ctxRef.current.setSelectedNodeId(nodeId);
      walkthroughRef.current.push(nodeId);
      centerOnNode(nodesRef.current, nodeId, 1.0, 600, setCenter);
    },
    [setCenter]
  );

  return { nodesRef, onSelectionChange, navigateToNode, navigateToNodeFromSearch };
}
