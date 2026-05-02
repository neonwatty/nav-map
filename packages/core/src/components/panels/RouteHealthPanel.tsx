import { useMemo, useState } from 'react';
import type { NavMapGraph } from '../../types';
import {
  analyzeRouteHealth,
  formatRouteHealthReport,
  type RouteHealthIssue,
  type RouteHealthIssueType,
} from '../../utils/routeHealth';
import {
  countIssueTypes,
  FilterChip,
  groupIssues,
  issueLabels,
  Metric,
  severityColor,
  smallButtonStyle,
} from './RouteHealthPanel.helpers';

interface RouteHealthPanelProps {
  graph: NavMapGraph;
  isDark: boolean;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
  onIssueFocus?: (issue: RouteHealthIssue) => void;
}

export function RouteHealthPanel({
  graph,
  isDark,
  onClose,
  onNavigate,
  onIssueFocus,
}: RouteHealthPanelProps) {
  const [activeType, setActiveType] = useState<RouteHealthIssueType | 'all'>('all');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const summary = useMemo(() => analyzeRouteHealth(graph), [graph]);
  const issueCounts = useMemo(() => countIssueTypes(summary.issues), [summary.issues]);
  const groupedIssues = useMemo(() => {
    const visibleIssues =
      activeType === 'all'
        ? summary.issues
        : summary.issues.filter(issue => issue.type === activeType);
    return groupIssues(visibleIssues);
  }, [activeType, summary.issues]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(formatRouteHealthReport(graph));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 1800);
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={copyReport}
            style={smallButtonStyle(isDark)}
            title="Copy route health report"
          >
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Failed' : 'Copy'}
          </button>
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
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, padding: '12px 14px' }}>
        <Metric label="High" value={summary.totals.high} color={severityColor.high} />
        <Metric label="Medium" value={summary.totals.medium} color={severityColor.medium} />
        <Metric label="Low" value={summary.totals.low} color={severityColor.low} />
      </div>

      {summary.issues.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            padding: '0 14px 12px',
            borderBottom: `1px solid ${isDark ? '#222232' : '#eceef4'}`,
          }}
        >
          <FilterChip
            isDark={isDark}
            active={activeType === 'all'}
            label="All"
            count={summary.issues.length}
            onClick={() => setActiveType('all')}
          />
          {Object.entries(issueLabels).map(([type, label]) => {
            const count = issueCounts[type as RouteHealthIssueType] ?? 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={type}
                isDark={isDark}
                active={activeType === type}
                label={label}
                count={count}
                onClick={() => setActiveType(type as RouteHealthIssueType)}
              />
            );
          })}
        </div>
      )}

      {summary.issues.length === 0 ? (
        <div style={{ padding: '12px 14px', fontSize: 13, color: isDark ? '#888' : '#666' }}>
          No route health issues found.
        </div>
      ) : groupedIssues.length === 0 ? (
        <div style={{ padding: '12px 14px', fontSize: 13, color: isDark ? '#888' : '#666' }}>
          No issues match this filter.
        </div>
      ) : (
        <div style={{ padding: '0 8px 10px' }}>
          {groupedIssues.map(issue => (
            <button
              key={`${issue.type}-${issue.nodeIds.join('-')}-${issue.title}`}
              onClick={() => {
                onIssueFocus?.(issue);
                onNavigate(issue.nodeIds[0]);
              }}
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
