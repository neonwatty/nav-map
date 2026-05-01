import { Command } from 'commander';
import { createAuthCommand } from './commands/auth.js';
import { createCheckConfigCommand } from './commands/check-config.js';
import { createCrawlCommand } from './commands/crawl.js';
import { createDiagnosticsCommand } from './commands/diagnostics.js';
import { createGenerateCommand } from './commands/generate.js';
import { createIngestCommand } from './commands/ingest.js';
import { createRecordCommand } from './commands/record.js';
import { createRecordFlowsCommand } from './commands/record-flows.js';
import { createScanCommand } from './commands/scan.js';
import { createServeCommand } from './commands/serve.js';

export function createProgram(program = new Command()): Command {
  program
    .name('nav-map')
    .description('Generate nav-map.json from a Next.js app or URL')
    .version('0.1.0');

  program.addCommand(createScanCommand());
  program.addCommand(createCrawlCommand());
  program.addCommand(createAuthCommand());
  program.addCommand(createRecordCommand());
  program.addCommand(createRecordFlowsCommand());
  program.addCommand(createGenerateCommand());
  program.addCommand(createCheckConfigCommand());
  program.addCommand(createDiagnosticsCommand());
  program.addCommand(createServeCommand());
  program.addCommand(createIngestCommand());

  return program;
}
