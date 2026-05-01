import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Node } from '@xyflow/react';
import type { HistoryEntry } from './useUndoHistory';

interface UseNodeDragUndoOptions {
  nodesRef: MutableRefObject<Node[]>;
  pushSnapshot: (entry: HistoryEntry) => void;
}

export function useNodeDragUndo({ nodesRef, pushSnapshot }: UseNodeDragUndoOptions) {
  const beforeDragRef = useRef<HistoryEntry | null>(null);

  const onNodeDragStart = useCallback(() => {
    beforeDragRef.current = {
      type: 'node-drag',
      nodePositions: nodesRef.current.map(node => ({
        id: node.id,
        position: { ...node.position },
        parentId: node.parentId,
      })),
    };
  }, [nodesRef]);

  const onNodeDragStop = useCallback(() => {
    if (beforeDragRef.current) {
      pushSnapshot(beforeDragRef.current);
      beforeDragRef.current = null;
    }
  }, [pushSnapshot]);

  return { onNodeDragStart, onNodeDragStop };
}
