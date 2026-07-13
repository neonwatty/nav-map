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
import { createInitCommand } from './commands/init.js';
import { createOpenCommand } from './commands/open.js';
import { createProbeCommand } from './commands/probe.js';
import { createRecordCommand } from './commands/record.js';
import { createRecordFlowsCommand } from './commands/record-flows.js';
import { createScanCommand } from './commands/scan.js';
import { createServeCommand } from './commands/serve.js';
import { createSyncCommand } from './commands/sync.js';
import { createWorkflowCommand } from './commands/workflow.js';

export function createProgram(program = new Command()): Command {
  program
    .name('nav-map')
    .description(
      [
        'Generate nav-map.json from a Next.js app or URL.',
        'Agent QA loop: workflow inspect -> context -> auth-state verify -> probe -> diff -> workflow generate.',
        'Start with: nav-map workflow <manifest> --inspect --contract.',
        'UI Target preflight is a lightweight browser reachability check; use probe/diff receipts for route/workflow audit evidence.',
      ].join('\n')
    )
    .version('0.1.0')
    .addHelpText(
      'afterAll',
      `
Agent QA loop:
  nav-map workflow <manifest> --inspect --contract
  nav-map context <manifest> --format json --contract
  nav-map auth-state verify <manifest> --state <id> --base-url <url> --contract
  nav-map probe <manifest> --base-url <url> [--auth-state <id>] --contract
  nav-map diff <manifest> --probe .nav-map/probe-runs/latest.json
  nav-map workflow <manifest> --base-url <url> --screenshot-dir <dir> -o public/nav-map.json

Preview note:
  UI Target preflight is a lightweight browser reachability check. Use probe/diff receipts
  for route/workflow audit evidence, and use context/workflow inspect to include surfaces.
`
    );

  program.addCommand(createScanCommand());
  program.addCommand(createCrawlCommand());
  program.addCommand(createAuthCommand());
  program.addCommand(createAuthStateCommand());
  program.addCommand(createRecordCommand());
  program.addCommand(createRecordFlowsCommand());
  program.addCommand(createGenerateCommand());
  program.addCommand(createCheckConfigCommand());
  program.addCommand(createDiagnosticsCommand());
  program.addCommand(createInitCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createOpenCommand());
  program.addCommand(createServeCommand());
  program.addCommand(createIngestCommand());
  program.addCommand(createContextCommand());
  program.addCommand(createProbeCommand());
  program.addCommand(createDiffCommand());
  program.addCommand(createWorkflowCommand());

  return program;
}
