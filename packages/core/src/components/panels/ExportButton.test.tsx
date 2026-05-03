import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../../types';
import { NavMapContext, type NavMapContextValue } from '../../hooks/useNavMap';
import { buildViewSummary, ExportButton } from './ExportButton';

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    getNodes: () => [],
  }),
}));

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Share Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    { id: 'signup', route: '/signup', label: 'Signup', group: 'root' },
  ],
  edges: [{ id: 'home-signup', source: 'home', target: 'signup', type: 'link' }],
  groups: [{ id: 'root', label: 'Root' }],
  flows: [{ name: 'Signup Journey', steps: ['home', 'signup'] }],
};

const contextValue: NavMapContextValue = {
  graph: null,
  selectedNodeId: null,
  setSelectedNodeId: vi.fn(),
  isDark: false,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#fff', border: '#3355aa', text: '#222' }),
  focusedGroupId: null,
  edgeMode: 'smooth',
  showCoverage: false,
};

function renderExport(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.assign(navigator, { clipboard: { writeText } });
  render(
    <NavMapContext.Provider value={contextValue}>
      <ExportButton graph={graph} graphName="fallback" viewMode="flow" selectedFlowIndex={0} />
    </NavMapContext.Provider>
  );
  return { writeText };
}

describe('ExportButton', () => {
  it('builds a compact share summary for the current view', () => {
    expect(
      buildViewSummary({
        graph,
        graphName: 'fallback',
        selectedFlowIndex: 0,
        url: 'https://example.test/demo',
        viewMode: 'flow',
      })
    ).toBe(
      [
        'Nav Map: Share Test',
        'View: flow',
        'Flow: Signup Journey (2 steps)',
        'Routes: 2',
        'Edges: 1',
        'Flows: 1',
        'URL: https://example.test/demo',
      ].join('\n')
    );
  });

  it('copies the current view summary', async () => {
    const { writeText } = renderExport();

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy view summary' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Nav Map: Share Test'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Flow: Signup Journey'));
    expect(await screen.findByRole('button', { name: 'Copied view summary' })).toBeTruthy();
  });
});
