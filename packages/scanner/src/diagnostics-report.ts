import fs from 'node:fs';
import path from 'node:path';
import type { CrawlDiagnostics } from './modes/crawl.js';

export function formatCrawlDiagnostics(diagnostics?: CrawlDiagnostics): string | null {
  const crawl = diagnostics?.crawl;
  if (!crawl) return null;

  const lines = [
    'Crawl diagnostics:',
    `  Pages: ${crawl.successfulPages}/${crawl.attemptedPages} successful`,
    `  Failed page loads: ${crawl.failedPages.length}`,
    `  Screenshot failures: ${crawl.screenshotFailures.length}`,
    `  Max pages reached: ${crawl.maxPagesReached ? 'yes' : 'no'}`,
  ];

  for (const failure of crawl.failedPages.slice(0, 3)) {
    lines.push(`  - Page failed: ${failure.url} (${failure.reason})`);
  }

  for (const failure of crawl.screenshotFailures.slice(0, 3)) {
    lines.push(`  - Screenshot failed: ${failure.url} -> ${failure.path} (${failure.reason})`);
  }

  return lines.join('\n');
}

export function hasCrawlDiagnosticIssues(diagnostics?: CrawlDiagnostics): boolean {
  const crawl = diagnostics?.crawl;
  if (!crawl) return false;

  return (
    crawl.failedPages.length > 0 || crawl.screenshotFailures.length > 0 || crawl.maxPagesReached
  );
}

export function writeCrawlDiagnosticsReport(
  diagnostics: CrawlDiagnostics | undefined,
  outputPath: string
): string {
  const resolvedPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, JSON.stringify(diagnostics ?? null, null, 2));

  return resolvedPath;
}
