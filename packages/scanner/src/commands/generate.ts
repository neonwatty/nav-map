import { Command } from 'commander';
import { formatConfigErrors, loadAndValidateConfig } from '../config-report.js';
import { formatCrawlDiagnostics } from '../diagnostics-report.js';
import { runGenerate, shouldFailGenerateDiagnostics } from '../modes/generate.js';

export function createGenerateCommand(): Command {
  return new Command('generate')
    .description(
      'Load nav-map.config.json, auto-login if configured, crawl, and output nav-map.json'
    )
    .option('-c, --config <path>', 'Path to config file', 'nav-map.config.json')
    .option('--headed', 'Run browser in headed mode (useful for debugging login)')
    .option('--diagnostics-output <path>', 'Write crawl diagnostics JSON sidecar')
    .option(
      '--fail-on-diagnostics',
      'Exit non-zero if crawl diagnostics include failures or page-limit truncation'
    )
    .action(async opts => {
      try {
        const result = loadAndValidateConfig(opts.config);
        if (!result.ok) {
          console.error(formatConfigErrors(result.errors));
          process.exit(1);
        }

        const generated = await runGenerate(result.config!, {
          headless: !opts.headed,
          diagnosticsOutput: opts.diagnosticsOutput,
        });

        console.log(`\nWrote ${generated.outputPath}`);
        console.log(`  Nodes: ${generated.nodeCount}`);
        console.log(`  Edges: ${generated.edgeCount}`);
        console.log(`  Groups: ${generated.groupCount}`);
        const diagnostics = formatCrawlDiagnostics(generated.diagnostics);
        if (diagnostics) console.log(`\n${diagnostics}`);
        if (generated.diagnosticsPath) console.log(`  Diagnostics: ${generated.diagnosticsPath}`);
        if (
          shouldFailGenerateDiagnostics(
            result.config!,
            generated.diagnostics,
            opts.failOnDiagnostics
          )
        ) {
          console.error(
            '\nCrawl diagnostics contain issues; failing because diagnostics failure is enabled.'
          );
          process.exit(1);
        }
      } catch (err) {
        console.error('Generate failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
