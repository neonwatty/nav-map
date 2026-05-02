import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import {
  formatCrawlDiagnostics,
  hasCrawlDiagnosticIssues,
  writeCrawlDiagnosticsReport,
} from '../diagnostics-report.js';
import { crawlUrl } from '../modes/crawl.js';
import { formatGraphRunSummary } from './run-summary.js';

export function createCrawlCommand(): Command {
  return new Command('crawl')
    .description('Crawl a live URL to generate a navigation map')
    .argument('<url>', 'Starting URL to crawl')
    .option('-o, --output <path>', 'Output file path', 'nav-map.json')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
    .option('-n, --name <name>', 'Project name for the graph')
    .option('--max-pages <n>', 'Maximum number of pages to crawl', '50')
    .option('--no-interactions', 'Skip click-based navigation discovery')
    .option('--max-interactions <n>', 'Maximum click candidates to try per page', '20')
    .option('--include-interaction <pattern...>', 'Only click interactions matching these labels')
    .option('--exclude-interaction <pattern...>', 'Skip interactions matching these labels')
    .option('--diagnostics-output <path>', 'Write crawl diagnostics JSON sidecar')
    .option(
      '--fail-on-diagnostics',
      'Exit non-zero if crawl diagnostics include failures or page-limit truncation'
    )
    .action(async (url: string, opts) => {
      console.log(`Crawling ${url}...`);

      try {
        const graph = await crawlUrl({
          startUrl: url,
          name: opts.name,
          screenshotDir: opts.screenshotDir,
          maxPages: parseInt(opts.maxPages, 10),
          interactions: opts.interactions !== false,
          maxInteractionsPerPage: parseInt(opts.maxInteractions, 10),
          includeInteraction: opts.includeInteraction,
          excludeInteraction: opts.excludeInteraction,
        });

        const outputPath = path.resolve(opts.output);
        fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
        console.log(formatGraphRunSummary(outputPath, graph));
        const diagnostics = formatCrawlDiagnostics(graph.meta.diagnostics);
        if (diagnostics) console.log(`\n${diagnostics}`);
        if (opts.diagnosticsOutput) {
          const diagnosticsPath = writeCrawlDiagnosticsReport(
            graph.meta.diagnostics,
            opts.diagnosticsOutput
          );
          console.log(`  Diagnostics: ${diagnosticsPath}`);
        }
        if (opts.failOnDiagnostics && hasCrawlDiagnosticIssues(graph.meta.diagnostics)) {
          console.error(
            '\nCrawl diagnostics contain issues; failing because --fail-on-diagnostics is set.'
          );
          process.exit(1);
        }
      } catch (err) {
        console.error('Crawl failed:', err);
        process.exit(1);
      }
    });
}
