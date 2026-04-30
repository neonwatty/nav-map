import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { applyDefaults } from '../config.js';

const mocks = vi.hoisted(() => ({
  crawlUrl: vi.fn(),
}));

vi.mock('../modes/crawl.js', () => ({
  crawlUrl: mocks.crawlUrl,
}));

describe('generate', () => {
  afterEach(() => {
    mocks.crawlUrl.mockReset();
  });

  it('exports runGenerate function', async () => {
    const mod = await import('../modes/generate.js');
    expect(typeof mod.runGenerate).toBe('function');
  });

  it('exports GenerateResult type with expected shape', async () => {
    const mod = await import('../modes/generate.js');
    // Verify the function signature accepts ResolvedConfig
    expect(mod.runGenerate.length).toBeGreaterThanOrEqual(1);
  });

  it('maps resolved interaction config into crawl options', async () => {
    const mod = await import('../modes/generate.js');
    const config = applyDefaults({
      url: 'https://example.com',
      name: 'Example',
      maxPages: 7,
      screenshotDir: 'shots',
      interactions: false,
      maxInteractionsPerPage: 3,
      includeInteraction: ['settings'],
      excludeInteraction: ['delete'],
    });

    expect(mod.createCrawlOptions(config)).toMatchObject({
      startUrl: 'https://example.com',
      name: 'Example',
      screenshotDir: 'shots',
      maxPages: 7,
      interactions: false,
      maxInteractionsPerPage: 3,
      includeInteraction: ['settings'],
      excludeInteraction: ['delete'],
    });
  });

  it('exports createCrawlOptions function', async () => {
    const mod = await import('../modes/generate.js');
    expect(typeof mod.createCrawlOptions).toBe('function');
  });

  it('writes diagnostics from generate config', async () => {
    const mod = await import('../modes/generate.js');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-generate-'));
    const output = path.join(tempDir, 'nav-map.json');
    const diagnosticsOutput = path.join(tempDir, 'diagnostics', 'crawl.json');
    const diagnostics = {
      crawl: {
        attemptedPages: 1,
        successfulPages: 1,
        failedPages: [],
        screenshotFailures: [],
        maxPagesReached: false,
      },
    };
    mocks.crawlUrl.mockResolvedValue({
      version: '1.0',
      meta: {
        name: 'Example',
        generatedAt: '2026-04-30T00:00:00.000Z',
        generatedBy: 'url-crawl',
        diagnostics,
      },
      nodes: [],
      edges: [],
      groups: [],
    });

    const result = await mod.runGenerate(
      applyDefaults({
        url: 'https://example.com',
        output,
        diagnosticsOutput,
      })
    );

    expect(result.diagnosticsPath).toBe(path.resolve(diagnosticsOutput));
    expect(JSON.parse(fs.readFileSync(diagnosticsOutput, 'utf8'))).toEqual(diagnostics);
  });

  it('lets generate CLI options override config diagnostics output', async () => {
    const mod = await import('../modes/generate.js');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-generate-'));
    const configDiagnosticsOutput = path.join(tempDir, 'config-diagnostics.json');
    const optionDiagnosticsOutput = path.join(tempDir, 'option-diagnostics.json');
    mocks.crawlUrl.mockResolvedValue({
      version: '1.0',
      meta: {
        name: 'Example',
        generatedAt: '2026-04-30T00:00:00.000Z',
        generatedBy: 'url-crawl',
        diagnostics: undefined,
      },
      nodes: [],
      edges: [],
      groups: [],
    });

    const result = await mod.runGenerate(
      applyDefaults({
        url: 'https://example.com',
        output: path.join(tempDir, 'nav-map.json'),
        diagnosticsOutput: configDiagnosticsOutput,
      }),
      { diagnosticsOutput: optionDiagnosticsOutput }
    );

    expect(result.diagnosticsPath).toBe(path.resolve(optionDiagnosticsOutput));
    expect(fs.existsSync(configDiagnosticsOutput)).toBe(false);
    expect(JSON.parse(fs.readFileSync(optionDiagnosticsOutput, 'utf8'))).toBeNull();
  });
});
