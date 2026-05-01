import { Command } from 'commander';
import { startServer } from '../modes/serve.js';

export function createServeCommand(): Command {
  return new Command('serve')
    .description('Start a local viewer for a nav-map.json file')
    .argument('[file]', 'Path to nav-map.json', 'nav-map.json')
    .option('-p, --port <port>', 'Port number', '3333')
    .option('--screenshot-dir <dir>', 'Directory containing screenshots')
    .action((file: string, opts) => {
      try {
        startServer({
          jsonPath: file,
          screenshotDir: opts.screenshotDir,
          port: parseInt(opts.port, 10),
        });
      } catch (err) {
        console.error('Serve failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
