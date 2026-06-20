import { useState, useRef, useEffect } from 'react';
import type {
  NavMapGraph,
  ViewMode,
  EdgeMode,
  NavMapPreviewMode,
  NavMapLiveReadinessSummary,
} from '../../types';
import type { AnalyticsAdapter } from '../../analytics/types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { ViewModeSelector } from './ViewModeSelector';
import { PreviewModeToggle } from './PreviewModeToggle';
import { FlowSelector } from './FlowSelector';
import { EdgeOptionsPopover } from './EdgeOptionsPopover';
import { ToolbarMoreMenu } from './ToolbarMoreMenu';
import { toolbarButtonStyle } from './toolbarStyles';

interface NavMapToolbarProps {
  graph: NavMapGraph | null;
  viewMode: ViewMode;
  previewMode: NavMapPreviewMode;
  selectedFlowIndex: number | null;
  showSharedNav: boolean;
  showRedirects: boolean;
  focusMode: boolean;
  edgeMode: EdgeMode;
  isAnimatingFlow: boolean;
  showAnalytics: boolean;
  showRouteHealth: boolean;
  analyticsAdapter?: AnalyticsAdapter;
  onViewModeChange: (mode: ViewMode) => void;
  onFlowSelect: (index: number | null) => void;
  onResetView: () => void;
  onToggleSharedNav: () => void;
  onToggleRedirects: () => void;
  onToggleFocusMode: () => void;
  onEdgeModeChange: (mode: EdgeMode) => void;
  onAnimate: () => void;
  onToggleAnalytics: () => void;
  onToggleRouteHealth: () => void;
  onSearch: () => void;
  onHelp: () => void;
  showCoverage: boolean;
  hasCoverageData: boolean;
  onToggleCoverage: () => void;
  onPreviewModeChange: (mode: NavMapPreviewMode) => void;
}

