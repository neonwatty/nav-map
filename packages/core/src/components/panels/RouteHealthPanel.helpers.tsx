import type { CSSProperties } from 'react';
import type { RouteHealthIssue, RouteHealthIssueType } from '../../utils/routeHealth';

export const severityColor = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#60a5fa',
};

export const issueLabels: Record<RouteHealthIssueType, string> = {
  unreachable: 'Unreachable',
  'dead-end': 'Dead ends',
  orphan: 'No inbound',
  'duplicate-route': 'Duplicates',
  'redirect-loop': 'Redirect loops',
  untested: 'Untested',
};

export function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ color, fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#777' }}>{label}</div>
    </div>
  );
}

export function smallButtonStyle(isDark: boolean): CSSProperties {
  return {
    background: isDark ? '#1a1a28' : '#f0f2f8',
    border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
    borderRadius: 6,
    color: isDark ? '#aaa' : '#555',
    cursor: 'pointer',
    fontSize: 11,
    padding: '4px 8px',
  };
}

export function FilterChip({
  isDark,
  active,
  label,
  count,
  onClick,
}: {
  isDark: boolean;
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? (isDark ? '#4466aa' : '#6688cc') : isDark ? '#2a2a3a' : '#d8dae0'}`,
        background: active ? (isDark ? '#1e2540' : '#e0e8ff') : 'transparent',
        color: active ? (isDark ? '#9bc2ff' : '#3355aa') : isDark ? '#888' : '#666',
        borderRadius: 999,
        padding: '4px 8px',
        fontSize: 11,
        cursor: 'pointer',
      }}
    >
      {label} {count}
    </button>
  );
}

export function groupIssues(issues: RouteHealthIssue[]): RouteHealthIssue[] {
  return [...issues].sort((a, b) => {
    const severityDiff = severityRank(a) - severityRank(b);
    if (severityDiff !== 0) return severityDiff;
    return a.title.localeCompare(b.title);
  });
}

export function countIssueTypes(
  issues: RouteHealthIssue[]
): Partial<Record<RouteHealthIssueType, number>> {
  const counts: Partial<Record<RouteHealthIssueType, number>> = {};
  for (const issue of issues) {
    counts[issue.type] = (counts[issue.type] ?? 0) + 1;
  }
  return counts;
}

function severityRank(issue: RouteHealthIssue): number {
  if (issue.severity === 'high') return 0;
  if (issue.severity === 'medium') return 1;
  return 2;
}
