import { useEffect, useRef } from 'react';
import type { Node } from '@xyflow/react';

interface UseFocusEffectsOptions {
  focusedGroupId: string | null;
  nodes: Node[];
  fitView: (options?: { nodes?: { id: string }[]; padding?: number; duration?: number }) => void;
}

/**
 * Zooms to the focused group when group focus mode changes.
 * Owns prevFocusedGroupRef internally.
 */
export function useFocusEffects({ focusedGroupId, nodes, fitView }: UseFocusEffectsOptions): void {
  const prevFocusedGroupRef = useRef<string | null>(null);

  useEffect(() => {
    if (focusedGroupId === prevFocusedGroupRef.current) return;
    prevFocusedGroupRef.current = focusedGroupId;
    if (!focusedGroupId) {
      fitView({ padding: 0.15, duration: 300 });
      return;
    }
    const focusedNodes = nodes
      .filter(n => {
        if (n.type === 'groupNode') {
          return (n.data as Record<string, unknown>).groupId === focusedGroupId;
        }
        return (n.data as Record<string, unknown>).group === focusedGroupId;
      })
      .map(n => ({ id: n.id }));
    if (focusedNodes.length > 0) {
      fitView({ nodes: focusedNodes, padding: 0.3, duration: 300 });
    }
  }, [focusedGroupId, nodes, fitView]);
}
