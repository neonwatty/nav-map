import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { createAuthStateCommand } from '../commands/auth-state.js';
import { createCheckConfigCommand } from '../commands/check-config.js';
import { createContextCommand } from '../commands/context.js';
import { createCrawlCommand } from '../commands/crawl.js';
import { createDiffCommand } from '../commands/diff.js';
import { createDiagnosticsCommand } from '../commands/diagnostics.js';
import { createGenerateCommand } from '../commands/generate.js';
import { createProbeCommand } from '../commands/probe.js';
import { createWorkflowCommand } from '../commands/workflow.js';
import { createProgram } from '../program.js';

function optionFlags(command: Command): string[] {
  return command.options.map(option => option.flags);
}

function commandHelpLine(help: string, commandName: string): string {
  return help.split('\n').find(line => line.trimStart().startsWith(`${commandName} `)) ?? '';
}

describe('scanner command registration', () => {
  it('registers the full CLI program metadata and command order', () => {
    const program = createProgram();

    expect(program.name()).toBe('nav-map');
    expect(program.description()).toContain('Generate nav-map.json from a Next.js app or URL');
    expect(program.description()).toContain('Agent QA loop: workflow inspect');
    expect(program.version()).toBe('0.1.0');
    expect(program.commands.map(command => command.name())).toEqual([
      'scan',
      'crawl',
      'auth',
      'auth-state',
      'record',
      'record-flows',
      'generate',
      'check-config',
      'diagnostics',
      'serve',
      'ingest',
      'context',
      'probe',
      'diff',
      'workflow',
    ]);
  });

  it('shows top-level help with commands in registration order', () => {
    const program = createProgram();
    const help = program.helpInformation();
    const commandNames = [
      'scan',
      'crawl',
      'auth',
      'auth-state',
      'record',
      'record-flows',
      'generate',
      'check-config',
      'diagnostics',
      'serve',
      'ingest',
      'context',
      'probe',
      'diff',
      'workflow',
    ];

    expect(help).toContain('Usage: nav-map [options] [command]');
    expect(help).toContain('Generate nav-map.json from a Next.js app or URL');
    expect(help).toContain('Options:');
    expect(help).toContain('-V, --version');
    expect(help).toContain('-h, --help');
    expect(help).toContain('Commands:');
    expect(help).toContain('Agent QA loop:');
    expect(help).toContain('nav-map workflow <manifest> --inspect --contract');
    expect(help).toContain('UI Target preflight is a lightweight browser reachability check');

    for (const commandName of commandNames) {
      expect(commandHelpLine(help, commandName)).not.toBe('');
    }

    const commandIndexes = commandNames.map(commandName =>
      help.indexOf(commandHelpLine(help, commandName))
    );

    expect(commandIndexes).toEqual([...commandIndexes].sort((left, right) => left - right));
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
      '--workflow-manifest <path>',
      '--auth-state <state>',
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

  it('registers auth-state command group', () => {
    const command = createAuthStateCommand();

    expect(command.name()).toBe('auth-state');
    expect(command.description()).toBe('Capture or verify workflow auth states');
    expect(command.commands.map(child => child.name())).toEqual(['verify', 'capture']);

    const [verifyCommand, captureCommand] = command.commands;
    expect(verifyCommand.registeredArguments.map(argument => argument.name())).toEqual([
      'manifest',
    ]);
    expect(optionFlags(verifyCommand)).toEqual([
      '--state <state>',
      '--base-url <url>',
      '--contract',
    ]);

    expect(captureCommand.registeredArguments.map(argument => argument.name())).toEqual([
      'manifest',
    ]);
    expect(optionFlags(captureCommand)).toEqual([
      '--state <state>',
      '--base-url <url>',
      '--out <path>',
      '--headed',
      '--contract',
    ]);
  });

  it('registers workflow command options', () => {
    const command = createWorkflowCommand();
    const help = command.helpInformation();

    expect(command.name()).toBe('workflow');
    expect(command.description()).toContain(
      'Generate nav-map.json from a project workflow manifest'
    );
    expect(command.description()).toContain('Screenshot capture navigates manifest nodes only');
    expect(command.registeredArguments.map(argument => argument.name())).toEqual(['manifest']);
    expect(optionFlags(command)).toEqual([
      '-o, --output <path>',
      '--base-url <url>',
      '--screenshot-dir <dir>',
      '--auth-state <state>',
      '--inspect',
      '--format <format>',
      '--contract',
      '--no-screenshots',
    ]);
    expect(command.getOptionValue('output')).toBeUndefined();
    expect(command.getOptionValue('screenshotDir')).toBe('nav-screenshots');
    expect(help).toContain('workflow.inspect.json');
    expect(help).toContain('Screenshot capture navigates manifest nodes only');
    expect(help).toContain('Auth state is referenced by id only in command output');
  });

  it('registers context command options', () => {
    const command = createContextCommand();

    expect(command.name()).toBe('context');
    expect(command.description()).toBe('Render agent-consumable context from a workflow manifest');
    expect(command.registeredArguments.map(argument => argument.name())).toEqual(['manifest']);
    expect(optionFlags(command)).toEqual([
      '--auth-state <state>',
      '--focus <items>',
      '--section <section...>',
      '--persona <persona...>',
      '--auth <auth...>',
      '--health <health...>',
      '--evidence <kind...>',
      '--format <format>',
      '--contract',
      '--line-budget <n>',
      '-o, --out <path>',
    ]);
    expect(command.getOptionValue('focus')).toBe('');
    expect(command.getOptionValue('format')).toBe('markdown');
    expect(command.getOptionValue('lineBudget')).toBe('250');
  });

  it('parses comma-separated context filter values in variadic options', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-context-command-'));
    const manifestPath = path.join(tempDir, 'workflow.json');
    const outputPath = path.join(tempDir, 'context.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Comma Filters',
        nodes: [
          {
            id: 'speaker-route',
            route: '/speaker',
            label: 'Speaker',
            section: 'speaker',
          },
          {
            id: 'admin-route',
            route: '/admin',
            label: 'Admin',
            section: 'admin',
          },
          {
            id: 'public-route',
            route: '/',
            label: 'Public',
            section: 'public',
          },
        ],
      })
    );

    await createContextCommand().parseAsync(
      [
        'node',
        'context',
        manifestPath,
        '--section',
        'speaker,admin',
        '--format',
        'json',
        '--out',
        outputPath,
      ],
      { from: 'node' }
    );

    const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(parsed.routes.map((route: { id: string }) => route.id)).toEqual([
      'speaker-route',
      'admin-route',
    ]);
  });

  it('registers probe command options', () => {
    const command = createProbeCommand();

    expect(command.name()).toBe('probe');
    expect(command.description()).toBe(
      'Probe workflow routes and write safe verification receipts'
    );
    expect(command.registeredArguments.map(argument => argument.name())).toEqual(['manifest']);
    expect(optionFlags(command)).toEqual([
      '--base-url <url>',
      '--auth-state <state>',
      '--flow <name>',
      '--nodes <ids>',
      '--out <path>',
      '--screenshots-dir <dir>',
      '--contract',
    ]);
    expect(command.getOptionValue('out')).toBe('.nav-map/probe-runs/latest.json');
    expect(command.getOptionValue('screenshotsDir')).toBe('.nav-map/probe-runs/screenshots');
  });

  it('registers diff command options', () => {
    const command = createDiffCommand();

    expect(command.name()).toBe('diff');
    expect(command.description()).toBe('Render expected-vs-observed probe findings');
    expect(command.registeredArguments.map(argument => argument.name())).toEqual(['manifest']);
    expect(optionFlags(command)).toEqual(['--probe <path>', '--format <format>', '--out <path>']);
    expect(command.getOptionValue('out')).toBeUndefined();
    expect(command.helpInformation()).toContain('defaults to .md or .json based on');
    expect(command.helpInformation()).toContain('--format');
  });
});
