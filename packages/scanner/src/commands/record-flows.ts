import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { recordFlows } from '../modes/record-flows.js';

export function createRecordFlowsCommand(): Command {
  return new Command('record-flows')
    .description(
      'Run Playwright tests from a flows directory and record navigation with screenshots'
    )
    .requiredOption('--flows-dir <dir>', 'Directory containing Playwright .spec.ts test files')
    .requiredOption('--base-url <url>', 'Base URL for the app under test')
    .option('--storage-state <path>', 'Path to auth storage state file')
    .option('--routes <path>', 'Path to existing nav-map.json to merge with')
    .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
    .option('-o, --output <path>', 'Output file path', 'nav-map.json')
    .option('-n, --name <name>', 'Project name for the graph')
    .option('--fail-on-test-errors', 'Exit non-zero if any tests fail')
    .action(async opts => {
      console.log('Recording flows from Playwright tests...\n');
      try {
        const graph = await recordFlows({
          flowsDir: opts.flowsDir,
          baseUrl: opts.baseUrl,
          storageState: opts.storageState,
          routesJson: opts.routes,
          screenshotDir: opts.screenshotDir,
          output: opts.output,
          name: opts.name,
          failOnTestErrors: opts.failOnTestErrors,
        });

        const outputPath = path.resolve(opts.output);
        fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
        console.log(`\nWrote ${outputPath}`);
        console.log(`  Nodes: ${graph.nodes.length}`);
        console.log(`  Edges: ${graph.edges.length}`);
        console.log(`  Groups: ${graph.groups.length}`);
        console.log(`  Flows: ${graph.flows?.length ?? 0}`);
      } catch (err) {
        console.error('Record-flows failed:', err);
        process.exit(1);
      }
    });
}
