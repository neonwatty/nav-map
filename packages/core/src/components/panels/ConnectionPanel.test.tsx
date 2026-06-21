import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavMapContext } from '../../hooks/useNavMap';
import type { NavMapContextValue } from '../../hooks/useNavMap';
import type { NavMapEdge, NavMapNode } from '../../types';
import { ConnectionPanel } from './ConnectionPanel';

const context: NavMapContextValue = {
  graph: null,
  selectedNodeId: null,
  setSelectedNodeId: () => {},
  isDark: true,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#101018', border: '#3355aa', text: '#d0d4e0' }),
  focusedGroupId: null,
  edgeMode: 'smooth',
  showCoverage: false,
  previewMode: 'screenshots',
};

const node: NavMapNode = {
  id: 'quick-setup',
  route: '/quick-setup',
  label: 'Quick Setup',
  group: 'studio',
  metadata: {
    purpose: 'Create, review, and publish a generated PRcard.',
    section: 'studio',
    authRequirement: 'signed-in',
    personas: ['signed-in', 'github-connected'],
    expectedRedirects: [{ when: 'signed-out', to: '/signup', reason: 'Requires session' }],
    health: { status: 'warning', message: 'Signed-out state redirects.' },
    inspect: { selector: 'main', notes: 'Primary first-run setup surface.' },
  },
};

const nodes: NavMapNode[] = [
  node,
  { id: 'creator', route: '/creator', label: 'Creator', group: 'studio' },
];

