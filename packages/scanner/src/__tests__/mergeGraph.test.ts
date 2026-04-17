import { describe, it, expect } from 'vitest';
import { mergeGraph } from '../ingest/mergeGraph.js';
import type { NavMapGraph } from '@neonwatty/nav-map';

describe('mergeGraph', () => {
  const baseGraph: NavMapGraph = {
    version: '1.0',
    meta: {
      name: 'test-app',
      generatedAt: '2026-04-17T00:00:00Z',
      generatedBy: 'repo-scan',
    },
    nodes: [
      { id: 'home', route: '/', label: 'Home', group: 'marketing' },
      {
        id: 'dashboard',
        route: '/dashboard',
        label: 'Dashboard',
        group: 'app',
      },
      {
        id: 'settings',
        route: '/settings',
        label: 'Settings',
        group: 'app',
      },
      { id: 'about', route: '/about', label: 'About', group: 'marketing' },
    ],
    edges: [{ id: 'e1', source: 'home', target: 'dashboard', type: 'link' }],
    groups: [
      { id: 'marketing', label: 'Marketing' },
      { id: 'app', label: 'App' },
    ],
  };

  const testCoverage = {
    testRuns: [
      {
        id: 'run1',
        name: 'Dashboard test',
        specFile: 'tests/admin.spec.ts',
        status: 'passed' as const,
        duration: 3000,
        startTime: '2026-04-17T10:00:00Z',
        routesVisited: ['/', '/dashboard', '/settings'],
        flow: {
          name: 'Dashboard test',
          steps: ['home', 'dashboard', 'settings'],
          gallery: {},
        },
      },
    ],
    routeCoverage: {
      '/': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [
          {
            id: 'run1',
            name: 'Dashboard test',
            specFile: 'tests/admin.spec.ts',
            status: 'passed' as const,
          },
        ],
        lastRun: '2026-04-17T10:00:00Z',
      },
      '/dashboard': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [
          {
            id: 'run1',
            name: 'Dashboard test',
            specFile: 'tests/admin.spec.ts',
            status: 'passed' as const,
          },
        ],
        lastRun: '2026-04-17T10:00:00Z',
      },
      '/settings': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [
          {
            id: 'run1',
            name: 'Dashboard test',
            specFile: 'tests/admin.spec.ts',
            status: 'passed' as const,
          },
        ],
        lastRun: '2026-04-17T10:00:00Z',
      },
      '/profile': {
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [
          {
            id: 'run1',
            name: 'Dashboard test',
            specFile: 'tests/admin.spec.ts',
            status: 'passed' as const,
          },
        ],
        lastRun: '2026-04-17T10:00:00Z',
      },
    },
  };

  it('annotates matched nodes with coverage data', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const dashboard = merged.nodes.find(n => n.id === 'dashboard');
    expect(dashboard?.coverage).toBeDefined();
    expect(dashboard?.coverage?.status).toBe('covered');
  });

  it('marks unmatched base nodes as uncovered', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const about = merged.nodes.find(n => n.id === 'about');
    expect(about?.coverage?.status).toBe('uncovered');
  });

  it('adds new nodes for test-discovered routes', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const profile = merged.nodes.find(n => n.route === '/profile');
    expect(profile).toBeDefined();
    expect(profile?.metadata?.discoveredBy).toBe('test');
  });

  it('adds test-transition edges for route sequences', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const testEdges = merged.edges.filter(e => e.type === 'test-transition');
    // dashboard → settings is a new transition not in base graph
    const dashToSettings = testEdges.find(e => e.source === 'dashboard' && e.target === 'settings');
    expect(dashToSettings).toBeDefined();
  });

  it('does not duplicate edges already in base graph', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const homeToDb = merged.edges.filter(e => e.source === 'home' && e.target === 'dashboard');
    // Should have the original link edge, not a duplicate test-transition
    expect(homeToDb).toHaveLength(1);
    expect(homeToDb[0].type).toBe('link');
  });

  it('populates flows from test runs', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    expect(merged.flows).toHaveLength(1);
    expect(merged.flows?.[0].name).toBe('Dashboard test');
  });

  it('sets meta.generatedBy to merged', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    expect(merged.meta.generatedBy).toBe('merged');
  });

  it('marks nodes as failing when any test failed', () => {
    const failingCoverage = {
      testRuns: [
        {
          id: 'run1',
          name: 'Failing test',
          specFile: 'tests/fail.spec.ts',
          status: 'failed' as const,
          duration: 1000,
          startTime: '2026-04-17T10:00:00Z',
          routesVisited: ['/dashboard'],
          flow: { name: 'Failing test', steps: ['dashboard'], gallery: {} },
        },
      ],
      routeCoverage: {
        '/dashboard': {
          testCount: 1,
          passCount: 0,
          failCount: 1,
          tests: [
            {
              id: 'run1',
              name: 'Failing test',
              specFile: 'tests/fail.spec.ts',
              status: 'failed' as const,
            },
          ],
          lastRun: '2026-04-17T10:00:00Z',
        },
      },
    };
    const merged = mergeGraph(baseGraph, failingCoverage);
    const dashboard = merged.nodes.find(n => n.id === 'dashboard');
    expect(dashboard?.coverage?.status).toBe('failing');
    expect(dashboard?.coverage?.failCount).toBe(1);
  });

  it('populates correct coverage counts on matched nodes', () => {
    const merged = mergeGraph(baseGraph, testCoverage);
    const dashboard = merged.nodes.find(n => n.id === 'dashboard');
    expect(dashboard?.coverage).toMatchObject({
      status: 'covered',
      testCount: 1,
      passCount: 1,
      failCount: 0,
    });
    expect(dashboard?.coverage?.tests).toHaveLength(1);
    expect(dashboard?.coverage?.tests[0].name).toBe('Dashboard test');
  });
});
