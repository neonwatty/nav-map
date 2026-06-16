import type { NavMapGraph, NavMapHealthStatus } from './types';

export type WorkflowFilterKind = 'section' | 'persona' | 'auth' | 'health' | 'evidence';
export type WorkflowEvidenceKind = 'screenshot' | 'inspect' | 'source-hint' | 'redirect';

export interface WorkflowFilter {
  kind: WorkflowFilterKind;
  value: string;
}

export interface WorkflowFilterOption {
  filter: WorkflowFilter;
  label: string;
  /**
   * Total matched graph items used for ordering and display. For node-only filters this equals
   * the matched node count; for filters that can match edges it may include edge matches.
   */
  count: number;
}

export interface WorkflowFilterMatch {
  filter: WorkflowFilter;
  label: string;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

const healthOrder: NavMapHealthStatus[] = ['failing', 'warning', 'healthy', 'unchecked', 'unknown'];
const evidenceOrder: WorkflowEvidenceKind[] = ['screenshot', 'inspect', 'source-hint', 'redirect'];
const kindLabels: Record<WorkflowFilterKind, string> = {
  section: 'Section',
  persona: 'Persona',
  auth: 'Auth',
  health: 'Health',
  evidence: 'Evidence',
};

export function workflowFilterKey(filter: WorkflowFilter | null | undefined): string {
  if (!filter) return '';
  return `${filter.kind}:${filter.value}`;
}

export function workflowFilterLabel(filter: WorkflowFilter | null | undefined): string {
  if (!filter) return '';
  return `${kindLabels[filter.kind]}: ${formatLabel(filter.value)}`;
}

export function workflowFiltersEqual(
  a: WorkflowFilter | null | undefined,
  b: WorkflowFilter | null | undefined
): boolean {
  if (!a || !b) return a === b;
  return a.kind === b.kind && a.value === b.value;
}

export function getWorkflowFilterOptions(
  graph: NavMapGraph | null | undefined
): WorkflowFilterOption[] {
  if (!graph) return [];

  const sections = new Map<string, number>();
  const personas = new Map<string, number>();
  const authRequirements = new Map<string, number>();
  const healthCounts = new Map<string, number>();
  const evidenceCounts = new Map<WorkflowEvidenceKind, number>();

  for (const node of graph.nodes) {
    const metadata = node.metadata;
    if (metadata?.section) increment(sections, metadata.section);
    if (metadata?.authRequirement) increment(authRequirements, metadata.authRequirement);
    for (const persona of uniqueValues(metadata?.personas)) increment(personas, persona);
    if (metadata?.health?.status) increment(healthCounts, metadata.health.status);
    if (node.screenshot) increment(evidenceCounts, 'screenshot');
    if (hasInspectMetadata(metadata)) increment(evidenceCounts, 'inspect');
    if (hasArrayEntries(metadata?.sourceHints)) increment(evidenceCounts, 'source-hint');
    if (hasArrayEntries(metadata?.expectedRedirects)) increment(evidenceCounts, 'redirect');
  }

  for (const edge of graph.edges) {
    for (const persona of uniqueValues(edge.personas)) increment(personas, persona);
    if (edge.type === 'redirect') increment(evidenceCounts, 'redirect');
  }

  const sectionOrder = graph.meta.workflow?.layout?.sectionOrder ?? [];
  const personaOrder = graph.meta.workflow?.personas?.map(persona => persona.id) ?? [];

  return [
    ...toOrderedOptions('section', sections, sectionOrder),
    ...toOrderedOptions('persona', personas, personaOrder),
    ...toOrderedOptions('auth', authRequirements),
    ...toFixedOrderOptions('health', healthCounts, healthOrder),
    ...toFixedOrderOptions('evidence', evidenceCounts, evidenceOrder),
  ];
}

export function matchWorkflowFilter(
  graph: NavMapGraph | null | undefined,
  filter: WorkflowFilter | null | undefined
): WorkflowFilterMatch | null {
  if (!graph || !filter) return null;

  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of graph.nodes) {
    const metadata = node.metadata;
    if (
      (filter.kind === 'section' && metadata?.section === filter.value) ||
      (filter.kind === 'persona' && metadata?.personas?.includes(filter.value)) ||
      (filter.kind === 'auth' && metadata?.authRequirement === filter.value) ||
      (filter.kind === 'health' && metadata?.health?.status === filter.value) ||
      (filter.kind === 'evidence' && nodeMatchesEvidence(node, filter.value))
    ) {
      nodeIds.add(node.id);
    }
  }

  for (const edge of graph.edges) {
    if (
      (filter.kind === 'persona' && edge.personas?.includes(filter.value)) ||
      (filter.kind === 'evidence' && filter.value === 'redirect' && edge.type === 'redirect') ||
      (nodeIds.has(edge.source) && nodeIds.has(edge.target))
    ) {
      edgeIds.add(edge.id);
    }
  }

  if (nodeIds.size === 0 && edgeIds.size === 0) return null;

  return {
    filter,
    label: workflowFilterLabel(filter),
    nodeIds,
    edgeIds,
  };
}

function nodeMatchesEvidence(node: NavMapGraph['nodes'][number], evidence: string): boolean {
  const metadata = node.metadata;
  if (evidence === 'screenshot') return Boolean(node.screenshot);
  if (evidence === 'inspect') return hasInspectMetadata(metadata);
  if (evidence === 'source-hint') return hasArrayEntries(metadata?.sourceHints);
  if (evidence === 'redirect') return hasArrayEntries(metadata?.expectedRedirects);
  return false;
}

function toOrderedOptions(
  kind: WorkflowFilterKind,
  counts: Map<string, number>,
  preferredOrder: string[] = []
): WorkflowFilterOption[] {
  const order = new Map(preferredOrder.map((value, index) => [value, index]));

  return Array.from(counts.entries())
    .sort(([a, aCount], [b, bCount]) => {
      const aOrder = order.get(a);
      const bOrder = order.get(b);
      if (aOrder !== undefined || bOrder !== undefined) {
        return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
      }
      if (bCount !== aCount) return bCount - aCount;
      return formatLabel(a).localeCompare(formatLabel(b));
    })
    .map(([value, count]) => option(kind, value, count));
}

function toFixedOrderOptions(
  kind: WorkflowFilterKind,
  counts: Map<string, number>,
  order: string[]
): WorkflowFilterOption[] {
  return order
    .map(value => option(kind, value, counts.get(value) ?? 0))
    .filter(item => item.count > 0);
}

function option(kind: WorkflowFilterKind, value: string, count: number): WorkflowFilterOption {
  const filter = { kind, value };
  return {
    filter,
    label: workflowFilterLabel(filter),
    count,
  };
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function uniqueValues(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])];
}

function hasArrayEntries(value: unknown): value is readonly unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function hasInspectMetadata(metadata: NavMapGraph['nodes'][number]['metadata']): boolean {
  return Boolean(metadata && Object.prototype.hasOwnProperty.call(metadata, 'inspect'));
}

function formatLabel(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase());
}
