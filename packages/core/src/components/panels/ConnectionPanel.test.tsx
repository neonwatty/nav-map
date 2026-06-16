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
});