export function NavMapToolbar({
  graph,
  viewMode,
  previewMode,
  selectedFlowIndex,
  showSharedNav,
  showRedirects,
  focusMode,
  edgeMode,
  isAnimatingFlow,
  showAnalytics,
  showRouteHealth,
  analyticsAdapter,
  onViewModeChange,
  onFlowSelect,
  onResetView,
  onToggleSharedNav,
  onToggleRedirects,
  onToggleFocusMode,
  onEdgeModeChange,
  onAnimate,
  onToggleAnalytics,
  onToggleRouteHealth,
  onSearch,
  onHelp,
  showCoverage,
  hasCoverageData,
  onToggleCoverage,
  onPreviewModeChange,
}: NavMapToolbarProps) {
  const { isDark, liveReadinessSummary } = useNavMapContext();
  const [showEdgePanel, setShowEdgePanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const edgePanelRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (edgePanelRef.current && !edgePanelRef.current.contains(e.target as Element)) {
        setShowEdgePanel(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Element)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showEdgeControls = viewMode === 'map' || viewMode === 'hierarchy';
  const edgeActive = showSharedNav || showRedirects || !focusMode || edgeMode !== 'smooth';

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        display: 'flex',
        gap: 6,
        zIndex: 60,
      }}
    >
      <ViewModeSelector viewMode={viewMode} onViewModeChange={onViewModeChange} />
      <PreviewModeToggle value={previewMode} isDark={isDark} onChange={onPreviewModeChange} />
      {previewMode === 'live' && liveReadinessSummary && (
        <LiveReadinessSummaryBadge summary={liveReadinessSummary} isDark={isDark} />
      )}

      {(viewMode === 'flow' || viewMode === 'map') && graph?.flows && graph.flows.length > 0 && (
        <FlowSelector
          flows={graph.flows}
          selectedIndex={selectedFlowIndex}
          onSelect={onFlowSelect}
        />
      )}

      <button onClick={onResetView} style={toolbarButtonStyle(isDark)} title="Reset View (0)">
        Reset View
      </button>

      {showEdgeControls && (
        <EdgeOptionsPopover
          isDark={isDark}
          refObject={edgePanelRef}
          isOpen={showEdgePanel}
          isActive={edgeActive}
          showSharedNav={showSharedNav}
          showRedirects={showRedirects}
          focusMode={focusMode}
          edgeMode={edgeMode}
          onToggleOpen={() => setShowEdgePanel(p => !p)}
          onToggleSharedNav={onToggleSharedNav}
          onToggleRedirects={onToggleRedirects}
          onToggleFocusMode={onToggleFocusMode}
          onEdgeModeChange={onEdgeModeChange}
        />
      )}

      {viewMode === 'flow' && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex] && (
        <button
          onClick={onAnimate}
          disabled={isAnimatingFlow}
          style={{
            ...toolbarButtonStyle(isDark, isAnimatingFlow),
            opacity: isAnimatingFlow ? 0.6 : 1,
          }}
          title="Animate the selected flow"
        >
          {isAnimatingFlow ? 'Animating...' : 'Animate'}
        </button>
      )}

      {hasCoverageData && (
        <button
          onClick={onToggleCoverage}
          style={toolbarButtonStyle(isDark, showCoverage)}
          title="Toggle test coverage overlay"
        >
          Coverage
        </button>
      )}

      <button
        onClick={onToggleRouteHealth}
        style={toolbarButtonStyle(isDark, showRouteHealth)}
        title="Show route health audit"
      >
        Audit
      </button>

      <button onClick={onSearch} style={toolbarButtonStyle(isDark)} title="Search (/ or ⌘K)">
        Search
      </button>

      <ToolbarMoreMenu
        isDark={isDark}
        refObject={moreMenuRef}
        isOpen={showMoreMenu}
        graph={graph}
        graphName={graph?.meta.name}
        selectedFlowIndex={selectedFlowIndex}
        viewMode={viewMode}
        hasAnalytics={Boolean(analyticsAdapter)}
        showAnalytics={showAnalytics}
        showRouteHealth={showRouteHealth}
        onToggleOpen={() => setShowMoreMenu(p => !p)}
        onClose={() => setShowMoreMenu(false)}
        onToggleAnalytics={onToggleAnalytics}
        onToggleRouteHealth={onToggleRouteHealth}
        onHelp={onHelp}
      />
    </div>
  );
}

function LiveReadinessSummaryBadge({
  summary,
  isDark,
}: {
  summary: NavMapLiveReadinessSummary;
  isDark: boolean;
}) {
  const hasWarning = summary.offline > 0 || summary.unavailable > 0 || summary.blocked > 0;
  const text = formatLiveReadinessSummary(summary);

  return (
    <div
      aria-label="Live readiness summary"
      title={text}
      style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 32,
        maxWidth: 280,
        padding: '0 10px',
        borderRadius: 7,
        border: `1px solid ${
          hasWarning ? (isDark ? '#7f1d1d' : '#fecaca') : isDark ? '#1f3a2f' : '#bbf7d0'
        }`,
        background: hasWarning ? (isDark ? '#1b1115' : '#fff1f2') : isDark ? '#0f1a16' : '#ecfdf5',
        color: hasWarning ? (isDark ? '#fca5a5' : '#991b1b') : isDark ? '#86efac' : '#166534',
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {text}
    </div>
  );
}

function formatLiveReadinessSummary(summary: NavMapLiveReadinessSummary): string {
  if (summary.total === 0) return 'Live: no targets';
  if (summary.checking > 0) {
    return `Live: checking ${summary.checking}/${summary.total}`;
  }

  const parts = [
    summary.reachable > 0 ? `${summary.reachable} ready` : '',
    summary.offline > 0 ? `${summary.offline} offline` : '',
    summary.static > 0 ? `${summary.static} static` : '',
    summary.blocked > 0 ? `${summary.blocked} blocked` : '',
    summary.unavailable > 0 ? `${summary.unavailable} no live` : '',
  ].filter(Boolean);

  return `Live: ${parts.join(' / ')}`;
}
