import { Command } from 'commander';
import { runIngest } from '../modes/ingest.js';
import { formatIngestRunSummary } from './run-summary.js';

export function createIngestCommand(): Command {
  return new Command('ingest')
    .description('Ingest Playwright test results and merge with a nav-map graph')
    .argument('<dir>', 'Path to Playwright output directory (contains report JSON + trace ZIPs)')
    .option('-o, --output <dir>', 'Output directory', '.nav-map')
    .option('--base <path>', 'Base nav-map.json to merge with')
    .option('--base-url <url>', 'Base URL to strip from trace URLs (e.g., http://localhost:3000)')
    .option('--no-screenshots', 'Skip screenshot extraction from traces')
    .action(async (dir: string, opts) => {
      console.log('Ingesting Playwright test results...\n');

      try {
        const result = await runIngest({
          reportDir: dir,
          output: opts.output,
          baseGraphPath: opts.base,
          baseUrl: opts.baseUrl,
          screenshots: opts.screenshots !== false,
        });

        console.log(formatIngestRunSummary(result));
      } catch (err) {
        console.error('Ingest failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
