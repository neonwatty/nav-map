import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NodeProps } from '@xyflow/react';
import { NavMapContext, type NavMapContextValue } from '../../hooks/useNavMap';
import { GroupNode } from './GroupNode';

const contextValue: NavMapContextValue = {
  graph: null,
  selectedNodeId: null,
  setSelectedNodeId: vi.fn(),
  isDark: false,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#eef2ff', border: '#3355aa', text: '#222' }),
  focusedGroupId: null,
  edgeMode: 'smooth',
  showCoverage: false,
};

function renderGroupNode(overrides: Partial<NodeProps['data']> = {}) {
  const props = {
    id: 'group-marketing',
    data: {
      label: 'Marketing',
      groupId: 'marketing',
      childCount: 4,
      collapsed: false,
      ...overrides,
    },
    selected: false,
    dragging: false,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as unknown as NodeProps;

  return render(
    <NavMapContext.Provider value={contextValue}>
      <GroupNode {...props} />
    </NavMapContext.Provider>
  );
}

describe('GroupNode', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the group header as an expandable button', () => {
    renderGroupNode();

    const button = screen.getByRole('button', { name: 'Collapse Marketing group' });
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles the group when activated', () => {
    vi.useFakeTimers();
    const onToggle = vi.fn();
    renderGroupNode({ onToggle });

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Marketing group' }));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(onToggle).toHaveBeenCalledWith('marketing', true);
    expect(screen.getByRole('button', { name: 'Expand Marketing group' })).toBeTruthy();
    expect(screen.getByText('4 pages')).toBeTruthy();
  });

  it('opens group details on double click without toggling collapse state', () => {
    vi.useFakeTimers();
    const onDoubleClick = vi.fn();
    const onToggle = vi.fn();
    renderGroupNode({ onDoubleClick, onToggle });

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Marketing group' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Collapse Marketing group' }));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(onDoubleClick).toHaveBeenCalledWith('marketing');
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Collapse Marketing group' })).toBeTruthy();
  });
});
