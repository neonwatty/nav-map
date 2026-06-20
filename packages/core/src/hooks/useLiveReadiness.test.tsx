import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../types';
import { buildLiveReadinessPlan, useLiveReadiness } from './useLiveReadiness';

const graph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Live Readiness Test',
    baseUrl: 'http://localhost:3000',
    generatedAt: '2026-01-01T00:00:00.000Z',
    generatedBy: 'manual',
  },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'app' },
    { id: 'dashboard', route: '/dashboard', label: 'Dashboard', group: 'app' },
    {
      id: 'mockup',
      route: 'prototype://mockup',
      label: 'Mockup',
      group: 'prototype',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveStatus: 'available',
          liveMode: 'iframe',
          liveUrl: '/mockups/mockup.html',
        },
      },
    },
    {
      id: 'concept',
      route: 'prototype://concept',
      label: 'Concept',
      group: 'prototype',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'generated-image',
      },
    },
    {
      id: 'auth',
      route: '/auth',
      label: 'Auth',
      group: 'app',
      metadata: {
        preview: {
          liveStatus: 'blocked',
          blockedReason: 'auth-required',
        },
      },
    },
  ],
  edges: [],
  groups: [
    { id: 'app', label: 'App' },
    { id: 'prototype', label: 'Prototype' },
  ],
  flows: [{ name: 'Primary', steps: ['home', 'concept'] }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLiveReadiness', () => {
  it('plans the current flow plus the selected node', () => {
    const plan = buildLiveReadinessPlan({
      graph,
      previewMode: 'live',
      viewMode: 'flow',
      selectedFlowIndex: 0,
      selectedNodeId: 'mockup',
    });

    expect(Object.keys(plan.byNode).sort()).toEqual(['concept', 'home', 'mockup']);
    expect(plan.scope).toBe('current-flow');
    expect(plan.byNode.home.status).toBe('checking');
    expect(plan.byNode.mockup.status).toBe('checking');
    expect(plan.byNode.concept.status).toBe('static');
    expect(plan.probes.map(probe => probe.nodeId).sort()).toEqual(['home', 'mockup']);
  });

  it('marks reachable, offline, static, and blocked nodes in graph mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/dashboard')) {
          return Promise.reject(new TypeError('connection refused'));
        }
        return Promise.resolve(new Response(null, { status: 200 }));
      })
    );

    const { result } = renderHook(() =>
      useLiveReadiness({
        graph,
        previewMode: 'live',
        viewMode: 'map',
        selectedFlowIndex: null,
        selectedNodeId: null,
      })
    );

    expect(result.current.liveReadinessSummary.total).toBe(5);
    expect(result.current.liveReadinessSummary.checking).toBe(3);

    await waitFor(() => {
      expect(result.current.liveReadinessByNode.home.status).toBe('reachable');
      expect(result.current.liveReadinessByNode.mockup.status).toBe('reachable');
      expect(result.current.liveReadinessByNode.dashboard.status).toBe('offline');
    });

    expect(result.current.liveReadinessByNode.concept.status).toBe('static');
    expect(result.current.liveReadinessByNode.auth.status).toBe('blocked');
    expect(result.current.liveReadinessSummary).toMatchObject({
      total: 5,
      reachable: 2,
      offline: 1,
      static: 1,
      blocked: 1,
      unavailable: 0,
    });
  });

  it('marks inspectable HTTP error responses offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 })))
    );

    const { result } = renderHook(() =>
      useLiveReadiness({
        graph,
        previewMode: 'live',
        viewMode: 'flow',
        selectedFlowIndex: 0,
        selectedNodeId: null,
      })
    );

    await waitFor(() => {
      expect(result.current.liveReadinessByNode.home.status).toBe('offline');
    });
    expect(result.current.liveReadinessByNode.home.message).toBe(
      'Live target returned an error response.'
    );
  });

  it('keeps non-iframe live targets ready without probing them', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const browserGraph: NavMapGraph = {
      ...graph,
      nodes: [
        {
          id: 'external-mockup',
          route: 'prototype://external-mockup',
          label: 'External Mockup',
          group: 'prototype',
          metadata: {
            kind: 'prototype-surface',
            surfaceType: 'html-mockup',
            preview: {
              liveStatus: 'available',
              liveMode: 'browser',
              liveUrl: 'https://example.test/mockup',
            },
          },
        },
      ],
      edges: [],
      flows: undefined,
    };

    const plan = buildLiveReadinessPlan({
      graph: browserGraph,
      previewMode: 'live',
      viewMode: 'map',
      selectedFlowIndex: null,
      selectedNodeId: null,
    });

    expect(plan.byNode['external-mockup']).toMatchObject({
      status: 'reachable',
      liveUrl: 'https://example.test/mockup',
      message: 'Live target opens outside the inline preview.',
    });
    expect(plan.probes).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not re-probe graph scope when selection changes', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
    vi.stubGlobal('fetch', fetchSpy);

    const { rerender } = renderHook(
      ({ selectedNodeId }) =>
        useLiveReadiness({
          graph,
          previewMode: 'live',
          viewMode: 'map',
          selectedFlowIndex: null,
          selectedNodeId,
        }),
      { initialProps: { selectedNodeId: 'home' } }
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    rerender({ selectedNodeId: 'dashboard' });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('does not preflight while screenshot mode is active', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() =>
      useLiveReadiness({
        graph,
        previewMode: 'screenshots',
        viewMode: 'map',
        selectedFlowIndex: null,
        selectedNodeId: null,
      })
    );

    expect(result.current.liveReadinessByNode).toEqual({});
    expect(result.current.liveReadinessSummary.total).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
