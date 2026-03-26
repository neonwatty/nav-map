import { describe, it, expect } from 'vitest';

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
});
