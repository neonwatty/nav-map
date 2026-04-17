import { useState, useRef, useEffect } from 'react';
import type { NavMapGraph, ViewMode, EdgeMode } from '../../types';
import type { AnalyticsAdapter } from '../../analytics/types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { ViewModeSelector } from './ViewModeSelector';
import { FlowSelector } from './FlowSelector';
import { ExportButton } from './ExportButton';
import { PanelRow } from './PanelRow';

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

      <button onClick={onResetView} style={btnStyle(isDark)} title="Reset View (0)">
        Reset View
      </button>

      {/* Edges popover — only in map/hierarchy views */}
      {showEdgeControls && (
        <div ref={edgePanelRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowEdgePanel(p => !p)}
            style={btnStyle(isDark, edgeActive || showEdgePanel)}
            title="Edge display options"
          >
            Edges &#x25BE;
          </button>
          {showEdgePanel && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: isDark ? '#14141e' : '#fff',
                border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
                borderRadius: 10,
                padding: '8px 0',
                minWidth: 200,
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              <PanelRow
                isDark={isDark}
                label="Shared Nav"
                shortcut="N"
                active={showSharedNav}
                onClick={onToggleSharedNav}
              />
              <PanelRow
                isDark={isDark}
                label="Redirects"
                shortcut="R"
                active={showRedirects}
                onClick={onToggleRedirects}
              />
              <PanelRow
                isDark={isDark}
                label="Focus Mode"
                shortcut="F"
                active={focusMode}
                onClick={onToggleFocusMode}
              />
              <div
                style={{
                  borderTop: `1px solid ${isDark ? '#1e1e2e' : '#eee'}`,
                  margin: '4px 0',
                }}
              />
              <div style={{ padding: '6px 14px' }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isDark ? '#555' : '#aaa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}
                >
                  Rendering
                </div>
                {(['smooth', 'routed', 'bundled'] as EdgeMode[]).map(mode => (
                  <PanelRow
                    key={mode}
                    isDark={isDark}
                    label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                    active={edgeMode === mode}
                    onClick={() => onEdgeModeChange(mode)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flow animate — only in flow mode */}
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

      {hasCoverageData && (
        <button
          onClick={onToggleCoverage}
          style={btnStyle(isDark, showCoverage)}
          title="Toggle test coverage overlay"
        >
          Coverage
        </button>
      )}

      <button onClick={onSearch} style={btnStyle(isDark)} title="Search (/ or ⌘K)">
        Search
      </button>

      {/* More menu — overflow for secondary actions */}
      <div ref={moreMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMoreMenu(p => !p)}
          style={btnStyle(isDark, showMoreMenu)}
          title="More options"
        >
          &#x22EF;
        </button>
        {showMoreMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: isDark ? '#14141e' : '#fff',
              border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
              borderRadius: 10,
              padding: '4px 0',
              minWidth: 160,
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            {analyticsAdapter && (
              <PanelRow
                isDark={isDark}
                label="Analytics"
                active={showAnalytics}
                onClick={() => {
                  onToggleAnalytics();
                  setShowMoreMenu(false);
                }}
              />
            )}
            <PanelRow
              isDark={isDark}
              label="Help"
              shortcut="?"
              onClick={() => {
                onHelp();
                setShowMoreMenu(false);
              }}
            />
            <div style={{ padding: '4px 8px' }}>
              <ExportButton graphName={graph?.meta.name} />
            </div>
          </div>
        )}
      </div>
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
