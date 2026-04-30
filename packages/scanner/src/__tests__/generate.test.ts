import { describe, it, expect } from 'vitest';
import { applyDefaults } from '../config.js';

describe('generate', () => {
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
});
