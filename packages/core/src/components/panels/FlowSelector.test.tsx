import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NavMapFlow } from '../../types';
import { NavMapContext, type NavMapContextValue } from '../../hooks/useNavMap';
import { FlowSelector } from './FlowSelector';

const flows: NavMapFlow[] = [
  { name: 'Signup Journey', steps: ['home', 'signup'] },
  { name: 'Studio Journey', steps: ['home', 'studio'] },
];

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

function renderSelector(onSelect = vi.fn(), selectedIndex: number | null = 0) {
  render(
    <NavMapContext.Provider value={contextValue}>
      <FlowSelector flows={flows} selectedIndex={selectedIndex} onSelect={onSelect} />
    </NavMapContext.Provider>
  );
  return { onSelect };
}

describe('FlowSelector', () => {
  it('renders a labelled recorded-flow selector', () => {
    renderSelector();

    expect(screen.getByText('Flow')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Flow' })).toBeTruthy();
    expect(screen.getByDisplayValue('Signup Journey')).toBeTruthy();
  });

  it('notifies callers when a different flow is selected', () => {
    const { onSelect } = renderSelector(vi.fn());

    fireEvent.change(screen.getByRole('combobox', { name: 'Flow' }), {
      target: { value: '1' },
    });

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('allows clearing the selected flow', () => {
    const { onSelect } = renderSelector(vi.fn(), null);

    fireEvent.change(screen.getByRole('combobox', { name: 'Flow' }), {
      target: { value: '' },
    });

    expect(screen.getByDisplayValue('Choose a recorded flow...')).toBeTruthy();
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
