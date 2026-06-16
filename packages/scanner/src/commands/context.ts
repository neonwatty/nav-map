import { Command } from 'commander';
import {
  loadWorkflowManifest,
  renderWorkflowContextContract,
  renderWorkflowContext,
  writeContextOutput,
  type ContextFormat,
} from '../modes/context.js';

export function createContextCommand(): Command {
  return new Command('context')
    .description('Render agent-consumable context from a workflow manifest')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .option('--auth-state <state>', 'Auth state to focus context around')
    .option('--focus <items>', 'Comma-separated node ids or sections', '')
    .option('--section <section...>', 'Filter routes by workflow section')
    .option('--persona <persona...>', 'Filter routes by persona')
    .option('--auth <auth...>', 'Filter routes by semantic auth requirement')
    .option('--health <health...>', 'Filter routes by health status')
    .option(
      '--evidence <kind...>',
      'Filter routes by evidence kind: screenshot, inspect, source-hint, redirect'
    )
    .option('--format <format>', 'Output format: markdown or json', 'markdown')
    .option('--contract', 'Wrap JSON output in the versioned nav-map agent contract envelope')
    .option('--line-budget <n>', 'Maximum Markdown lines', '250')
    .option('-o, --out <path>', 'Output file path')
    .action((manifestPath, opts) => {
      try {
        const format = String(opts.format) as ContextFormat;
        if (format !== 'markdown' && format !== 'json') {
          throw new Error('--format must be markdown or json');
        }
        if (opts.contract && format !== 'json') {
          throw new Error('--contract requires --format json');
        }

        const lineBudget = Number.parseInt(String(opts.lineBudget), 10);
        if (!Number.isFinite(lineBudget) || lineBudget < 1) {
          throw new Error('--line-budget must be a positive integer');
        }

        const manifest = loadWorkflowManifest(manifestPath);
        const contextOptions = {
          format,
          focus: String(opts.focus)
            .split(',')
            .map((item: string) => item.trim())
            .filter(Boolean),
          section: normalizeListOption(opts.section),
          persona: normalizeListOption(opts.persona),
          auth: normalizeListOption(opts.auth),
          health: normalizeListOption(opts.health),
          evidence: normalizeListOption(opts.evidence),
          authState: opts.authState,
          lineBudget,
          manifestPath,
        };
        const output = opts.contract
          ? renderWorkflowContextContract(manifest, contextOptions)
          : renderWorkflowContext(manifest, contextOptions);

        writeContextOutput(output, opts.out);
        if (opts.out) {
          console.log(`Wrote ${opts.out}`);
        }
      } catch (err) {
        console.error('Context failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}

function normalizeListOption(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap(item => String(item).split(','))
    .map(item => item.trim())
    .filter(Boolean);
}
