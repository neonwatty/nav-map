import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatActionableCrawlDiagnostics,
  formatCrawlDiagnostics,
  hasCrawlDiagnosticIssues,
  loadCrawlDiagnosticsFile,
  writeCrawlDiagnosticsReport,
} from '../diagnostics-report.js';

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

  it('detects crawl diagnostics issues', () => {
    expect(
      hasCrawlDiagnosticIssues({
        crawl: {
          attemptedPages: 1,
          successfulPages: 1,
          failedPages: [],
          screenshotFailures: [],
          maxPagesReached: false,
        },
      })
    ).toBe(false);

    expect(
      hasCrawlDiagnosticIssues({
        crawl: {
          attemptedPages: 2,
          successfulPages: 1,
          failedPages: [{ url: 'https://example.com/fail', reason: 'timeout' }],
          screenshotFailures: [],
          maxPagesReached: false,
        },
      })
    ).toBe(true);

    expect(
      hasCrawlDiagnosticIssues({
        crawl: {
          attemptedPages: 1,
          successfulPages: 1,
          failedPages: [],
          screenshotFailures: [],
          maxPagesReached: true,
        },
      })
    ).toBe(true);
  });
});

describe('writeCrawlDiagnosticsReport', () => {
  it('writes diagnostics JSON and creates parent directories', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diagnostics-'));
    const outputPath = path.join(tempDir, 'nested', 'diagnostics.json');

    const diagnostics = {
      crawl: {
        attemptedPages: 2,
        successfulPages: 1,
        failedPages: [{ url: 'https://example.com/fail', reason: 'timeout' }],
        screenshotFailures: [],
        maxPagesReached: false,
      },
    };

    expect(writeCrawlDiagnosticsReport(diagnostics, outputPath)).toBe(path.resolve(outputPath));
    expect(JSON.parse(fs.readFileSync(outputPath, 'utf8'))).toEqual(diagnostics);
  });

  it('writes null when diagnostics are absent', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diagnostics-'));
    const outputPath = path.join(tempDir, 'diagnostics.json');

    writeCrawlDiagnosticsReport(undefined, outputPath);

    expect(JSON.parse(fs.readFileSync(outputPath, 'utf8'))).toBeNull();
  });
});

describe('loadCrawlDiagnosticsFile', () => {
  it('loads diagnostics sidecar JSON', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diagnostics-'));
    const outputPath = path.join(tempDir, 'diagnostics.json');
    const diagnostics = {
      crawl: {
        attemptedPages: 1,
        successfulPages: 1,
        failedPages: [],
        screenshotFailures: [],
        maxPagesReached: false,
      },
    };
    fs.writeFileSync(outputPath, JSON.stringify(diagnostics));

    expect(loadCrawlDiagnosticsFile(outputPath)).toEqual({
      inputPath: path.resolve(outputPath),
      source: 'diagnostics',
      diagnostics,
    });
  });

  it('loads diagnostics from nav-map graph metadata', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diagnostics-'));
    const outputPath = path.join(tempDir, 'nav-map.json');
    const diagnostics = {
      crawl: {
        attemptedPages: 2,
        successfulPages: 1,
        failedPages: [{ url: 'https://example.com/fail', reason: 'timeout' }],
        screenshotFailures: [],
        maxPagesReached: true,
      },
    };
    fs.writeFileSync(
      outputPath,
      JSON.stringify({
        version: '1.0',
        meta: { diagnostics },
        nodes: [],
        edges: [],
        groups: [],
      })
    );

    expect(loadCrawlDiagnosticsFile(outputPath)).toEqual({
      inputPath: path.resolve(outputPath),
      source: 'graph',
      diagnostics,
    });
  });

  it('returns no diagnostics for empty sidecar output', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diagnostics-'));
    const outputPath = path.join(tempDir, 'diagnostics.json');
    fs.writeFileSync(outputPath, 'null');

    expect(loadCrawlDiagnosticsFile(outputPath)).toEqual({
      inputPath: path.resolve(outputPath),
      source: 'diagnostics',
      diagnostics: undefined,
    });
  });

  it('throws an actionable error for malformed JSON', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diagnostics-'));
    const outputPath = path.join(tempDir, 'diagnostics.json');
    fs.writeFileSync(outputPath, '{');

    expect(() => loadCrawlDiagnosticsFile(outputPath)).toThrow(
      `Failed to read diagnostics file at ${path.resolve(outputPath)}`
    );
  });
});

