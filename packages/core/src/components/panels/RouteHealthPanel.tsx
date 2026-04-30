import { useMemo } from 'react';
import type { NavMapGraph } from '../../types';
import { analyzeRouteHealth, type RouteHealthIssue } from '../../utils/routeHealth';

interface RouteHealthPanelProps {
  graph: NavMapGraph;
  isDark: boolean;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

const severityColor = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#60a5fa',
};

export function RouteHealthPanel({ graph, isDark, onClose, onNavigate }: RouteHealthPanelProps) {
  const summary = useMemo(() => analyzeRouteHealth(graph), [graph]);
  const groupedIssues = useMemo(() => groupIssues(summary.issues), [summary.issues]);

  return (
    <aside
      style={{
        position: 'absolute',
        top: 58,
        left: 12,
        width: 360,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100vh - 82px)',
        overflow: 'auto',
        background: isDark ? '#14141e' : '#fff',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        borderRadius: 8,
        boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 12px 32px rgba(0,0,0,0.12)',
        zIndex: 30,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: `1px solid ${isDark ? '#222232' : '#eceef4'}`,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#e0e0e8' : '#222' }}>
            Route Health
          </div>
          <div style={{ fontSize: 12, color: isDark ? '#777' : '#667' }}>
            {summary.score}/100 · {summary.totals.routes} routes
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: isDark ? '#777' : '#888',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
          }}
          title="Close route health"
        >
          &#x2715;
        </button>
      </header>

      <div style={{ display: 'flex', gap: 8, padding: '12px 14px' }}>
        <Metric label="High" value={summary.totals.high} color={severityColor.high} />
        <Metric label="Medium" value={summary.totals.medium} color={severityColor.medium} />
        <Metric label="Low" value={summary.totals.low} color={severityColor.low} />
      </div>

      {summary.issues.length === 0 ? (
        <div style={{ padding: '12px 14px', fontSize: 13, color: isDark ? '#888' : '#666' }}>
          No route health issues found.
        </div>
      ) : (
        <div style={{ padding: '0 8px 10px' }}>
          {groupedIssues.map(issue => (
            <button
              key={`${issue.type}-${issue.nodeIds.join('-')}-${issue.title}`}
              onClick={() => onNavigate(issue.nodeIds[0])}
              style={{
                width: '100%',
                display: 'block',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                padding: '9px 8px',
                cursor: 'pointer',
                color: isDark ? '#c8c8d0' : '#333',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark
                  ? 'rgba(91,155,245,0.07)'
                  : 'rgba(51,85,170,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: severityColor[issue.severity],
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{issue.title}</span>
              </div>
              <div style={{ fontSize: 12, color: isDark ? '#777' : '#667', paddingLeft: 15 }}>
                {issue.detail}
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ color, fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#777' }}>{label}</div>
    </div>
  );
}

function groupIssues(issues: RouteHealthIssue[]): RouteHealthIssue[] {
  return [...issues].sort((a, b) => severityRank(a) - severityRank(b));
}

function severityRank(issue: RouteHealthIssue): number {
  if (issue.severity === 'high') return 0;
  if (issue.severity === 'medium') return 1;
  return 2;
}
