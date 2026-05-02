import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SearchResult } from '../../hooks/useSearch';
import { SearchResultsList } from './SearchResultsList';

const results: SearchResult[] = [
  {
    id: 'home',
    label: 'Home',
    route: '/',
    group: 'marketing',
    outgoingCount: 2,
    incomingCount: 0,
  },
  {
    id: 'settings',
    label: 'Settings',
    route: '/settings',
    group: 'app',
    outgoingCount: 0,
    incomingCount: 1,
  },
];

describe('SearchResultsList', () => {
  it('renders search results as selectable buttons', () => {
    render(
      <SearchResultsList
        results={results}
        selectedIndex={1}
        isDark={false}
        onSelectIndex={vi.fn()}
        onSelectNode={vi.fn()}
      />
    );

    expect(screen.getByRole('group', { name: 'Search results' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Home/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Settings/ }).getAttribute('aria-current')).toBe(
      'true'
    );
  });

  it('notifies callers when users hover and select a result', () => {
    const onSelectIndex = vi.fn();
    const onSelectNode = vi.fn();
    render(
      <SearchResultsList
        results={results}
        selectedIndex={0}
        isDark={false}
        onSelectIndex={onSelectIndex}
        onSelectNode={onSelectNode}
      />
    );

    const settings = screen.getByRole('button', { name: /Settings/ });
    fireEvent.mouseEnter(settings);
    fireEvent.click(settings);

    expect(onSelectIndex).toHaveBeenCalledWith(1);
    expect(onSelectNode).toHaveBeenCalledWith('settings');
  });
});
