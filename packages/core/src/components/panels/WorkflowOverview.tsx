import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { NavMapGraph, NavMapHealthStatus, ViewMode } from '../../types';
import type { WorkflowFilter } from '../../workflowFilters';
import {
  getWorkflowFilterOptions,
  workflowFilterLabel,
  workflowFiltersEqual,
} from '../../workflowFilters';

interface WorkflowOverviewProps {
  graph: NavMapGraph | null;
  isDark: boolean;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  activeFilter: WorkflowFilter | null;
  onFilterChange: (filter: WorkflowFilter | null) => void;
}

interface CountItem {
  id: string;
  label: string;
  count: number;
}

interface WorkflowOverviewSummary {
  hasWorkflowSignal: boolean;
  sectionItems: CountItem[];
  personaItems: CountItem[];
  authItems: CountItem[];
  redirectCount: number;
  screenshotCount: number;
  inspectHintCount: number;
  sourceHintCount: number;
  healthCounts: Partial<Record<NavMapHealthStatus, number>>;
  evidenceItems: CountItem[];
  activeFlowName: string | null;
}

const evidenceOrder = ['screenshot', 'inspect', 'source-hint', 'redirect'] as const;

export function WorkflowOverview({
  graph,
  isDark,
  viewMode,
  selectedFlowIndex,
  activeFilter,
  onFilterChange,
}: WorkflowOverviewProps) {
  const summary = useMemo(
    () => buildWorkflowOverviewSummary(graph, selectedFlowIndex),
    [graph, selectedFlowIndex]
  );
  const filterItems = useMemo(() => buildWorkflowFilterItemRows(graph), [graph]);

  if (!graph || !summary.hasWorkflowSignal) return null;

  const evidenceCount =
    summary.screenshotCount + summary.inspectHintCount + summary.sourceHintCount;
  return (
    <aside
      aria-label="Workflow overview"
      data-testid="workflow-overview"
      style={overviewStyle(isDark)}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gap: 2 }}>
          <div style={eyebrowStyle(isDark)}>Workflow</div>
          <div style={titleStyle(isDark)}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {graph.meta.name}
            </span>
            {summary.activeFlowName && viewMode === 'flow' && (
              <span style={flowBadgeStyle(isDark)}>{summary.activeFlowName}</span>
            )}
          </div>
        </div>

        <div style={metricGridStyle}>
          <Metric label="Sections" value={summary.sectionItems.length} isDark={isDark} />
          <Metric label="Personas" value={summary.personaItems.length} isDark={isDark} />
          <Metric label="Auth" value={summary.authItems.length} isDark={isDark} />
          <Metric label="Redirects" value={summary.redirectCount} isDark={isDark} />
          <Metric label="Evidence" value={evidenceCount} isDark={isDark} />
        </div>

        {filterItems.section.length > 0 && (
          <ItemRow
            label="Sections"
            kind="section"
            items={filterItems.section}
            isDark={isDark}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
        )}

        {filterItems.persona.length > 0 && (
          <ItemRow
            label="Personas"
            kind="persona"
            items={filterItems.persona}
            isDark={isDark}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
        )}

        {filterItems.auth.length > 0 && (
          <ItemRow
            label="Auth"
            kind="auth"
            items={filterItems.auth}
            isDark={isDark}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
        )}

        {filterItems.health.length > 0 && (
          <ItemRow
            label="Health"
            kind="health"
            items={filterItems.health}
            isDark={isDark}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            colorsById={healthColors}
          />
        )}

        {filterItems.evidence.length > 0 && (
          <ItemRow
            label="Evidence"
            kind="evidence"
            items={filterItems.evidence}
            isDark={isDark}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
        )}
      </div>
    </aside>
  );
}

function buildWorkflowFilterItemRows(
  graph: NavMapGraph | null
): Record<WorkflowFilter['kind'], CountItem[]> {
  const rows: Record<WorkflowFilter['kind'], CountItem[]> = {
    section: [],
    persona: [],
    auth: [],
    health: [],
    evidence: [],
  };

  for (const option of getWorkflowFilterOptions(graph)) {
    rows[option.filter.kind].push({
      id: option.filter.value,
      label: formatLabel(option.filter.value),
      count: option.count,
    });
  }

  return rows;
}