describe('formatActionableCrawlDiagnostics', () => {
  it('prints detailed issues and suggestions', () => {
    expect(
      formatActionableCrawlDiagnostics({
        inputPath: '/tmp/diagnostics.json',
        source: 'diagnostics',
        diagnostics: {
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
        },
      })
    ).toMatchInlineSnapshot(`
      "Crawl diagnostics report
        Source: /tmp/diagnostics.json (diagnostics)
        Status: issues found
        Pages: 2/4 successful
        Failed page loads: 1
        Screenshot failures: 1
        Max pages reached: yes

      Failed page loads:
        - https://example.com/missing (timeout)

      Screenshot failures:
        - https://example.com/ -> shots/index.png (permission denied)

      Suggested next steps:
        - Open failed URLs locally and verify status codes, redirects, and auth state.
        - Increase crawl timeouts or provide auth config if failures are protected pages.
        - Check screenshot output directory permissions and available disk space.
        - Increase \`maxPages\` if the truncated routes are expected.
        - Add include/exclude interaction filters to avoid low-value crawl branches."
    `);
  });

  it('prints normalized JSON output', () => {
    const output = formatActionableCrawlDiagnostics(
      {
        inputPath: '/tmp/diagnostics.json',
        source: 'diagnostics',
        diagnostics: {
          crawl: {
            attemptedPages: 1,
            successfulPages: 1,
            failedPages: [],
            screenshotFailures: [],
            maxPagesReached: false,
          },
        },
      },
      { json: true }
    );

    expect(JSON.parse(output)).toEqual({
      source: 'diagnostics',
      inputPath: '/tmp/diagnostics.json',
      hasIssues: false,
      summary: {
        attemptedPages: 1,
        successfulPages: 1,
        failedPageLoads: 0,
        screenshotFailures: 0,
        maxPagesReached: false,
      },
      diagnostics: {
        crawl: {
          attemptedPages: 1,
          successfulPages: 1,
          failedPages: [],
          screenshotFailures: [],
          maxPagesReached: false,
        },
      },
      suggestions: ['No action needed; crawl diagnostics are clean.'],
    });
  });

  it('prints compact summary output without per-URL failure lists', () => {
    expect(
      formatActionableCrawlDiagnostics(
        {
          inputPath: '/tmp/diagnostics.json',
          source: 'diagnostics',
          diagnostics: {
            crawl: {
              attemptedPages: 4,
              successfulPages: 2,
              failedPages: [{ url: 'https://example.com/missing', reason: 'timeout' }],
              screenshotFailures: [],
              maxPagesReached: false,
            },
          },
        },
        { summary: true }
      )
    ).toMatchInlineSnapshot(`
      "Crawl diagnostics summary
        Source: /tmp/diagnostics.json (diagnostics)
        Status: issues found
        Pages: 2/4 successful
        Failed page loads: 1
        Screenshot failures: 0
        Max pages reached: no

      Suggested next steps:
        - Open failed URLs locally and verify status codes, redirects, and auth state.
        - Increase crawl timeouts or provide auth config if failures are protected pages."
    `);
  });

  it('prints a no-diagnostics report', () => {
    expect(
      formatActionableCrawlDiagnostics({
        inputPath: '/tmp/diagnostics.json',
        source: 'diagnostics',
        diagnostics: undefined,
      })
    ).toContain('Status: no crawl diagnostics found');
  });
});
