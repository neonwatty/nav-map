import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NavMapGraph } from '../types';
import { useNavMapInsights } from './useNavMapInsights';

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    {
      id: 'settings',
      route: '/settings',
      label: 'Settings',
      group: 'app',
      coverage: {
        status: 'covered',
        testCount: 1,
        passCount: 1,
        failCount: 0,
        tests: [
          {
            id: 'settings-test',
            name: 'settings route',
            specFile: 'settings.spec.ts',
            status: 'passed',
          },
        ],
        lastRun: '2026-05-01T00:00:00.000Z',
      },
    },
  ],
  edges: [],
  groups: [{ id: 'root', label: 'Root' }],
};

describe('useNavMapInsights', () => {
  it('returns no search matches when search is hidden', () => {
    const { result } = renderHook(() =>
      useNavMapInsights({ graph, showSearch: false, searchQuery: 'settings' })
    );

    expect(result.current.searchMatchIds).toBeNull();
  });

  it('matches search query against node label, route, and group', () => {
    const { result: labelResult } = renderHook(() =>
      useNavMapInsights({ graph, showSearch: true, searchQuery: 'settings' })
    );
    const { result: routeResult } = renderHook(() =>
      useNavMapInsights({ graph, showSearch: true, searchQuery: '/settings' })
    );
    const { result: groupResult } = renderHook(() =>
      useNavMapInsights({ graph, showSearch: true, searchQuery: 'app' })
    );

    expect([...labelResult.current.searchMatchIds!]).toEqual(['settings']);
    expect([...routeResult.current.searchMatchIds!]).toEqual(['settings']);
    expect([...groupResult.current.searchMatchIds!]).toEqual(['settings']);
  });

  it('tracks audit focus labels and node ids', () => {
    const { result } = renderHook(() =>
      useNavMapInsights({ graph, showSearch: false, searchQuery: '' })
    );

    act(() => {
      result.current.handleAuditIssueFocus({
        type: 'untested',
        severity: 'low',
        title: 'Missing coverage',
        detail: 'Settings route has no tests',
        nodeIds: ['settings'],
      });
    });

    expect(result.current.auditFocus?.label).toBe('Missing coverage');
    expect([...result.current.auditFocusNodeIds!]).toEqual(['settings']);
  });

  it('detects coverage data and toggles coverage visibility', () => {
    const { result } = renderHook(() =>
      useNavMapInsights({ graph, showSearch: false, searchQuery: '' })
    );

    expect(result.current.hasCoverageData).toBe(true);
    expect(result.current.showCoverage).toBe(false);

    act(() => {
      result.current.setShowCoverage(true);
    });

    expect(result.current.showCoverage).toBe(true);
  });
});
