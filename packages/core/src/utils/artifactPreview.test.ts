import { describe, expect, it } from 'vitest';
import type { NavMapGraph, NavMapNode } from '../types';
import {
  getArtifactReviewAffordance,
  getArtifactKind,
  getNodePreviewState,
  getPreviewStatusLabel,
  getPreviewStatusMessage,
} from './artifactPreview';

const graph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Preview Demo',
    baseUrl: 'http://localhost:3000',
    generatedAt: '2026-06-19T00:00:00.000Z',
    generatedBy: 'manual',
  },
  nodes: [],
  edges: [],
  groups: [],
};

function node(overrides: Partial<NavMapNode>): NavMapNode {
  return {
    id: 'home',
    route: '/home',
    label: 'Home',
    group: 'app',
    ...overrides,
  };
}

describe('artifact preview helpers', () => {
  it('defaults route nodes to app artifacts with a derived live URL', () => {
    const state = getNodePreviewState(node({ route: '/dashboard' }), graph);

    expect(state.artifactKind).toBe('app');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('http://localhost:3000/dashboard');
    expect(state.liveUrlSource).toBe('graph-base');
    expect(getPreviewStatusLabel(state)).toBe('Target Configured');
    expect(getArtifactReviewAffordance(state)).toMatchObject({
      reviewModeLabel: 'Real app route',
      targetInputLabel: 'App base URL',
      openLabel: 'Open app',
    });
  });

  it('defaults prototype surface nodes to static prototype artifacts', () => {
    const prototype = node({
      id: 'concept',
      route: 'prototype://concept',
      metadata: { kind: 'prototype-surface', surfaceType: 'generated-image' },
    });

    const state = getNodePreviewState(prototype, graph);

    expect(getArtifactKind(prototype)).toBe('prototype');
    expect(state.status).toBe('static');
    expect(state.liveUrl).toBeUndefined();
    expect(getPreviewStatusMessage(state)).toBe(
      'Static reference surface. This prototype has no live preview.'
    );
    expect(getArtifactReviewAffordance(state)).toMatchObject({
      reviewModeLabel: 'Static prototype',
      targetInputLabel: 'Prototype live URL',
      openLabel: 'Open target',
      openTitle:
        'Static prototype has no live target. Use the saved preview or add a prototype live URL.',
    });
  });

  it('keeps path-based prototype surfaces static when no explicit preview URL exists', () => {
    const prototype = node({
      id: 'concept',
      route: '/concept',
      metadata: { kind: 'prototype-surface', surfaceType: 'concept-screen' },
    });

    const state = getNodePreviewState(prototype, graph);

    expect(getArtifactKind(prototype)).toBe('prototype');
    expect(state.status).toBe('static');
    expect(state.liveUrl).toBeUndefined();
  });

  it('prioritizes prototype-surface classification over conflicting artifactKind metadata', () => {
    const prototype = node({
      id: 'concept',
      route: '/concept',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'concept-screen',
        artifactKind: 'app',
      },
    });

    const state = getNodePreviewState(prototype, graph);

    expect(state.artifactKind).toBe('prototype');
    expect(state.status).toBe('static');
    expect(state.liveUrl).toBeUndefined();
  });

  it('prioritizes html-mockup surfaceType over conflicting artifactKind metadata', () => {
    const conflicting = node({
      id: 'home-mockup',
      route: 'prototype://home-mockup',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        artifactKind: 'app',
        preview: {
          liveUrl: '/mockups/home-mockup.html',
          liveStatus: 'available',
        },
      },
    });

    const state = getNodePreviewState(conflicting, graph);

    expect(state.artifactKind).toBe('mockup');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('/mockups/home-mockup.html');
  });

  it('honors explicit prototype preview URLs and marks them available', () => {
    const prototype = node({
      id: 'interactive',
      route: 'prototype://interactive-demo',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'concept-screen',
        preview: {
          liveUrl: '/mockups/interactive-demo.html',
        },
      },
    });

    const state = getNodePreviewState(prototype, graph);

    expect(state.artifactKind).toBe('prototype');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('/mockups/interactive-demo.html');
  });

  it('reports available prototype status with an explicit prototype live URL', () => {
    const state = getNodePreviewState(
      node({
        id: 'prototype-live-message',
        route: 'prototype://prototype-live-message',
        metadata: {
          kind: 'prototype-surface',
          surfaceType: 'concept-screen',
          preview: {
            liveUrl: '/mockups/prototype-live-message.html',
            liveStatus: 'available',
          },
        },
      }),
      graph
    );

    expect(state.artifactKind).toBe('prototype');
    expect(state.status).toBe('available');
    expect(getPreviewStatusMessage(state)).toBe(
      'A live prototype target is configured. Saved screenshots remain the current preview until Target mode verifies the iframe.'
    );
  });

  it('maps html mockup surfaces to mockup artifacts with declared iframe URLs', () => {
    const mockup = node({
      id: 'checkout-mockup',
      route: 'prototype://checkout-mockup',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveUrl: '/mockups/checkout.html',
          liveMode: 'iframe',
          liveStatus: 'available',
          limitations: ['fixture data', 'no real auth'],
        },
      },
    });

    const state = getNodePreviewState(mockup, graph);

    expect(state.artifactKind).toBe('mockup');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('/mockups/checkout.html');
    expect(state.limitations).toEqual(['fixture data', 'no real auth']);
    expect(getArtifactReviewAffordance(state)).toMatchObject({
      reviewModeLabel: 'HTML mockup',
      targetInputLabel: 'Mockup live URL',
      openLabel: 'Open mockup',
    });
  });

  it('ignores non-string preview live URLs', () => {
    const malformedLiveUrl = node({
      id: 'malformed-liveurl',
      route: '/account',
      metadata: {
        preview: {
          liveUrl: 123 as unknown as string,
        },
      },
    });

    const state = getNodePreviewState(malformedLiveUrl, graph);

    expect(state.artifactKind).toBe('app');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('http://localhost:3000/account');
  });

  it('downgrades available status without a usable live URL for app nodes', () => {
    const availableNoUrl = node({
      id: 'missing-url',
      route: '/account',
      metadata: {
        preview: {
          liveStatus: 'available',
        },
      },
    });
    const noBaseGraph: NavMapGraph = {
      ...graph,
      meta: { ...graph.meta, baseUrl: undefined },
    };
    const state = getNodePreviewState(availableNoUrl, noBaseGraph);

    expect(state.artifactKind).toBe('app');
    expect(state.status).toBe('blocked');
    expect(state.liveUrl).toBeUndefined();
    expect(state.blockedReason).toBe('missing-url');
  });

  it('keeps prototype without usable URL as static when available is declared', () => {
    const availableNoUrlPrototype = node({
      id: 'concept',
      route: '/concept',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'concept-screen',
        preview: {
          liveStatus: 'available',
        },
      },
    });

    const state = getNodePreviewState(availableNoUrlPrototype, graph);

    expect(state.artifactKind).toBe('prototype');
    expect(state.status).toBe('static');
    expect(state.liveUrl).toBeUndefined();
  });

  it('ignores whitespace-only liveUrl values', () => {
    const whitespaceLiveUrl = node({
      id: 'whitespace-liveurl',
      route: '/account',
      metadata: {
        preview: {
          liveUrl: '   ',
        },
      },
    });
    const noBaseGraph: NavMapGraph = {
      ...graph,
      meta: { ...graph.meta, baseUrl: undefined },
    };
    const state = getNodePreviewState(whitespaceLiveUrl, noBaseGraph);

    expect(state.artifactKind).toBe('app');
    expect(state.status).toBe('blocked');
    expect(state.liveUrl).toBeUndefined();
  });

  it('ignores non-string base URL values when deriving app live URLs', () => {
    const badBaseGraph: NavMapGraph = {
      ...graph,
      meta: { ...graph.meta, baseUrl: 123 as unknown as string },
    };
    const state = getNodePreviewState(node({ route: '/account' }), badBaseGraph);

    expect(state.artifactKind).toBe('app');
    expect(state.status).toBe('blocked');
    expect(state.blockedReason).toBe('missing-url');
    expect(state.liveUrl).toBeUndefined();
  });

  it('trims whitespace around baseUrl before deriving app live URLs', () => {
    const spacedBaseGraph: NavMapGraph = {
      ...graph,
      meta: { ...graph.meta, baseUrl: ' http://localhost:3000/ ' },
    };
    const state = getNodePreviewState(node({ route: '/dashboard' }), spacedBaseGraph);

    expect(state.artifactKind).toBe('app');
    expect(state.liveUrl).toBe('http://localhost:3000/dashboard');
  });

  it('uses a local app base URL override for app route previews', () => {
    const state = getNodePreviewState(node({ route: '/dashboard' }), graph, {
      appBaseUrl: ' http://localhost:3001/ ',
    });

    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('http://localhost:3001/dashboard');
    expect(state.liveUrlSource).toBe('local-base-override');
  });

  it('uses a local node live URL override before manifest URLs', () => {
    const mockup = node({
      id: 'checkout-mockup',
      route: 'prototype://checkout-mockup',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveUrl: '/mockups/checkout.html',
          liveStatus: 'available',
        },
      },
    });

    const state = getNodePreviewState(mockup, graph, {
      nodeLiveUrls: { 'checkout-mockup': '/local/checkout.html' },
    });

    expect(state.artifactKind).toBe('mockup');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('/local/checkout.html');
    expect(state.liveUrlSource).toBe('local-node-override');
  });

  it('ignores blank local live URL overrides', () => {
    const state = getNodePreviewState(node({ route: '/dashboard' }), graph, {
      appBaseUrl: '   ',
      nodeLiveUrls: { home: '   ' },
    });

    expect(state.liveUrl).toBe('http://localhost:3000/dashboard');
    expect(state.liveUrlSource).toBe('graph-base');
  });

  it('returns only string limitation entries', () => {
    const mixedLimitations: unknown[] = ['fixture data', 123, undefined, 'no real auth'];
    const state = getNodePreviewState(
      node({
        id: 'limitation-mixed-types',
        route: 'prototype://limitation-mixed-types',
        metadata: {
          kind: 'prototype-surface',
          surfaceType: 'concept-screen',
          preview: {
            liveUrl: '/mockups/limitation.html',
            limitations: mixedLimitations as string[],
          },
        },
      }),
      graph
    );

    expect(state.limitations).toEqual(['fixture data', 'no real auth']);
  });

  it('keeps blocked preview reasons explainable', () => {
    const blocked = node({
      route: '/account',
      metadata: {
        preview: {
          liveStatus: 'blocked',
          blockedReason: 'auth-required',
        },
      },
    });

    const state = getNodePreviewState(blocked, graph);

    expect(state.status).toBe('blocked');
    expect(getPreviewStatusLabel(state)).toBe('Target Blocked');
    expect(getPreviewStatusMessage(state)).toBe(
      'Live target blocked because authentication is required.'
    );
  });

  it('ignores malformed artifact kind metadata and falls back to route-derived classification', () => {
    const malformed = node({
      route: '/dashboard',
      metadata: {
        // malformed but structurally possible in serialized JSON
        artifactKind: 'not-a-kind' as unknown as 'app',
      },
    });

    const state = getNodePreviewState(malformed, graph);

    expect(state.artifactKind).toBe('app');
    expect(state.status).toBe('available');
    expect(state.liveUrl).toBe('http://localhost:3000/dashboard');
  });

  it('ignores malformed preview status and mode and falls back to defaults', () => {
    const malformedPreview = node({
      route: '/account',
      metadata: {
        preview: {
          liveStatus: 'frobbed' as unknown as 'available',
          liveMode: 'teleport' as unknown as 'iframe',
          liveUrl: '/account',
          limitations: ['fixture data'],
        },
      },
    });

    const state = getNodePreviewState(malformedPreview, graph);

    expect(state.status).toBe('available');
    expect(state.liveMode).toBe('iframe');
  });

  it('falls back to supported blocked-reason defaults when malformed blocked reason is provided', () => {
    const malformed = node({
      route: '/missing-preview',
      metadata: {
        preview: {
          liveStatus: 'blocked' as unknown as 'available',
          blockedReason: 'invalid' as unknown as 'missing-url',
        },
      },
    });

    const state = getNodePreviewState(malformed, graph);

    expect(state.status).toBe('blocked');
    expect(state.blockedReason).toBe('unsupported');
  });

  it('falls back to missing-url when blocked preview has malformed reason with no live URL', () => {
    const malformed = node({
      route: 'external://missing',
      metadata: {
        preview: {
          liveStatus: 'blocked' as unknown as 'available',
          blockedReason: 'invalid' as unknown as 'missing-url',
        },
      },
    });

    const state = getNodePreviewState(malformed, graph);

    expect(state.status).toBe('blocked');
    expect(state.blockedReason).toBe('missing-url');
  });

  it('returns a cloned limitations array to avoid metadata mutation', () => {
    const limitations = ['fixture data', 'no real auth'];
    const nodeWithLimitations = node({
      id: 'checkout-mockup',
      route: 'prototype://checkout-mockup',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveUrl: '/mockups/checkout.html',
          limitations,
        },
      },
    });

    const state = getNodePreviewState(nodeWithLimitations, graph);

    state.limitations.push('tampered');
    expect(limitations).toEqual(['fixture data', 'no real auth']);
    expect(state.limitations).toEqual(['fixture data', 'no real auth', 'tampered']);
  });
});
