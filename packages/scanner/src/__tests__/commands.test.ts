import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { createCheckConfigCommand } from '../commands/check-config.js';
import { createCrawlCommand } from '../commands/crawl.js';
import { createDiagnosticsCommand } from '../commands/diagnostics.js';
import { createGenerateCommand } from '../commands/generate.js';
import { createProgram } from '../program.js';

function optionFlags(command: Command): string[] {
  return command.options.map(option => option.flags);
}

describe('scanner command registration', () => {
  it('registers the full CLI program metadata and command order', () => {
    const program = createProgram();

    expect(program.name()).toBe('nav-map');
    expect(program.description()).toBe('Generate nav-map.json from a Next.js app or URL');
    expect(program.version()).toBe('0.1.0');
    expect(program.commands.map(command => command.name())).toEqual([
      'scan',
      'crawl',
      'auth',
      'record',
      'record-flows',
      'generate',
      'check-config',
      'diagnostics',
      'serve',
      'ingest',
    ]);
  });

  it('registers diagnostics command options', () => {
    const command = createDiagnosticsCommand();

    expect(command.name()).toBe('diagnostics');
    expect(command.description()).toBe(
      'Inspect crawl diagnostics from nav-map.json or a diagnostics sidecar'
    );
    expect(command.registeredArguments.map(argument => argument.name())).toEqual(['file']);
    expect(optionFlags(command)).toEqual(['--json', '--summary']);
  });

  it('registers check-config command options', () => {
    const command = createCheckConfigCommand();

    expect(command.name()).toBe('check-config');
    expect(command.description()).toBe('Validate nav-map.config.json without launching a browser');
    expect(optionFlags(command)).toEqual(['-c, --config <path>']);
    expect(command.getOptionValue('config')).toBe('nav-map.config.json');
  });

  it('registers crawl command options', () => {
    const command = createCrawlCommand();

    expect(command.name()).toBe('crawl');
    expect(command.description()).toBe('Crawl a live URL to generate a navigation map');
    expect(command.registeredArguments.map(argument => argument.name())).toEqual(['url']);
    expect(optionFlags(command)).toEqual([
      '-o, --output <path>',
      '--screenshot-dir <dir>',
      '-n, --name <name>',
      '--max-pages <n>',
      '--no-interactions',
      '--max-interactions <n>',
      '--include-interaction <pattern...>',
      '--exclude-interaction <pattern...>',
      '--diagnostics-output <path>',
      '--fail-on-diagnostics',
    ]);
    expect(command.getOptionValue('output')).toBe('nav-map.json');
    expect(command.getOptionValue('screenshotDir')).toBe('nav-screenshots');
    expect(command.getOptionValue('maxPages')).toBe('50');
    expect(command.getOptionValue('maxInteractions')).toBe('20');
  });

  it('registers generate command options', () => {
    const command = createGenerateCommand();

    expect(command.name()).toBe('generate');
    expect(command.description()).toBe(
      'Load nav-map.config.json, auto-login if configured, crawl, and output nav-map.json'
    );
    expect(optionFlags(command)).toEqual([
      '-c, --config <path>',
      '--headed',
      '--diagnostics-output <path>',
      '--fail-on-diagnostics',
    ]);
    expect(command.getOptionValue('config')).toBe('nav-map.config.json');
  });
});