const edges: NavMapEdge[] = [
  {
    id: 'quick-setup-to-creator',
    source: 'quick-setup',
    target: 'creator',
    type: 'router-push',
    label: 'Publish draft',
  },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ConnectionPanel workflow metadata', () => {
  it('renders workflow atlas metadata for the selected node', () => {
    render(
      <NavMapContext.Provider value={context}>
        <ConnectionPanel node={node} nodes={nodes} edges={edges} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    expect(screen.getByText('Purpose')).toBeTruthy();
    expect(screen.getByText('Create, review, and publish a generated PRcard.')).toBeTruthy();
    expect(screen.getAllByText('Signed In')).toHaveLength(2);
    expect(screen.getByText('Github Connected')).toBeTruthy();
    expect(screen.getByText('/signup')).toBeTruthy();
    expect(screen.getByText('Requires session')).toBeTruthy();
    expect(screen.getByText('Warning - Signed-out state redirects.')).toBeTruthy();
    expect(screen.getByText('main')).toBeTruthy();
    expect(screen.getByText('Primary first-run setup surface.')).toBeTruthy();
  });

  it('renders prototype surface metadata for concept nodes', () => {
    const surfaceNode: NavMapNode = {
      id: 'quick-setup-concept',
      route: 'prototype://quick-setup-concept',
      label: 'Quick Setup Concept',
      group: 'prototype',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'generated-image',
        purpose: 'Explore the first-run concept before implementation.',
        section: 'prototype',
      },
    };

    render(
      <NavMapContext.Provider value={context}>
        <ConnectionPanel
          node={surfaceNode}
          nodes={[surfaceNode]}
          edges={[]}
          onNavigate={() => {}}
        />
      </NavMapContext.Provider>
    );

    expect(screen.getByText('Surface Details')).toBeTruthy();
    expect(screen.getByText('Preview')).toBeTruthy();
    expect(screen.getByText('Prototype - Static Reference')).toBeTruthy();
    expect(screen.getByText('Artifact')).toBeTruthy();
    expect(screen.getByText('Review Mode')).toBeTruthy();
    expect(screen.getByText('Static prototype')).toBeTruthy();
    expect(screen.getByText('Current Preview')).toBeTruthy();
    expect(screen.getAllByText('Live Target').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Static reference surface. This prototype has no live preview.')
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Use the saved/static reference for review; no live interaction is expected for this prototype.'
      )
    ).toBeTruthy();
    expect(screen.getByLabelText('Prototype live URL')).toBeTruthy();
    const openTarget = screen.getByRole('button', { name: 'Open target' }) as HTMLButtonElement;
    expect(openTarget.disabled).toBe(true);
    expect(openTarget.getAttribute('title')).toBe(
      'Static prototype has no live target. Use the saved preview or add a prototype live URL.'
    );
    expect(screen.queryByTitle('Live preview: Quick Setup Concept')).toBeNull();
    expect(screen.getByText('Surface')).toBeTruthy();
    expect(screen.getByText('Generated Image')).toBeTruthy();
    expect(screen.getByText('Explore the first-run concept before implementation.')).toBeTruthy();
  });

  it('renders live mockup preview iframe and limitations in live mode', () => {
    const mockupNode: NavMapNode = {
      id: 'quick-setup-mockup',
      route: 'prototype://quick-setup-mockup',
      label: 'Quick Setup Mockup',
      group: 'prototype',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        purpose: 'Preview the quick setup mockup.',
        section: 'prototype',
        preview: {
          liveStatus: 'available',
          liveMode: 'iframe',
          liveUrl: '/mockups/quick-setup.html',
          limitations: ['fixture-data', 'no-real-auth'],
        },
      },
    };

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveReadinessByNode: {
            'quick-setup-mockup': {
              nodeId: 'quick-setup-mockup',
              status: 'reachable',
              artifactKind: 'mockup',
              liveUrl: '/mockups/quick-setup.html',
              liveUrlSource: 'manifest',
              message: 'Live target is reachable.',
            },
          },
        }}
      >
        <ConnectionPanel node={mockupNode} nodes={[mockupNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    const iframe = screen.getByTitle('Live preview: Quick Setup Mockup');

    expect(iframe.getAttribute('src')).toBe('/mockups/quick-setup.html');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(iframe.getAttribute('allow')).toBe('');
    expect(screen.getByText('Mockup - Live Iframe')).toBeTruthy();
    expect(screen.getByText('Artifact')).toBeTruthy();
    expect(screen.getByText('Mockup')).toBeTruthy();
    expect(screen.getByText('Review Mode')).toBeTruthy();
    expect(screen.getByText('HTML mockup')).toBeTruthy();
    expect(screen.getAllByText('Live Target').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Target Configured')).toBeTruthy();
    expect(screen.getAllByText('Target Preflight').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText('Mockup live URL')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open mockup' })).toBeTruthy();
    expect(screen.getByText('Fixture Data')).toBeTruthy();
    expect(screen.getByText('No Real Auth')).toBeTruthy();
  });

  it('renders live app route previews from the configured graph base URL', () => {
    const appNode: NavMapNode = {
      id: 'home',
      route: '/home',
      label: 'Home',
      group: 'public',
      metadata: { artifactKind: 'app' },
    };

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveReadinessByNode: {
            home: {
              nodeId: 'home',
              status: 'reachable',
              artifactKind: 'app',
              liveUrl: 'http://localhost:3001/home',
              liveUrlSource: 'graph-base',
              message: 'Live target is reachable.',
            },
          },
          graph: {
            version: '1.0',
            meta: {
              name: 'App Preview',
              generatedAt: '2026-01-01',
              generatedBy: 'manual',
              baseUrl: 'http://localhost:3001',
            },
            nodes: [appNode],
            edges: [],
            groups: [{ id: 'public', label: 'Public' }],
          },
        }}
      >
        <ConnectionPanel node={appNode} nodes={[appNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    const iframe = screen.getByTitle('Live preview: Home');

    expect(iframe.getAttribute('src')).toBe('http://localhost:3001/home');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-same-origin');
    expect(screen.getByText('App - Live Iframe')).toBeTruthy();
    expect(screen.getByText('Review Mode')).toBeTruthy();
    expect(screen.getByText('Real app route')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open app' })).toBeTruthy();
    expect(
      screen.getByText(
        'Target preflight passed and the live iframe is shown as the current preview.'
      )
    ).toBeTruthy();
  });

  it('uses shared readiness to mark live app targets offline', () => {
    const appNode: NavMapNode = {
      id: 'home',
      route: '/home',
      label: 'Home',
      group: 'public',
      screenshot: 'home.png',
      metadata: { artifactKind: 'app' },
    };

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveReadinessByNode: {
            home: {
              nodeId: 'home',
              status: 'offline',
              artifactKind: 'app',
              liveUrl: 'http://localhost:3000/home',
              liveUrlSource: 'graph-base',
              message: 'Live target is not reachable.',
            },
          },
          graph: {
            version: '1.0',
            meta: {
              name: 'App Preview',
              generatedAt: '2026-01-01',
              generatedBy: 'manual',
              baseUrl: 'http://localhost:3000',
            },
            nodes: [appNode],
            edges: [],
            groups: [{ id: 'public', label: 'Public' }],
          },
        }}
      >
        <ConnectionPanel node={appNode} nodes={[appNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    expect(screen.getAllByText('Offline').length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText('Live target unavailable')).toBeTruthy();
    expect(
      screen.getByText(
        'Live target is unavailable. Start the local app server or set a different Live Target.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Home' }).getAttribute('src')).toContain('home.png');
    expect(screen.queryByTitle('Live preview: Home')).toBeNull();
  });

  it('keeps saved preview visible when target preflight is unverified external', () => {
    const appNode: NavMapNode = {
      id: 'home',
      route: '/home',
      label: 'Home',
      group: 'public',
      screenshot: 'home.png',
      metadata: { artifactKind: 'app' },
    };

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveReadinessByNode: {
            home: {
              nodeId: 'home',
              status: 'unverified',
              artifactKind: 'app',
              liveUrl: 'https://example.test/home',
              liveUrlSource: 'graph-base',
              message:
                'Live target responded as an opaque external request; iframe rendering is not verified.',
            },
          },
          graph: {
            version: '1.0',
            meta: {
              name: 'External App Preview',
              generatedAt: '2026-01-01',
              generatedBy: 'manual',
              baseUrl: 'https://example.test',
            },
            nodes: [appNode],
            edges: [],
            groups: [{ id: 'public', label: 'Public' }],
          },
        }}
      >
        <ConnectionPanel node={appNode} nodes={[appNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    expect(screen.getByText('App - Saved Fallback')).toBeTruthy();
    expect(screen.getAllByText('Unverified External').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Live target unverified')).toBeTruthy();
    expect(
      screen.getByText(
        'Target preflight reached the URL, but iframe rendering is not verified. The saved preview remains visible.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Home' }).getAttribute('src')).toContain('home.png');
    expect(screen.queryByTitle('Live preview: Home')).toBeNull();
  });

  it('does not render a live iframe for stale readiness from a different URL', () => {
    const appNode: NavMapNode = {
      id: 'home',
      route: '/home',
      label: 'Home',
      group: 'public',
      screenshot: 'home.png',
      metadata: { artifactKind: 'app' },
    };

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveBaseUrlOverride: 'http://localhost:3001',
          liveReadinessByNode: {
            home: {
              nodeId: 'home',
              status: 'reachable',
              artifactKind: 'app',
              liveUrl: 'http://localhost:3000/home',
              liveUrlSource: 'graph-base',
              message: 'Live target is reachable.',
            },
          },
          graph: {
            version: '1.0',
            meta: {
              name: 'App Preview',
              generatedAt: '2026-01-01',
              generatedBy: 'manual',
              baseUrl: 'http://localhost:3000',
            },
            nodes: [appNode],
            edges: [],
            groups: [{ id: 'public', label: 'Public' }],
          },
        }}
      >
        <ConnectionPanel node={appNode} nodes={[appNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    expect(screen.getByText('Checking live target')).toBeTruthy();
    expect(
      screen.getAllByText('Checking the live target before opening the inline preview.').length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Checking').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTitle('Live preview: Home')).toBeNull();
  });

  it('applies a local app base URL override to app live targets', () => {
    const appNode: NavMapNode = {
      id: 'home',
      route: '/home',
      label: 'Home',
      group: 'public',
      metadata: { artifactKind: 'app' },
    };
    const onBaseUrlChange = vi.fn();

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveBaseUrlOverride: 'http://localhost:3001',
          liveReadinessByNode: {
            home: {
              nodeId: 'home',
              status: 'reachable',
              artifactKind: 'app',
              liveUrl: 'http://localhost:3001/home',
              liveUrlSource: 'local-base-override',
              message: 'Live target is reachable.',
            },
          },
          setLiveBaseUrlOverride: onBaseUrlChange,
          graph: {
            version: '1.0',
            meta: {
              name: 'App Preview',
              generatedAt: '2026-01-01',
              generatedBy: 'manual',
              baseUrl: 'http://localhost:3000',
            },
            nodes: [appNode],
            edges: [],
            groups: [{ id: 'public', label: 'Public' }],
          },
        }}
      >
        <ConnectionPanel node={appNode} nodes={[appNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    const input = screen.getByLabelText('App base URL') as HTMLInputElement;
    const iframe = screen.getByTitle('Live preview: Home');

    expect(input.value).toBe('http://localhost:3001');
    expect(iframe.getAttribute('src')).toBe('http://localhost:3001/home');
    expect(screen.getByText('Local app base override')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'http://localhost:3002' } });
    expect(onBaseUrlChange).toHaveBeenCalledWith('http://localhost:3002');
  });

  it('applies local node live URL overrides before manifest preview URLs', () => {
    const mockupNode: NavMapNode = {
      id: 'quick-setup-mockup',
      route: 'prototype://quick-setup-mockup',
      label: 'Quick Setup Mockup',
      group: 'prototype',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveStatus: 'available',
          liveMode: 'iframe',
          liveUrl: '/mockups/quick-setup.html',
        },
      },
    };
    const onNodeLiveUrlChange = vi.fn();
    const onClearNodeLiveUrl = vi.fn();

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveUrlOverrides: { 'quick-setup-mockup': '/local/quick-setup.html' },
          liveReadinessByNode: {
            'quick-setup-mockup': {
              nodeId: 'quick-setup-mockup',
              status: 'reachable',
              artifactKind: 'mockup',
              liveUrl: '/local/quick-setup.html',
              liveUrlSource: 'local-node-override',
              message: 'Live target is reachable.',
            },
          },
          setLiveUrlOverride: onNodeLiveUrlChange,
          clearLiveUrlOverride: onClearNodeLiveUrl,
        }}
      >
        <ConnectionPanel node={mockupNode} nodes={[mockupNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    const input = screen.getByLabelText('Mockup live URL') as HTMLInputElement;
    const iframe = screen.getByTitle('Live preview: Quick Setup Mockup');

    expect(input.value).toBe('/local/quick-setup.html');
    expect(iframe.getAttribute('src')).toBe('/local/quick-setup.html');
    expect(screen.getByText('Local node override')).toBeTruthy();

    fireEvent.change(input, { target: { value: '/local/next.html' } });
    expect(onNodeLiveUrlChange).toHaveBeenCalledWith('quick-setup-mockup', '/local/next.html');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClearNodeLiveUrl).toHaveBeenCalledWith('quick-setup-mockup');
  });

  it('opens live targets without retaining an opener reference', () => {
    const mockupNode: NavMapNode = {
      id: 'quick-setup-mockup',
      route: 'prototype://quick-setup-mockup',
      label: 'Quick Setup Mockup',
      group: 'prototype',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveStatus: 'available',
          liveMode: 'iframe',
          liveUrl: 'https://example.test/mockup.html',
        },
      },
    };
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <NavMapContext.Provider
        value={{
          ...context,
          previewMode: 'live',
          liveReadinessByNode: {
            'quick-setup-mockup': {
              nodeId: 'quick-setup-mockup',
              status: 'reachable',
              artifactKind: 'mockup',
              liveUrl: 'https://example.test/mockup.html',
              liveUrlSource: 'manifest',
              message: 'Live target is reachable.',
            },
          },
        }}
      >
        <ConnectionPanel node={mockupNode} nodes={[mockupNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open mockup' }));

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.test/mockup.html',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('uses screenshot preview instead of iframe in screenshots mode', () => {
    const mockupNode: NavMapNode = {
      id: 'quick-setup-mockup',
      route: 'prototype://quick-setup-mockup',
      label: 'Quick Setup Mockup',
      group: 'prototype',
      screenshot: 'quick-setup.png',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveStatus: 'available',
          liveMode: 'iframe',
          liveUrl: '/mockups/quick-setup.html',
        },
      },
    };

    render(
      <NavMapContext.Provider value={context}>
        <ConnectionPanel node={mockupNode} nodes={[mockupNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    expect(screen.queryByTitle('Live preview: Quick Setup Mockup')).toBeNull();
    expect(screen.getByAltText('Quick Setup Mockup').getAttribute('src')).toBe('/quick-setup.png');
  });
});
