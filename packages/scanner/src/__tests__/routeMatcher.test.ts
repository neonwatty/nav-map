import { describe, it, expect } from 'vitest';
import { matchRoute } from '../ingest/routeMatcher.js';

describe('matchRoute', () => {
  const baseNodes = [
    { id: 'home', route: '/', label: 'Home', group: 'marketing' },
    { id: 'dashboard', route: '/dashboard', label: 'Dashboard', group: 'app' },
    { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
    { id: 'settings-billing', route: '/settings/billing', label: 'Billing', group: 'app' },
    { id: 'event-detail', route: '/events/[id]', label: 'Event Detail', group: 'events' },
    { id: 'event-edit', route: '/events/[id]/edit', label: 'Edit Event', group: 'events' },
  ];

  it('exact match for static routes', () => {
    const result = matchRoute('/dashboard', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('dashboard');
  });

  it('matches with trailing slash normalization', () => {
    const result = matchRoute('/dashboard/', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('dashboard');
  });

  it('pattern match for dynamic routes', () => {
    const result = matchRoute('/events/abc123', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('event-detail');
  });

  it('pattern match for nested dynamic routes', () => {
    const result = matchRoute('/events/abc123/edit', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('event-edit');
  });

  it('returns unmatched for unknown routes', () => {
    const result = matchRoute('/totally-unknown', baseNodes);
    expect(result.matched).toBe(false);
    expect(result.nodeId).toBeNull();
  });

  it('case insensitive matching', () => {
    const result = matchRoute('/Dashboard', baseNodes);
    expect(result.matched).toBe(true);
    expect(result.nodeId).toBe('dashboard');
  });
});
