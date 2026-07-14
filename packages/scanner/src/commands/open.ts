import { spawn } from 'node:child_process';
import { Command } from 'commander';
import { resolveOpenTarget } from '../modes/project.js';
import { startServer } from '../modes/serve.js';

export function createOpenCommand(): Command {
  return new Command('open')
    .description('Open an initialized project or nav-map.json in the complete local NavMap viewer')
    .argument('[target]', 'Initialized project directory or path to nav-map.json')
    .option('-p, --port <port>', 'Port number', '3333')
    .option('--host <host>', 'Host interface to bind')
    .option('--screenshot-dir <dir>', 'Directory containing screenshots')
    .option('--no-browser', 'Start the viewer without launching a browser')
    .action((target: string | undefined, opts) => {
      try {
        const resolved = resolveOpenTarget(target);
        startServer({
          jsonPath: resolved.jsonPath,
          screenshotDir: opts.screenshotDir ?? resolved.screenshotDir,
          port: parseInt(opts.port, 10),
          portFallbacks: 10,
          host: opts.host,
          onReady: info => {
            if (opts.browser) launchBrowser(info.url);
          },
        });
      } catch (err) {
        console.error('Open failed:', err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
}

export function launchBrowser(url: string): void {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', error => {
    console.warn(
      `Viewer is ready at ${url}, but the browser could not be opened: ${error.message}`
    );
  });
  child.unref();
}