export function buildWorkflowOverviewSummary(
  graph: NavMapGraph | null,
  selectedFlowIndex: number | null
): WorkflowOverviewSummary {
  const empty: WorkflowOverviewSummary = {
    hasWorkflowSignal: false,
    sectionItems: [],
    personaItems: [],
    authItems: [],
    redirectCount: 0,
    screenshotCount: 0,
    inspectHintCount: 0,
    sourceHintCount: 0,
    healthCounts: {},
    evidenceItems: [],
    activeFlowName: null,
  };

  if (!graph) return empty;

  const sections = new Map<string, number>();
  const personas = new Map<string, number>();
  const authRequirements = new Map<string, number>();
  const healthCounts: Partial<Record<NavMapHealthStatus, number>> = {};
  let expectedRedirectCount = 0;
  let screenshotCount = 0;
  let inspectHintCount = 0;
  let sourceHintCount = 0;

  for (const node of graph.nodes) {
    const metadata = node.metadata;
    if (metadata?.section) increment(sections, metadata.section);
    if (metadata?.authRequirement) increment(authRequirements, metadata.authRequirement);
    for (const persona of metadata?.personas ?? []) increment(personas, persona);
    if (metadata?.health?.status) {
      healthCounts[metadata.health.status] = (healthCounts[metadata.health.status] ?? 0) + 1;
    }
    if (Array.isArray(metadata?.expectedRedirects)) {
      expectedRedirectCount += metadata.expectedRedirects.length;
    }
    if (node.screenshot) screenshotCount += 1;
    if (
      metadata?.inspect &&
      (metadata.inspect.url || metadata.inspect.selector || metadata.inspect.notes)
    ) {
      inspectHintCount += 1;
    }
    if (Array.isArray(metadata?.sourceHints)) {
      sourceHintCount += metadata.sourceHints.length;
    }
  }

  let edgeRedirectCount = 0;
  for (const edge of graph.edges) {
    if (edge.type === 'redirect') edgeRedirectCount += 1;
    for (const persona of edge.personas ?? []) increment(personas, persona);
  }

  for (const flow of graph.flows ?? []) {
    if (!flow.gallery) continue;
    for (const steps of Object.values(flow.gallery)) {
      screenshotCount += steps.filter(step => Boolean(step.screenshot)).length;
    }
  }

  const sectionOrder = graph.meta.workflow?.layout?.sectionOrder ?? [];
  const personaOrder = graph.meta.workflow?.personas?.map(persona => persona.id) ?? [];
  const hasWorkflowSignal = Boolean(
    graph.meta.workflow ||
    sections.size ||
    personas.size ||
    authRequirements.size ||
    expectedRedirectCount ||
    edgeRedirectCount ||
    screenshotCount ||
    inspectHintCount ||
    sourceHintCount ||
    Object.keys(healthCounts).length
  );

  return {
    hasWorkflowSignal,
    sectionItems: toCountItems(sections, sectionOrder),
    personaItems: toCountItems(personas, personaOrder),
    authItems: toCountItems(authRequirements),
    redirectCount: expectedRedirectCount + edgeRedirectCount,
    screenshotCount,
    inspectHintCount,
    sourceHintCount,
    healthCounts,
    evidenceItems: evidenceOrder
      .map(id => ({
        id,
        label: formatLabel(id),
        count:
          id === 'screenshot'
            ? screenshotCount
            : id === 'inspect'
              ? inspectHintCount
              : id === 'source-hint'
                ? sourceHintCount
                : expectedRedirectCount + edgeRedirectCount,
      }))
      .filter(item => item.count > 0),
    activeFlowName:
      selectedFlowIndex !== null ? (graph.flows?.[selectedFlowIndex]?.name ?? null) : null,
  };
}

function Metric({ label, value, isDark }: { label: string; value: number; isDark: boolean }) {
  return (
    <div style={metricStyle(isDark)}>
      <span style={metricValueStyle(isDark)}>{value}</span>
      <span style={metricLabelStyle(isDark)}>{label}</span>
    </div>
  );
}

function ItemRow({
  label,
  kind,
  items,
  isDark,
  activeFilter,
  onFilterChange,
  colorsById,
}: {
  label: string;
  kind: WorkflowFilter['kind'];
  items: CountItem[];
  isDark: boolean;
  activeFilter: WorkflowFilter | null;
  onFilterChange: (filter: WorkflowFilter | null) => void;
  colorsById?: Record<string, string>;
}) {
  const visibleItems = items.slice(0, 5);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div style={{ display: 'grid', gap: 5 }}>
      <div style={rowLabelStyle(isDark)}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {visibleItems.map(item => {
          const filter: WorkflowFilter = { kind, value: item.id };
          const isActive = workflowFiltersEqual(activeFilter, filter);
          const filterLabel = workflowFilterLabel(filter);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isActive}
              aria-label={
                isActive
                  ? `Clear workflow filter ${filterLabel}`
                  : `Filter workflow by ${kind}: ${item.label}`
              }
              onClick={() => onFilterChange(isActive ? null : filter)}
              style={pillStyle(isDark, colorsById?.[item.id], isActive)}
            >
              {item.label} <strong>{item.count}</strong>
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <span style={pillStyle(isDark, undefined, false, false)}>+{hiddenCount}</span>
        )}
      </div>
    </div>
  );
}

