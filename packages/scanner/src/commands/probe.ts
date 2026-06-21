import { Command } from 'commander';
import { loadWorkflowManifest } from '../modes/context.js';
import { runProbe, type ProbeManifest } from '../modes/probe.js';

export function createProbeCommand(): Command {
  return new Command('probe')
    .description('Probe workflow routes and write safe verification receipts')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--base-url <url>', 'Base URL to probe')
    .option('--auth-state <state>', 'Auth state id')
    .option('--flow <name>', 'Flow name to probe')
    .option('--nodes <ids>', 'Comma-separated node ids to probe')
    .option('--out <path>', 'Probe output JSON path', '.nav-map/probe-runs/latest.json')
    .option(
      '--screenshots-dir <dir>',
      'Screenshot output directory',
      '.nav-map/probe-runs/screenshots'
    )
    .option('--contract', 'Write the versioned nav-map agent contract envelope')
    .action(async (manifestPath, opts) => {
      try {
        const run = await runProbe({
          manifest: loadWorkflowManifest(manifestPath) as ProbeManifest,
          baseUrl: opts.baseUrl,
          authState: opts.authState,
          flow: opts.flow,
          nodes: opts.nodes
            ? String(opts.nodes)
                .split(',')
                .map((item: string) => item.trim())
                .filter(Boolean)
            : undefined,
          manifestPath,
          outputPath: opts.out,
          screenshotsDir: opts.screenshotsDir,
          contract: Boolean(opts.contract),
        });
        const failed = run.results.filter(result => result.status === 'fail').length;
        const warned = run.results.filter(result => result.status === 'warn').length;
        console.log(`Wrote ${opts.out}`);
        console.log(`Results: ${run.results.length} routes, ${failed} failed, ${warned} warned`);
        console.log(
          `Receipt: ${run.selection?.nodeIds.length ?? run.results.length} selected nodes, ${run.selection?.routeVariableKeys.length ?? 0} route variable keys, ${run.screenshotSummary?.captured ?? run.results.filter(result => result.screenshot).length} screenshots, auth state ${run.authState ?? 'none'}`
        );
        if (failed > 0) {
          process.exit(1);
        }
      } catch (err) {
        console.error('Probe failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
