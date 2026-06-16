import { Command } from 'commander';
import { runWorkflowInspectManifest, runWorkflowManifest } from '../modes/workflow.js';

export function createWorkflowCommand(): Command {
  return new Command('workflow')
    .description('Generate nav-map.json from a project workflow manifest')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .option('-o, --output <path>', 'Output file path', 'nav-map.json')
    .option('--base-url <url>', 'Base URL for deterministic screenshot capture')
    .option('--screenshot-dir <dir>', 'Screenshot output directory', 'nav-screenshots')
    .option('--auth-state <state>', 'Auth state id for screenshot capture')
    .option(
      '--inspect',
      'Inspect and validate workflow manifest structure instead of generating a graph'
    )
    .option('--format <format>', 'Inspect output format: json', 'json')
    .option('--contract', 'Wrap inspect JSON in the versioned nav-map agent contract envelope')
    .option('--no-screenshots', 'Skip screenshot capture even when --base-url is provided')
    .action(async (manifest, opts) => {
      try {
        if (opts.inspect) {
          const format = String(opts.format);
          if (format !== 'json') {
            throw new Error('--inspect only supports --format json');
          }
          const result = await runWorkflowInspectManifest(manifest, {
            output: opts.output,
            contract: Boolean(opts.contract),
          });

          console.log(`\nWrote ${result.outputPath}`);
          console.log(`  Valid: ${result.valid}`);
          console.log(`  Nodes: ${result.nodeCount}`);
          console.log(`  Edges: ${result.edgeCount}`);
          console.log(`  Flows: ${result.flowCount}`);
          return;
        }

        if (opts.contract) {
          throw new Error('--contract is only supported with --inspect');
        }

        const result = await runWorkflowManifest(manifest, {
          output: opts.output,
          baseUrl: opts.baseUrl,
          screenshotDir: opts.screenshotDir,
          authState: opts.authState,
          screenshots: opts.screenshots,
        });

        console.log(`\nWrote ${result.outputPath}`);
        console.log(`  Nodes: ${result.nodeCount}`);
        console.log(`  Edges: ${result.edgeCount}`);
        console.log(`  Groups: ${result.groupCount}`);
        console.log(`  Screenshots: ${result.screenshotCount}`);
      } catch (err) {
        console.error('Workflow generation failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
