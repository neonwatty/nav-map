import type {
  NavMapGraph,
  NavMapNode,
  NavMapEdge,
  NavMapFlow,
  CoverageData,
  CoverageTestRef,
} from '@neonwatty/nav-map';
import { matchRoute } from './routeMatcher.js';

export interface TestRunCoverage {
  id: string;
  name: string;
  specFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  startTime: string;
  routesVisited: string[];
  flow: {
    name: string;
    steps: string[];
    gallery: Record<
      string,
      Array<{
        action: string;
        title: string;
        screenshot?: string;
        timestamp?: number;
      }>
    >;
  };
}

export interface RouteCoverageEntry {
  testCount: number;
  passCount: number;
  failCount: number;
  tests: CoverageTestRef[];
  lastRun: string;
}

export interface TestCoverageData {
  testRuns: TestRunCoverage[];
  routeCoverage: Record<string, RouteCoverageEntry>;
}

function makeCoverageStatus(entry: RouteCoverageEntry): CoverageData['status'] {
  if (entry.failCount > 0) return 'failing';
  return 'covered';
}

function routeToId(route: string): string {
  return route.replace(/^\//, '').replace(/\//g, '-').replace(/[[\]]/g, '') || 'home';
}

export function mergeGraph(base: NavMapGraph, coverage: TestCoverageData): NavMapGraph {
  const nodes: NavMapNode[] = base.nodes.map(n => ({
    ...n,
    metadata: { ...n.metadata },
  }));
  const edges: NavMapEdge[] = [...base.edges];
  const flows: NavMapFlow[] = [...(base.flows ?? [])];

  // Build edge lookup for dedup
  const edgeSet = new Set(edges.map(e => `${e.source}→${e.target}`));

  // Match routes and annotate coverage
  for (const [route, entry] of Object.entries(coverage.routeCoverage)) {
    const match = matchRoute(route, nodes);

    if (match.matched && match.nodeId) {
      const node = nodes.find(n => n.id === match.nodeId)!;
      node.metadata = {
        ...node.metadata,
        coverage: {
          status: makeCoverageStatus(entry),
          testCount: entry.testCount,
          passCount: entry.passCount,
          failCount: entry.failCount,
          tests: entry.tests,
          lastRun: entry.lastRun,
        } satisfies CoverageData,
      };
    } else {
      // New node from test discovery
      const newId = routeToId(route);
      const groupId = route.split('/').filter(Boolean)[0] ?? 'root';
      nodes.push({
        id: newId,
        route,
        label: route.split('/').pop() || route,
        group: groupId,
        metadata: {
          discoveredBy: 'test',
          coverage: {
            status: makeCoverageStatus(entry),
            testCount: entry.testCount,
            passCount: entry.passCount,
            failCount: entry.failCount,
            tests: entry.tests,
            lastRun: entry.lastRun,
          } satisfies CoverageData,
        },
      });
    }
  }

  // Mark uncovered nodes
  for (const node of nodes) {
    if (!node.metadata?.coverage) {
      node.metadata = {
        ...node.metadata,
        coverage: {
          status: 'uncovered',
          testCount: 0,
          passCount: 0,
          failCount: 0,
          tests: [],
          lastRun: '',
        } satisfies CoverageData,
      };
    }
  }

  // Infer edges from test run route sequences
  for (const run of coverage.testRuns) {
    const resolvedIds: string[] = [];
    for (const route of run.routesVisited) {
      const match = matchRoute(route, nodes);
      if (match.matched && match.nodeId) {
        resolvedIds.push(match.nodeId);
      } else {
        resolvedIds.push(routeToId(route));
      }
    }

    for (let i = 0; i < resolvedIds.length - 1; i++) {
      const source = resolvedIds[i];
      const target = resolvedIds[i + 1];
      if (source === target) continue;
      const edgeKey = `${source}→${target}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `test-${source}-${target}`,
          source,
          target,
          type: 'test-transition',
          label: `Test: ${run.name}`,
        });
      }
    }
  }

  // Populate flows
  for (const run of coverage.testRuns) {
    flows.push({
      name: run.flow.name,
      steps: run.flow.steps,
      gallery: run.flow.gallery as NavMapFlow['gallery'],
    });
  }

  // Ensure new groups exist for test-discovered nodes
  const existingGroups = new Set(base.groups.map(g => g.id));
  const groups = [...base.groups];
  for (const node of nodes) {
    if (!existingGroups.has(node.group)) {
      existingGroups.add(node.group);
      groups.push({
        id: node.group,
        label: node.group.charAt(0).toUpperCase() + node.group.slice(1),
      });
    }
  }

  return {
    version: '1.0',
    meta: {
      ...base.meta,
      generatedBy: 'merged',
      generatedAt: new Date().toISOString(),
    },
    nodes,
    edges,
    groups,
    sharedNav: base.sharedNav,
    flows,
  };
}