function toCountItems(values: Map<string, number>, preferredOrder: string[] = []): CountItem[] {
  const order = new Map(preferredOrder.map((id, index) => [id, index]));
  return Array.from(values.entries())
    .sort(([a, aCount], [b, bCount]) => {
      const aOrder = order.get(a);
      const bOrder = order.get(b);
      if (aOrder !== undefined || bOrder !== undefined) {
        return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
      }
      if (bCount !== aCount) return bCount - aCount;
      return a.localeCompare(b);
    })
    .map(([id, count]) => ({ id, label: formatLabel(id), count }));
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function formatLabel(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase());
}

const healthColors: Record<string, string> = {
  failing: '#ef4444',
  warning: '#e3a52f',
  healthy: '#35b779',
  unchecked: '#7a8496',
  unknown: '#7a8496',
};

function overviewStyle(isDark: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 14,
    width: 'min(392px, calc(100% - 24px))',
    maxHeight: 'calc(100% - 32px)',
    overflow: 'auto',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${isDark ? '#252a38' : '#d8dee9'}`,
    background: isDark ? 'rgba(12, 14, 22, 0.92)' : 'rgba(255, 255, 255, 0.94)',
    boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.28)' : '0 14px 34px rgba(30,42,64,0.12)',
    backdropFilter: 'blur(10px)',
  };
}

function eyebrowStyle(isDark: boolean): CSSProperties {
  return {
    color: isDark ? '#7f8798' : '#687386',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };
}

function titleStyle(isDark: boolean): CSSProperties {
  return {
    color: isDark ? '#f1f4fa' : '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    fontSize: 14,
    fontWeight: 700,
  };
}

function flowBadgeStyle(isDark: boolean): CSSProperties {
  return {
    flex: '0 1 auto',
    minWidth: 0,
    maxWidth: 160,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: isDark ? '#9ec5ff' : '#2554b8',
    background: isDark ? '#152238' : '#e9f0ff',
    border: `1px solid ${isDark ? '#27436d' : '#cbdafa'}`,
    borderRadius: 5,
    padding: '1px 6px',
    fontSize: 11,
    fontWeight: 700,
  };
}

const metricGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 5,
};

function metricStyle(isDark: boolean): CSSProperties {
  return {
    minWidth: 0,
    border: `1px solid ${isDark ? '#242838' : '#dfe5ee'}`,
    background: isDark ? '#111521' : '#f7f9fc',
    borderRadius: 6,
    padding: '5px 4px',
    textAlign: 'center',
  };
}

function metricValueStyle(isDark: boolean): CSSProperties {
  return {
    display: 'block',
    color: isDark ? '#f1f4fa' : '#1f2937',
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.1,
  };
}

function metricLabelStyle(isDark: boolean): CSSProperties {
  return {
    display: 'block',
    color: isDark ? '#7f8798' : '#687386',
    fontSize: 9,
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
}

function rowLabelStyle(isDark: boolean): CSSProperties {
  return {
    color: isDark ? '#7f8798' : '#687386',
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };
}

function pillStyle(
  isDark: boolean,
  accent?: string,
  isActive = false,
  isInteractive = true
): CSSProperties {
  return {
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRadius: 5,
    border: `1px solid ${isActive ? (isDark ? '#78a8ff' : '#3355aa') : (accent ?? (isDark ? '#2a2f40' : '#dbe3ef'))}`,
    background: isActive ? (isDark ? '#17335f' : '#e6efff') : isDark ? '#151925' : '#f4f7fb',
    color: isActive
      ? isDark
        ? '#dce9ff'
        : '#1f3f8f'
      : (accent ?? (isDark ? '#cbd1df' : '#354052')),
    fontSize: 11,
    lineHeight: '17px',
    padding: '1px 6px',
    cursor: isInteractive ? 'pointer' : 'default',
  };
}
