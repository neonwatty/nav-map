import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../../types';
import { RouteHealthPanel } from './RouteHealthPanel';

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Panel Test', generatedAt: '2026-01-01T00:00:00Z', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    { id: 'docs', route: '/docs', label: 'Docs', group: 'docs' },
    { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
  ],
  edges: [{ id: 'home-docs', source: 'home', target: 'docs', type: 'link' }],
  groups: [
    { id: 'root', label: 'Root' },
    { id: 'docs', label: 'Docs' },
    { id: 'app', label: 'App' },
  ],
};

describe('RouteHealthPanel', () => {
  it('renders issue filters and filters the issue list', () => {
    render(<RouteHealthPanel graph={graph} isDark onClose={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByText('Route Health')).toBeTruthy();
    expect(screen.getByText(/Settings is unreachable/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Dead ends/ }));

    expect(screen.queryByText(/Settings is unreachable/)).toBeNull();
    expect(screen.getByText(/Docs is a dead end/)).toBeTruthy();
  });

  it('navigates to the issue route when clicked', () => {
    const onNavigate = vi.fn();
    render(
      <RouteHealthPanel graph={graph} isDark={false} onClose={vi.fn()} onNavigate={onNavigate} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Settings is unreachable/ }));

    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('copies the route health report', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <RouteHealthPanel graph={graph} isDark={false} onClose={vi.fn()} onNavigate={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# Route Health: Panel Test'));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy();
  });
});
