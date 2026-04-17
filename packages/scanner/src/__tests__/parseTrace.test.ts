import { describe, it, expect } from 'vitest';
import { parseTrace } from '../ingest/parseTrace.js';
import { buildTraceFixture } from './fixtures/build-trace-fixture.js';

describe('parseTrace', () => {
  const traceBuffer = buildTraceFixture({
    navigations: [
      { url: 'http://localhost:3000/dashboard', timestamp: 1000 },
      { url: 'http://localhost:3000/settings', timestamp: 5000 },
      { url: 'http://localhost:3000/settings/billing', timestamp: 9000 },
    ],
    actions: [
      { method: 'click', params: { selector: 'text=Settings' }, timestamp: 4500 },
      { method: 'click', params: { selector: 'text=Billing' }, timestamp: 8500 },
    ],
  });

  it('extracts route transitions from goto events', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    expect(result.routes).toEqual(['/dashboard', '/settings', '/settings/billing']);
  });

  it('strips base URL from routes', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    for (const route of result.routes) {
      expect(route).not.toContain('http://localhost:3000');
      expect(route).toMatch(/^\//);
    }
  });

  it('extracts actions with timestamps', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    expect(result.actions.length).toBeGreaterThanOrEqual(5);
    const clicks = result.actions.filter(a => a.method === 'click');
    expect(clicks).toHaveLength(2);
  });

  it('extracts screencast frame references', () => {
    const result = parseTrace(traceBuffer, 'http://localhost:3000');
    expect(result.screenshots).toHaveLength(3);
    for (const s of result.screenshots) {
      expect(s.sha1).toMatch(/^page@/);
      expect(s.timestamp).toBeGreaterThan(0);
    }
  });

  it('returns empty routes for trace with no navigations', () => {
    const emptyTrace = buildTraceFixture({ navigations: [] });
    const result = parseTrace(emptyTrace, 'http://localhost:3000');
    expect(result.routes).toEqual([]);
  });

  it('handles missing base URL by keeping full paths', () => {
    const result = parseTrace(traceBuffer, '');
    expect(result.routes[0]).toBe('http://localhost:3000/dashboard');
  });
});
