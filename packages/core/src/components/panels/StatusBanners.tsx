import type { NavMapGraph, ViewMode } from '../../types';

interface StatusBannersProps {
  isDark: boolean;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  treeRootId: string | null;
  focusedGroupId: string | null;
  graph: NavMapGraph | null;
  onClearFocus: () => void;
}

const bannerBase = (isDark: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 50,
  left: '50%',
  transform: 'translateX(-50%)',
  background: isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
  border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
  borderRadius: 8,
  padding: '6px 16px',
  zIndex: 20,
  fontSize: 13,
});

export function StatusBanners({
  isDark,
  viewMode,
  selectedFlowIndex,
  treeRootId,
  focusedGroupId,
  graph,
  onClearFocus,
}: StatusBannersProps) {
  const accent = isDark ? '#7aacff' : '#3355aa';
  const muted = isDark ? '#888' : '#666';

  return (
    <>
      {viewMode === 'flow' && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex] && (
        <div style={{ ...bannerBase(isDark), fontWeight: 600, color: accent }}>
          Flow: {graph.flows![selectedFlowIndex].name}
        </div>
      )}

      {viewMode === 'tree' && !treeRootId && (
        <div style={{ ...bannerBase(isDark), color: muted }}>
          Click any node to set it as tree root
        </div>
      )}

      {viewMode === 'tree' && treeRootId && (
        <div style={{ ...bannerBase(isDark), fontWeight: 600, color: accent }}>
          Tree from: {graph?.nodes.find(n => n.id === treeRootId)?.label ?? treeRootId}
        </div>
      )}

      {focusedGroupId && (
        <div
          style={{
            ...bannerBase(isDark),
            fontWeight: 600,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Focused: {graph?.groups?.find(g => g.id === focusedGroupId)?.label ?? focusedGroupId}
          <button
            onClick={onClearFocus}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#555' : '#aaa',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              lineHeight: 1,
            }}
          >
            &#x2715;
          </button>
        </div>
      )}
    </>
  );
}
