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
