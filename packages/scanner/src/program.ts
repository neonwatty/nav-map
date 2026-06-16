import { Command } from 'commander';
import { createAuthCommand } from './commands/auth.js';
import { createAuthStateCommand } from './commands/auth-state.js';
import { createCheckConfigCommand } from './commands/check-config.js';
import { createContextCommand } from './commands/context.js';
import { createCrawlCommand } from './commands/crawl.js';
import { createDiffCommand } from './commands/diff.js';
import { createDiagnosticsCommand } from './commands/diagnostics.js';
import { createGenerateCommand } from './commands/generate.js';
import { createIngestCommand } from './commands/ingest.js';
import { createProbeCommand } from './commands/probe.js';
import { createRecordCommand } from './commands/record.js';
import { createRecordFlowsCommand } from './commands/record-flows.js';
import { createScanCommand } from './commands/scan.js';
import { createServeCommand } from './commands/serve.js';
import { createWorkflowCommand } from './commands/workflow.js';

export function createProgram(program = new Command()): Command {
  program
    .name('nav-map')
    .description('Generate nav-map.json from a Next.js app or URL')
    .version('0.1.0');

  program.addCommand(createScanCommand());
  program.addCommand(createCrawlCommand());
  program.addCommand(createAuthCommand());
  program.addCommand(createAuthStateCommand());
  program.addCommand(createRecordCommand());
  program.addCommand(createRecordFlowsCommand());
  program.addCommand(createGenerateCommand());
  program.addCommand(createCheckConfigCommand());
  program.addCommand(createDiagnosticsCommand());
  program.addCommand(createServeCommand());
  program.addCommand(createIngestCommand());
  program.addCommand(createContextCommand());
  program.addCommand(createProbeCommand());
  program.addCommand(createDiffCommand());
  program.addCommand(createWorkflowCommand());

  return program;
}
