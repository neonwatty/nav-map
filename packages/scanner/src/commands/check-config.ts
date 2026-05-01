import { Command } from 'commander';
import {
  formatConfigErrors,
  formatConfigSummary,
  loadAndValidateConfig,
} from '../config-report.js';

export function createCheckConfigCommand(): Command {
  return new Command('check-config')
    .description('Validate nav-map.config.json without launching a browser')
    .option('-c, --config <path>', 'Path to config file', 'nav-map.config.json')
    .action(opts => {
      try {
        const result = loadAndValidateConfig(opts.config);
        if (!result.ok) {
          console.error(formatConfigErrors(result.errors));
          process.exit(1);
        }

        console.log(formatConfigSummary(result.config!, opts.config));
      } catch (err) {
        console.error('Config check failed:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
