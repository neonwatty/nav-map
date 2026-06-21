import { Command } from 'commander';
import { loadWorkflowManifest } from '../modes/context.js';
import {
  loadProbeRun,
  renderProbeDiff,
  renderProbeDiffContract,
  validateProbeRunManifest,
  writeProbeDiff,
  type ProbeDiffManifest,
} from '../modes/diff.js';

export function createDiffCommand(): Command {
  return new Command('diff')
    .description('Render expected-vs-observed probe findings')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--probe <path>', 'Probe run JSON path')
    .option('--format <format>', 'Output format: markdown or json', 'markdown')
    .option('--out <path>', 'Diff output path; defaults to .md or .json based on --format')
    .action((manifestPath, opts) => {
      try {
        const format = String(opts.format);
        if (format !== 'markdown' && format !== 'json') {
          throw new Error('--format must be markdown or json');
        }

        const run = loadProbeRun(opts.probe);
        const manifest = loadWorkflowManifest(manifestPath) as ProbeDiffManifest;
        validateProbeRunManifest(run, manifest, manifestPath);
        const outputPath =
          opts.out ??
          (format === 'json'
            ? '.nav-map/probe-runs/latest.diff.json'
            : '.nav-map/probe-runs/latest.diff.md');
        const output =
          format === 'json'
            ? JSON.stringify(renderProbeDiffContract(run, { outputPath, manifestPath }), null, 2)
            : renderProbeDiff(run);
        writeProbeDiff(output, outputPath);
        console.log(`Wrote ${outputPath}`);
      } catch (err) {
        console.error('Diff failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
