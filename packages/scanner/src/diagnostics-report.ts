import fs from 'node:fs';
import path from 'node:path';
import type { CrawlDiagnostics } from './modes/crawl.js';

export interface DiagnosticsInspection {
  inputPath: string;
  diagnostics?: CrawlDiagnostics;
  source: 'graph' | 'diagnostics';
}

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

export function formatActionableCrawlDiagnostics(
  inspection: DiagnosticsInspection,
  options: { json?: boolean } = {}
): string {
  const { diagnostics, inputPath, source } = inspection;
  const crawl = diagnostics?.crawl;
  const issues = hasCrawlDiagnosticIssues(diagnostics);

  if (options.json) {
    return JSON.stringify(
      {
        source,
        inputPath,
        hasIssues: issues,
        diagnostics: diagnostics ?? null,
        suggestions: buildCrawlDiagnosticSuggestions(diagnostics),
      },
      null,
      2
    );
  }

  if (!crawl) {
    return [
      'Crawl diagnostics report',
      `  Source: ${inputPath} (${source})`,
      '  Status: no crawl diagnostics found',
      '',
      'Suggested next steps:',
      '  - Re-run `nav-map crawl` or `nav-map generate` with diagnostics output enabled.',
      '  - For generated maps, inspect `graph.meta.diagnostics.crawl`.',
    ].join('\n');
  }

  const lines = [
    'Crawl diagnostics report',
    `  Source: ${inputPath} (${source})`,
    `  Status: ${issues ? 'issues found' : 'ok'}`,
    `  Pages: ${crawl.successfulPages}/${crawl.attemptedPages} successful`,
    `  Failed page loads: ${crawl.failedPages.length}`,
    `  Screenshot failures: ${crawl.screenshotFailures.length}`,
    `  Max pages reached: ${crawl.maxPagesReached ? 'yes' : 'no'}`,
  ];

  if (crawl.failedPages.length > 0) {
    lines.push('', 'Failed page loads:');
    for (const failure of crawl.failedPages) {
      lines.push(`  - ${failure.url} (${failure.reason})`);
    }
  }

  if (crawl.screenshotFailures.length > 0) {
    lines.push('', 'Screenshot failures:');
    for (const failure of crawl.screenshotFailures) {
      lines.push(`  - ${failure.url} -> ${failure.path} (${failure.reason})`);
    }
  }

  const suggestions = buildCrawlDiagnosticSuggestions(diagnostics);
  if (suggestions.length > 0) {
    lines.push('', 'Suggested next steps:');
    for (const suggestion of suggestions) {
      lines.push(`  - ${suggestion}`);
    }
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

export function loadCrawlDiagnosticsFile(filePath: string): DiagnosticsInspection {
  const resolvedPath = path.resolve(filePath);
  let parsed: unknown;

  try {
    parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (err) {
    throw new Error(
      `Failed to read diagnostics file at ${resolvedPath}: ${err instanceof Error ? err.message : err}`,
      { cause: err }
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    return { inputPath: resolvedPath, source: 'diagnostics', diagnostics: undefined };
  }

  const record = parsed as Record<string, unknown>;
  const graphDiagnostics = getRecord(record.meta)?.diagnostics;
  if (isCrawlDiagnostics(graphDiagnostics)) {
    return { inputPath: resolvedPath, source: 'graph', diagnostics: graphDiagnostics };
  }

  if (isCrawlDiagnostics(record)) {
    return { inputPath: resolvedPath, source: 'diagnostics', diagnostics: record };
  }

  return { inputPath: resolvedPath, source: 'diagnostics', diagnostics: undefined };
}

function buildCrawlDiagnosticSuggestions(diagnostics?: CrawlDiagnostics): string[] {
  const crawl = diagnostics?.crawl;
  if (!crawl) return [];

  const suggestions: string[] = [];

  if (crawl.failedPages.length > 0) {
    suggestions.push(
      'Open failed URLs locally and verify status codes, redirects, and auth state.'
    );
    suggestions.push(
      'Increase crawl timeouts or provide auth config if failures are protected pages.'
    );
  }

  if (crawl.screenshotFailures.length > 0) {
    suggestions.push('Check screenshot output directory permissions and available disk space.');
  }

  if (crawl.maxPagesReached) {
    suggestions.push('Increase `maxPages` if the truncated routes are expected.');
    suggestions.push('Add include/exclude interaction filters to avoid low-value crawl branches.');
  }

  if (suggestions.length === 0) {
    suggestions.push('No action needed; crawl diagnostics are clean.');
  }

  return suggestions;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function isCrawlDiagnostics(value: unknown): value is CrawlDiagnostics {
  const crawl = getRecord(value)?.crawl;
  if (!crawl || typeof crawl !== 'object' || Array.isArray(crawl)) return false;

  const record = crawl as Record<string, unknown>;
  return (
    typeof record.attemptedPages === 'number' &&
    typeof record.successfulPages === 'number' &&
    Array.isArray(record.failedPages) &&
    Array.isArray(record.screenshotFailures) &&
    typeof record.maxPagesReached === 'boolean'
  );
}
