import type { NavMapGraph, ViewMode } from '../../types';

interface StatusBannersProps {
  isDark: boolean;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  treeRootId: string | null;
  focusedGroupId: string | null;
  auditFocusLabel?: string | null;
  focusMode: boolean;
  showCoverage: boolean;
  showSearch: boolean;
  graph: NavMapGraph | null;
  onClearFocus: () => void;
  onClearAuditFocus?: () => void;
  onClearSearch?: () => void;
}

const bannerBase = (isDark: boolean, top = 50): React.CSSProperties => ({
  position: 'absolute',
  top,
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
  auditFocusLabel,
  graph,
  focusMode,
  showCoverage,
  showSearch,
  onClearFocus,
  onClearAuditFocus,
  onClearSearch,
}: StatusBannersProps) {
  const accent = isDark ? '#7aacff' : '#3355aa';
  const muted = isDark ? '#888' : '#666';
  const hasModeBanner =
    (viewMode === 'flow' && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex]) ||
    viewMode === 'tree' ||
    Boolean(focusedGroupId) ||
    Boolean(auditFocusLabel);
  const explanationTop = hasModeBanner ? 88 + (focusedGroupId && auditFocusLabel ? 38 : 0) : 50;

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

      {auditFocusLabel && (
        <div
          style={{
            ...bannerBase(isDark),
            top: focusedGroupId ? 88 : 50,
            fontWeight: 600,
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Audit: {auditFocusLabel}
          <button
            onClick={onClearAuditFocus}
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

      {(focusMode || showCoverage || showSearch) && (
        <div
          style={{
            ...bannerBase(isDark, explanationTop),
            color: muted,
            maxWidth: 520,
            textAlign: 'center',
            lineHeight: 1.45,
          }}
        >
          {showSearch
            ? 'Search is highlighting matching routes and dimming the rest.'
            : focusMode
              ? 'Focus Mode dims unrelated routes after you select a node.'
              : 'Coverage overlay colors routes by test coverage status.'}
          {showSearch && onClearSearch && (
            <button
              onClick={onClearSearch}
              style={{
                marginLeft: 8,
                background: 'none',
                border: 'none',
                color: accent,
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
              }}
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </>
  );
}
