import { Command } from 'commander';
import {
  formatActionableCrawlDiagnostics,
  loadCrawlDiagnosticsFile,
} from '../diagnostics-report.js';

export function createDiagnosticsCommand(): Command {
  return new Command('diagnostics')
    .description('Inspect crawl diagnostics from nav-map.json or a diagnostics sidecar')
    .argument('<file>', 'Path to nav-map.json or diagnostics JSON')
    .option('--json', 'Print machine-readable JSON output')
    .option('--summary', 'Print a compact report without per-URL failure lists')
    .action((file: string, opts) => {
      try {
        const inspection = loadCrawlDiagnosticsFile(file);
        console.log(
          formatActionableCrawlDiagnostics(inspection, {
            json: opts.json,
            summary: opts.summary,
          })
        );
      } catch (err) {
        console.error('Diagnostics failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
