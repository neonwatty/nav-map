import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { recordTests } from '../modes/record.js';
import { formatGraphRunSummary } from './run-summary.js';

export function createRecordCommand(): Command {
  return new Command('record')
    .description('Record navigation from E2E test runs against a live app')
    .option('--playwright-config <path>', 'Path to Playwright config file', 'playwright.config.ts')
    .option('--storage-state <path>', 'Path to auth storage state file')
    .option('--routes <path>', 'Path to routes.json from a prior nav-map scan')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
    .option('-o, --output <path>', 'Output file path', 'nav-map.json')
    .option('-n, --name <name>', 'Project name for the graph')
    .action(async opts => {
      console.log('Recording navigation from E2E tests...\n');

      try {
        const graph = await recordTests({
          playwrightConfig: opts.playwrightConfig,
          storageState: opts.storageState,
          routesJson: opts.routes,
          screenshotDir: opts.screenshotDir,
          output: opts.output,
          name: opts.name,
        });

        const outputPath = path.resolve(opts.output);
        fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
        console.log(formatGraphRunSummary(outputPath, graph));
      } catch (err) {
        console.error('Record failed:', err);
        process.exit(1);
      }
    });
}
