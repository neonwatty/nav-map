import type { NavMapGraph, ViewMode } from '../../types';
import type { AnalyticsAdapter } from '../../analytics/types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { ViewModeSelector } from './ViewModeSelector';
import { FlowSelector } from './FlowSelector';
import { ExportButton } from './ExportButton';

interface NavMapToolbarProps {
  graph: NavMapGraph | null;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  showSharedNav: boolean;
  focusMode: boolean;
  useBundledEdges: boolean;
  isAnimatingFlow: boolean;
  showAnalytics: boolean;
  analyticsAdapter?: AnalyticsAdapter;
  onViewModeChange: (mode: ViewMode) => void;
  onFlowSelect: (index: number | null) => void;
  onResetView: () => void;
  onToggleSharedNav: () => void;
  onToggleFocusMode: () => void;
  onToggleBundledEdges: () => void;
  onAnimate: () => void;
  onToggleAnalytics: () => void;
  onSearch: () => void;
  onHelp: () => void;
}

export function NavMapToolbar({
  graph,
  viewMode,
  selectedFlowIndex,
  showSharedNav,
  focusMode,
  useBundledEdges,
  isAnimatingFlow,
  showAnalytics,
  analyticsAdapter,
  onViewModeChange,
  onFlowSelect,
  onResetView,
  onToggleSharedNav,
  onToggleFocusMode,
  onToggleBundledEdges,
  onAnimate,
  onToggleAnalytics,
  onSearch,
  onHelp,
}: NavMapToolbarProps) {
  const { isDark } = useNavMapContext();

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
      <button onClick={onResetView} style={btnStyle(isDark)} title="Reset View (0)">
        Reset View
      </button>
      <button
        onClick={onToggleSharedNav}
        style={btnStyle(isDark, showSharedNav)}
        title="Toggle Shared Nav (N)"
      >
        {showSharedNav ? 'Hide' : 'Show'} Shared Nav
      </button>
      <button
        onClick={onToggleFocusMode}
        style={btnStyle(isDark, focusMode)}
        title="Focus Mode: edges visible on selection only (F)"
      >
        {focusMode ? 'Show Edges' : 'Focus Mode'}
      </button>
      <button
        onClick={onToggleBundledEdges}
        style={btnStyle(isDark, useBundledEdges)}
        title="Toggle Edge Bundling"
      >
        {useBundledEdges ? 'Straight Edges' : 'Bundle Edges'}
      </button>
      {viewMode === 'flow' && selectedFlowIndex !== null && graph?.flows?.[selectedFlowIndex] && (
        <button
          onClick={onAnimate}
          disabled={isAnimatingFlow}
          style={{ ...btnStyle(isDark, isAnimatingFlow), opacity: isAnimatingFlow ? 0.6 : 1 }}
          title="Animate the selected flow"
        >
          {isAnimatingFlow ? 'Animating...' : 'Animate'}
        </button>
      )}
      {analyticsAdapter && (
        <button
          onClick={onToggleAnalytics}
          style={btnStyle(isDark, showAnalytics)}
          title="Toggle Analytics"
        >
          Analytics
        </button>
      )}
      <button onClick={onSearch} style={btnStyle(isDark)} title="Search (/ or ⌘K)">
        Search
      </button>
      <button onClick={onHelp} style={btnStyle(isDark)} title="Help (?)">
        ?
      </button>
      <ExportButton graphName={graph?.meta.name} />
    </div>
  );
}

function btnStyle(isDark: boolean, active = false): React.CSSProperties {
  return {
    background: active ? (isDark ? '#1e2540' : '#e0e8ff') : isDark ? '#14141e' : '#fff',
    border: `1px solid ${active ? (isDark ? '#4466aa' : '#6688cc') : isDark ? '#2a2a3a' : '#d8dae0'}`,
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    color: active ? (isDark ? '#7aacff' : '#3355aa') : isDark ? '#888' : '#666',
    cursor: 'pointer',
  };
}
