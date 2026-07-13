import { Command } from 'commander';
import { syncProject } from '../modes/sync.js';

export function createSyncCommand(): Command {
  return new Command('sync')
    .description('Regenerate an initialized NavMap project and record a verification receipt')
    .argument('[dir]', 'Initialized web-app repository directory', '.')
    .option('-e, --environment <id>', 'Named project environment')
    .option('--auth-state <id>', 'Workflow auth state id')
    .option('--no-screenshots', 'Skip screenshot capture')
    .option('--max-pages <count>', 'Maximum pages for URL projects', '50')
    .option('--json', 'Print the sync receipt as JSON')
    .action(async (dir: string, opts) => {
      try {
        const result = await syncProject({
          rootDir: dir,
          environment: opts.environment,
          authState: opts.authState,
          screenshots: opts.screenshots,
          maxPages: parsePositiveInteger(opts.maxPages, '--max-pages'),
        });
        if (opts.json) {
          console.log(JSON.stringify(result.receipt, null, 2));
          return;
        }
        console.log(`\nNavMap synced: ${result.receipt.graph.path}`);
        console.log(
          `  Graph: ${result.receipt.graph.nodeCount} nodes, ${result.receipt.graph.edgeCount} edges, ${result.receipt.graph.flowCount} flows`
        );
        console.log(
          `  Evidence: ${result.receipt.verification.capturedScreenshotCount} screenshots`
        );
        console.log(`  Receipt: ${result.receipt.receiptPath}`);
        console.log(`  Next: ${result.receipt.nextActions.join(' -> ')}\n`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${flag} must be a positive integer.`);
  return parsed;
}
