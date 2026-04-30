import type { ResolvedConfig } from './config.js';
import { applyDefaults, loadConfig, validateConfig } from './config.js';

export interface ConfigValidationResult {
  ok: boolean;
  config?: ResolvedConfig;
  errors: string[];
}

export function loadAndValidateConfig(configPath?: string): ConfigValidationResult {
  const raw = loadConfig(configPath);
  const errors = validateConfig(raw);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, config: applyDefaults(raw), errors: [] };
}

export function formatConfigErrors(errors: string[]): string {
  return [
    'Config validation failed:',
    ...errors.map((error, index) => `  ${index + 1}. ${error}`),
    '',
    'Fix nav-map.config.json, then rerun `nav-map check-config`.',
  ].join('\n');
}

export function formatConfigSummary(config: ResolvedConfig, configPath: string): string {
  return [
    `Config OK: ${configPath}`,
    `  URL: ${config.url}`,
    `  Output: ${config.output}`,
    `  Diagnostics output: ${config.diagnosticsOutput ?? 'disabled'}`,
    `  Max pages: ${config.maxPages}`,
    `  Interactions: ${config.interactions ? 'enabled' : 'disabled'}`,
    `  Max interactions/page: ${config.maxInteractionsPerPage}`,
    `  Auth: ${config.auth ? `enabled (${config.auth.loginUrl})` : 'disabled'}`,
  ].join('\n');
}
