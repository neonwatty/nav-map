import { describe, expect, it } from 'vitest';
import { formatGraphRunSummary, formatIngestRunSummary } from '../commands/run-summary.js';

describe('run-summary', () => {
  it('formats graph output with route, edge, group, and flow counts', () => {
    expect(
      formatGraphRunSummary('/tmp/nav-map.json', {
        nodes: [{ id: 'home' }, { id: 'settings' }],
        edges: [{ id: 'home-settings' }],
        groups: [{ id: 'root' }],
        flows: [{ name: 'happy path' }],
      })
    ).toBe(
      [
        '',
        'Wrote /tmp/nav-map.json',
        'Summary:',
        '  Routes: 2',
        '  Edges: 1',
        '  Groups: 1',
        '  Flows: 1',
      ].join('\n')
    );
  });

  it('includes crawl diagnostics when available', () => {
    expect(
      formatGraphRunSummary('/tmp/nav-map.json', {
        nodes: [{ id: 'home' }],
        edges: [],
        groups: [],
        meta: {
          diagnostics: {
            crawl: {
              attemptedPages: 3,
              successfulPages: 1,
              failedPages: [{ url: '/fail' }],
              screenshotFailures: [{ url: '/', path: 'home.png', reason: 'timeout' }],
              maxPagesReached: true,
            },
          },
        },
      })
    ).toContain(
      [
        '  Pages attempted: 3',
        '  Pages succeeded: 1',
        '  Page failures: 1',
        '  Screenshot failures: 1',
        '  Limit reached: yes',
      ].join('\n')
    );
  });

  it('formats ingest output with coverage counts', () => {
    expect(
      formatIngestRunSummary({
        outputPath: '/tmp/.nav-map/nav-map.json',
        testCount: 4,
        routesCovered: 3,
        routesUncovered: 2,
      })
    ).toBe(
      [
        '',
        'Wrote /tmp/.nav-map/nav-map.json',
        'Summary:',
        '  Tests processed: 4',
        '  Routes covered: 3',
        '  Routes uncovered: 2',
      ].join('\n')
    );
  });
});
