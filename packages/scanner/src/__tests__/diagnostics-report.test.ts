import { describe, expect, it } from 'vitest';
import { formatCrawlDiagnostics } from '../diagnostics-report.js';

describe('formatCrawlDiagnostics', () => {
  it('returns null when diagnostics are absent', () => {
    expect(formatCrawlDiagnostics()).toBeNull();
  });

  it('formats crawl counters and representative failures', () => {
    expect(
      formatCrawlDiagnostics({
        crawl: {
          attemptedPages: 4,
          successfulPages: 2,
          failedPages: [{ url: 'https://example.com/missing', reason: 'timeout' }],
          screenshotFailures: [
            {
              url: 'https://example.com/',
              path: 'shots/index.png',
              reason: 'permission denied',
            },
          ],
          maxPagesReached: true,
        },
      })
    ).toMatchInlineSnapshot(`
      "Crawl diagnostics:
        Pages: 2/4 successful
        Failed page loads: 1
        Screenshot failures: 1
        Max pages reached: yes
        - Page failed: https://example.com/missing (timeout)
        - Screenshot failed: https://example.com/ -> shots/index.png (permission denied)"
    `);
  });
});
