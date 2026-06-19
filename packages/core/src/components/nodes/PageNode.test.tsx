import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NodeProps } from '@xyflow/react';
import { NavMapContext, type NavMapContextValue } from '../../hooks/useNavMap';
import type { NavMapGraph } from '../../types';
import { PageNode } from './PageNode';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  return {
    ...actual,
    Handle: () => null,
  };
});

const graph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Test graph',
    baseUrl: 'http://localhost:3000',
    generatedAt: '2026-01-01T00:00:00.000Z',
    generatedBy: 'manual',
  },
  nodes: [],
  edges: [],
  groups: [],
};

const contextValue: NavMapContextValue = {
  graph,
  selectedNodeId: null,
  setSelectedNodeId: vi.fn(),
  isDark: false,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#fff', border: '#3355aa', text: '#222' }),
  focusedGroupId: null,
  edgeMode: 'smooth',
  showCoverage: false,
  previewMode: 'screenshots',
};

function renderPageNode(data: Record<string, unknown>) {
  const props = {
    id: String(data.id ?? 'node'),
    data,
    selected: false,
    dragging: false,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as unknown as NodeProps;

  return render(
    <NavMapContext.Provider value={contextValue}>
      <PageNode {...props} />
    </NavMapContext.Provider>
  );
}

describe('PageNode preview tabs', () => {
  it('shows App and Live for an app node', () => {
    renderPageNode({
      id: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      group: 'app',
      screenshot: 'dashboard.png',
    });

    expect(screen.getByText('App')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('shows Prototype and Static for a generated-image prototype node', () => {
    renderPageNode({
      id: 'prototype-dashboard',
      label: 'Dashboard Prototype',
      route: 'prototype://dashboard',
      group: 'prototype',
      screenshot: 'dashboard-prototype.png',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'generated-image',
      },
    });

    expect(screen.getByText('Prototype')).toBeTruthy();
    expect(screen.getByText('Static')).toBeTruthy();
  });

  it('shows App and Blocked for a blocked app node', () => {
    renderPageNode({
      id: 'auth-dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      group: 'app',
      screenshot: 'dashboard.png',
      metadata: {
        preview: {
          liveStatus: 'blocked',
          blockedReason: 'auth-required',
        },
      },
    });

    expect(screen.getByText('App')).toBeTruthy();
    expect(screen.getByText('Blocked')).toBeTruthy();
  });

  it('renders the screenshot image when a screenshot is present', () => {
    renderPageNode({
      id: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      group: 'app',
      screenshot: 'dashboard.png',
    });

    const image = screen.getByRole('img', { name: 'Dashboard' });

    expect(image.getAttribute('src')).toContain('dashboard.png');
  });

  it('renders the static fallback when screenshot is omitted', () => {
    renderPageNode({
      id: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      group: 'app',
    });

    expect(screen.queryByRole('img', { name: 'Dashboard' })).toBeNull();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('/dashboard')).toBeTruthy();
  });
});
