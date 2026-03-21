import { useRef, useCallback, useState } from 'react';
import type { XYPosition } from '@xyflow/react';

export type HistoryEntry =
  | {
      type: 'node-drag';
      nodePositions: Array<{ id: string; position: XYPosition; parentId?: string }>;
    }
  | { type: 'collapse'; collapsedGroups: Set<string> }
  | { type: 'hierarchy-toggle'; expandedGroups: Set<string> };

export interface UndoHistory {
  pushSnapshot: (entry: HistoryEntry) => void;
  undo: () => HistoryEntry | null;
  canUndo: boolean;
}

export function useUndoHistory(maxSize = 50): UndoHistory {
  const stackRef = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushSnapshot = useCallback(
    (entry: HistoryEntry) => {
      stackRef.current.push(entry);
      if (stackRef.current.length > maxSize) {
        stackRef.current = stackRef.current.slice(-maxSize);
      }
      setCanUndo(true);
    },
    [maxSize]
  );

  const undo = useCallback(() => {
    const entry = stackRef.current.pop() ?? null;
    setCanUndo(stackRef.current.length > 0);
    return entry;
  }, []);

  return { pushSnapshot, undo, canUndo };
}
