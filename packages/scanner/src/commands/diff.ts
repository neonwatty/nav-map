import { Command } from 'commander';
import {
  loadProbeRun,
  renderProbeDiff,
  renderProbeDiffContract,
  writeProbeDiff,
} from '../modes/diff.js';

export function createDiffCommand(): Command {
  return new Command('diff')
    .description('Render expected-vs-observed probe findings')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--probe <path>', 'Probe run JSON path')
    .option('--format <format>', 'Output format: markdown or json', 'markdown')
    .option('--out <path>', 'Diff output path', '.nav-map/probe-runs/latest.diff.md')
    .action((_manifestPath, opts) => {
      try {
        const format = String(opts.format);
        if (format !== 'markdown' && format !== 'json') {
          throw new Error('--format must be markdown or json');
        }

        const run = loadProbeRun(opts.probe);
        const output =
          format === 'json'
            ? JSON.stringify(renderProbeDiffContract(run, opts.out), null, 2)
            : renderProbeDiff(run);
        writeProbeDiff(output, opts.out);
        console.log(`Wrote ${opts.out}`);
      } catch (err) {
        console.error('Diff failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
