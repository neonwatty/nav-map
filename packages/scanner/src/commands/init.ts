import { Command } from 'commander';
import { initProject } from '../modes/project.js';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a portable NavMap project in a web-app repository')
    .argument('[dir]', 'Web-app repository directory', '.')
    .option('--id <id>', 'Stable project id')
    .option('--name <name>', 'Human-readable project name')
    .option('--manifest <path>', 'Workflow manifest path for curated workflow mode')
    .option('--url <url>', 'Live URL for crawl mode')
    .option('--base-url <url>', 'Default local environment base URL')
    .option('--json', 'Print the initialization receipt as JSON')
    .action((dir: string, opts) => {
      try {
        const receipt = initProject({
          rootDir: dir,
          id: opts.id,
          name: opts.name,
          manifest: opts.manifest,
          url: opts.url,
          baseUrl: opts.baseUrl,
        });
        if (opts.json) {
          console.log(JSON.stringify(receipt, null, 2));
          return;
        }
        console.log(`\nNavMap project ${receipt.status}: ${receipt.projectPath}`);
        console.log(`  Project: ${receipt.project.name} (${receipt.project.id})`);
        console.log(`  Source: ${receipt.project.sourceType}`);
        console.log(`  Next: ${receipt.nextActions.join(' -> ')}\n`);
      } catch (error) {
        console.error('Init failed:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });
}
