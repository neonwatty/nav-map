import { useState, useRef, useEffect } from 'react';
import type { NavMapGraph, ViewMode, EdgeMode } from '../../types';
import type { AnalyticsAdapter } from '../../analytics/types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { ViewModeSelector } from './ViewModeSelector';
import { FlowSelector } from './FlowSelector';
import { EdgeOptionsPopover } from './EdgeOptionsPopover';
import { ToolbarMoreMenu } from './ToolbarMoreMenu';
import { toolbarButtonStyle } from './toolbarStyles';

interface NavMapToolbarProps {
  graph: NavMapGraph | null;
  viewMode: ViewMode;
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
}

export function NavMapToolbar({
  graph,
  viewMode,
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
}: NavMapToolbarProps) {
  const { isDark } = useNavMapContext();
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
        zIndex: 15,
      }}
    >
      <ViewModeSelector viewMode={viewMode} onViewModeChange={onViewModeChange} />

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
        graphName={graph?.meta.name}
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
