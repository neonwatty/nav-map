import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatCrawlDiagnostics,
  hasCrawlDiagnosticIssues,
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
