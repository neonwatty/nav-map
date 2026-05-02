import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NodeProps } from '@xyflow/react';
import { NavMapContext, type NavMapContextValue } from '../../hooks/useNavMap';
import { CompactNode } from './CompactNode';
import { PageNode } from './PageNode';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  return {
    ...actual,
    Handle: () => null,
  };
});

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

function renderWithContext(node: React.ReactElement) {
  return render(<NavMapContext.Provider value={contextValue}>{node}</NavMapContext.Provider>);
}

function nodeProps(hasGallery: boolean): NodeProps {
  return {
    id: 'home',
    type: 'pageNode',
    data: {
      label: 'Home',
      route: '/',
      group: 'root',
      screenshot: 'home.png',
      hasGallery,
    },
    selected: false,
    dragging: false,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as unknown as NodeProps;
}

describe('GalleryBadge nodes', () => {
  it('labels page nodes with recorded flow galleries', () => {
    renderWithContext(<PageNode {...nodeProps(true)} />);

    expect(screen.getByLabelText('Flow gallery available')).toBeTruthy();
    expect(screen.getByText('Flow')).toBeTruthy();
  });

  it('labels compact nodes with recorded flow galleries', () => {
    renderWithContext(<CompactNode {...nodeProps(true)} />);

    expect(screen.getByLabelText('Flow gallery available')).toBeTruthy();
  });

  it('does not show a gallery affordance when no gallery is available', () => {
    renderWithContext(<PageNode {...nodeProps(false)} />);

    expect(screen.queryByLabelText('Flow gallery available')).toBeNull();
  });
});
