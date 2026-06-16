import { Command } from 'commander';
import {
  buildAuthStateContract,
  captureAuthState,
  verifyAuthState,
  type AuthStateManifest,
} from '../modes/auth-state.js';
import { loadWorkflowManifest } from '../modes/context.js';

export function createAuthStateCommand(): Command {
  const command = new Command('auth-state').description('Capture or verify workflow auth states');

  command
    .command('verify')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--state <state>', 'Auth state id')
    .requiredOption('--base-url <url>', 'Base URL to verify against')
    .option('--contract', 'Wrap output in the versioned nav-map agent contract envelope')
    .action(async (manifestPath, opts) => {
      try {
        const receipt = await verifyAuthState({
          manifest: loadWorkflowManifest(manifestPath) as AuthStateManifest,
          stateId: opts.state,
          baseUrl: opts.baseUrl,
        });
        console.log(
          JSON.stringify(
            opts.contract ? buildAuthStateContract(receipt, 'auth-state-verify') : receipt,
            null,
            2
          )
        );
        if (!receipt.verified) {
          process.exit(1);
        }
      } catch (err) {
        console.error('Auth-state verify failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  command
    .command('capture')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--state <state>', 'Auth state id')
    .requiredOption('--base-url <url>', 'Base URL to capture against')
    .requiredOption('--out <path>', 'Storage state output path')
    .option('--headed', 'Run browser headed for manual login')
    .option('--contract', 'Wrap output in the versioned nav-map agent contract envelope')
    .action(async (manifestPath, opts) => {
      try {
        const receipt = await captureAuthState({
          manifest: loadWorkflowManifest(manifestPath) as AuthStateManifest,
          stateId: opts.state,
          baseUrl: opts.baseUrl,
          outputPath: opts.out,
          headed: Boolean(opts.headed),
        });
        console.log(
          JSON.stringify(
            opts.contract ? buildAuthStateContract(receipt, 'auth-state-capture') : receipt,
            null,
            2
          )
        );
      } catch (err) {
        console.error('Auth-state capture failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return command;
}
