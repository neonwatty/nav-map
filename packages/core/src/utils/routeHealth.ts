import type { NavMapGraph, NavMapNode } from '../types';

export type RouteHealthIssueType =
  | 'unreachable'
  | 'dead-end'
  | 'orphan'
  | 'duplicate-route'
  | 'redirect-loop'
  | 'untested';

export interface RouteHealthIssue {
  type: RouteHealthIssueType;
  severity: 'high' | 'medium' | 'low';
  nodeIds: string[];
  title: string;
  detail: string;
}

export interface RouteHealthSummary {
  issues: RouteHealthIssue[];
  score: number;
  totals: {
    routes: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function formatRouteHealthReport(graph: NavMapGraph): string {
  const summary = analyzeRouteHealth(graph);
  const lines = [
    `# Route Health: ${graph.meta.name}`,
    '',
    `Score: ${summary.score}/100`,
    `Routes: ${summary.totals.routes}`,
    `Issues: ${summary.issues.length} (${summary.totals.high} high, ${summary.totals.medium} medium, ${summary.totals.low} low)`,
  ];

  if (summary.issues.length === 0) {
    lines.push('', 'No route health issues found.');
    return lines.join('\n');
  }

  lines.push('');
  for (const issue of groupIssues(summary.issues)) {
    lines.push(`- [${issue.severity.toUpperCase()}] ${issue.title}`);
    lines.push(`  ${issue.detail}`);
  }

  return lines.join('\n');
}

export function analyzeRouteHealth(graph: NavMapGraph): RouteHealthSummary {
  const nodesById = new Map(graph.nodes.map(node => [node.id, node]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const issues: RouteHealthIssue[] = [];
  const hasCoverageData = graph.nodes.some(node => node.coverage !== undefined);

  for (const node of graph.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  }

  const roots = findRootNodes(graph.nodes);
  const reachable = findReachableNodes(roots, adjacency);

  for (const node of graph.nodes) {
    const isRoot = roots.some(root => root.id === node.id);
    const inCount = incoming.get(node.id) ?? 0;
    const outCount = outgoing.get(node.id) ?? 0;

    if (!reachable.has(node.id)) {
      issues.push({
        type: 'unreachable',
        severity: 'high',
        nodeIds: [node.id],
        title: `${node.label} is unreachable`,
        detail: `${node.route} cannot be reached from the likely entry route.`,
      });
    }

    if (!isRoot && inCount === 0) {
      issues.push({
        type: 'orphan',
        severity: 'medium',
        nodeIds: [node.id],
        title: `${node.label} has no inbound links`,
        detail: `${node.route} may be discoverable only by direct URL or scanner limitations.`,
      });
    }

    if (outCount === 0 && !looksTerminal(node)) {
      issues.push({
        type: 'dead-end',
        severity: 'low',
        nodeIds: [node.id],
        title: `${node.label} is a dead end`,
        detail: `${node.route} has no outgoing navigation edges.`,
      });
    }

    if (hasCoverageData && (node.coverage?.status === 'uncovered' || !node.coverage)) {
      issues.push({
        type: 'untested',
        severity: 'low',
        nodeIds: [node.id],
        title: `${node.label} has no passing route coverage`,
        detail: `${node.route} is not connected to passing test coverage data.`,
      });
    }
  }

  for (const duplicateGroup of findDuplicateRoutes(graph.nodes)) {
    issues.push({
      type: 'duplicate-route',
      severity: 'medium',
      nodeIds: duplicateGroup.map(node => node.id),
      title: `Duplicate route: ${duplicateGroup[0].route}`,
      detail: duplicateGroup.map(node => node.label).join(', '),
    });
  }

  for (const loop of findRedirectLoops(graph)) {
    issues.push({
      type: 'redirect-loop',
      severity: 'high',
      nodeIds: loop,
      title: 'Possible redirect loop',
      detail: loop.map(id => nodesById.get(id)?.route ?? id).join(' -> '),
    });
  }

  const totals = {
    routes: graph.nodes.length,
    high: issues.filter(issue => issue.severity === 'high').length,
    medium: issues.filter(issue => issue.severity === 'medium').length,
    low: issues.filter(issue => issue.severity === 'low').length,
  };

  const penalty = totals.high * 18 + totals.medium * 8 + totals.low * 2;
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return { issues, score, totals };
}

function groupIssues(issues: RouteHealthIssue[]): RouteHealthIssue[] {
  return [...issues].sort((a, b) => {
    const severityDiff = severityRank(a) - severityRank(b);
    if (severityDiff !== 0) return severityDiff;
    return a.title.localeCompare(b.title);
  });
}

function severityRank(issue: RouteHealthIssue): number {
  if (issue.severity === 'high') return 0;
  if (issue.severity === 'medium') return 1;
  return 2;
}

function findRootNodes(nodes: NavMapNode[]): NavMapNode[] {
  const explicitRoot = nodes.find(node => node.route === '/');
  if (explicitRoot) return [explicitRoot];
  const shallowestDepth = Math.min(...nodes.map(node => routeDepth(node.route)));
  return nodes.filter(node => routeDepth(node.route) === shallowestDepth);
}

function findReachableNodes(roots: NavMapNode[], adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const queue = roots.map(root => root.id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return visited;
}

function findDuplicateRoutes(nodes: NavMapNode[]): NavMapNode[][] {
  const byRoute = new Map<string, NavMapNode[]>();
  for (const node of nodes) {
    const existing = byRoute.get(node.route) ?? [];
    existing.push(node);
    byRoute.set(node.route, existing);
  }
  return Array.from(byRoute.values()).filter(group => group.length > 1);
}

function findRedirectLoops(graph: NavMapGraph): string[][] {
  const redirectTargets = new Map<string, string>();
  for (const edge of graph.edges) {
    if (edge.type === 'redirect') redirectTargets.set(edge.source, edge.target);
  }

  const loops: string[][] = [];
  const seenKeys = new Set<string>();

  for (const start of redirectTargets.keys()) {
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let current: string | undefined = start;

    while (current) {
      const existingIndex = pathIndex.get(current);
      if (existingIndex !== undefined) {
        const loop = path.slice(existingIndex);
        const key = [...loop].sort().join('|');
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          loops.push([...loop, current]);
        }
        break;
      }
      pathIndex.set(current, path.length);
      path.push(current);
      current = redirectTargets.get(current);
    }
  }

  return loops;
}

function routeDepth(route: string): number {
  return route.split('/').filter(Boolean).length;
}

function looksTerminal(node: NavMapNode): boolean {
  const value = `${node.route} ${node.label}`.toLowerCase();
  return value.includes('logout') || value.includes('thank') || value.includes('404');
}
