import { useCallback, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Node } from '@xyflow/react';

interface NavMapContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  route: string;
  filePath?: string;
}

export function useNavMapContextMenu() {
  const [contextMenu, setContextMenu] = useState<NavMapContextMenuState | null>(null);

  const onNodeContextMenu = useCallback((event: ReactMouseEvent, node: Node) => {
    event.preventDefault();
    const data = node.data as Record<string, unknown>;
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      route: (data.route as string) ?? '',
      filePath: data.filePath as string | undefined,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return { contextMenu, onNodeContextMenu, closeContextMenu };
}
