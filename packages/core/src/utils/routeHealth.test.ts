import { describe, expect, it } from 'vitest';
import type { NavMapGraph } from '../types';
import { analyzeRouteHealth, formatRouteHealthReport } from './routeHealth';

const baseGraph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01T00:00:00Z', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    { id: 'docs', route: '/docs', label: 'Docs', group: 'docs' },
    { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
    { id: 'duplicate-a', route: '/dup', label: 'Duplicate A', group: 'app' },
    { id: 'duplicate-b', route: '/dup', label: 'Duplicate B', group: 'app' },
  ],
  edges: [{ id: 'home-docs', source: 'home', target: 'docs', type: 'link' }],
  groups: [
    { id: 'root', label: 'Root' },
    { id: 'docs', label: 'Docs' },
    { id: 'app', label: 'App' },
  ],
};

describe('analyzeRouteHealth', () => {
  it('flags unreachable routes, dead ends, and duplicates', () => {
    const summary = analyzeRouteHealth(baseGraph);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'unreachable', nodeIds: ['settings'] }),
        expect.objectContaining({ type: 'dead-end', nodeIds: ['docs'] }),
        expect.objectContaining({
          type: 'duplicate-route',
          nodeIds: ['duplicate-a', 'duplicate-b'],
        }),
      ])
    );
    expect(summary.issues.some(issue => issue.type === 'untested')).toBe(false);
    expect(summary.totals.high).toBeGreaterThan(0);
    expect(summary.score).toBeLessThan(100);
  });

  it('only flags untested routes when the graph includes coverage data', () => {
    const graph: NavMapGraph = {
      ...baseGraph,
      nodes: [
        {
          id: 'home',
          route: '/',
          label: 'Home',
          group: 'root',
          coverage: {
            status: 'covered',
            testCount: 1,
            passCount: 1,
            failCount: 0,
            tests: [],
            lastRun: '2026-01-01T00:00:00Z',
          },
        },
        { id: 'docs', route: '/docs', label: 'Docs', group: 'docs' },
      ],
      edges: [{ id: 'home-docs', source: 'home', target: 'docs', type: 'link' }],
    };

    expect(analyzeRouteHealth(graph).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'untested', nodeIds: ['docs'] })])
    );
  });

  it('detects redirect loops', () => {
    const graph: NavMapGraph = {
      ...baseGraph,
      nodes: [
        { id: 'home', route: '/', label: 'Home', group: 'root' },
        { id: 'a', route: '/a', label: 'A', group: 'app' },
        { id: 'b', route: '/b', label: 'B', group: 'app' },
      ],
      edges: [
        { id: 'home-a', source: 'home', target: 'a', type: 'link' },
        { id: 'a-b', source: 'a', target: 'b', type: 'redirect' },
        { id: 'b-a', source: 'b', target: 'a', type: 'redirect' },
      ],
    };

    expect(analyzeRouteHealth(graph).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'redirect-loop' })])
    );
  });

  it('formats a markdown audit report', () => {
    const report = formatRouteHealthReport(baseGraph);

    expect(report).toContain('# Route Health: Test');
    expect(report).toContain('Score:');
    expect(report).toContain('[HIGH] Settings is unreachable');
    expect(report).not.toContain('[LOW] Home has no passing route coverage');
  });
});
