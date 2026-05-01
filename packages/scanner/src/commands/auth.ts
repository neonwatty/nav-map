import { Command } from 'commander';
import { runAuth } from '../modes/auth.js';

export function createAuthCommand(): Command {
  return new Command('auth')
    .description('Log in to a website interactively and save auth state')
    .argument('<url>', 'URL to open for login')
    .option('-o, --output <path>', 'Output file for auth state', 'auth.json')
    .action(async (url: string, opts) => {
      try {
        await runAuth({ url, output: opts.output });
      } catch (err) {
        console.error('Auth failed:', err);
        process.exit(1);
      }
    });
}
