import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
    expect(screen.getByText('Preview Status')).toBeTruthy();
    expect(screen.getByText('Prototype / Static')).toBeTruthy();
    expect(
      screen.getByText('Static reference surface. This prototype has no live preview.')
    ).toBeTruthy();
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
      <NavMapContext.Provider value={{ ...context, previewMode: 'live' }}>
        <ConnectionPanel node={mockupNode} nodes={[mockupNode]} edges={[]} onNavigate={() => {}} />
      </NavMapContext.Provider>
    );

    const iframe = screen.getByTitle('Live preview: Quick Setup Mockup');

    expect(iframe.getAttribute('src')).toBe('/mockups/quick-setup.html');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(iframe.getAttribute('allow')).toBe('');
    expect(screen.getByText('Fixture Data')).toBeTruthy();
    expect(screen.getByText('No Real Auth')).toBeTruthy();
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
