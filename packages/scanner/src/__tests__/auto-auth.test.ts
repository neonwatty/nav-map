import { describe, it, expect } from 'vitest';
import type { NavMapAuthSelectors } from '../config.js';

describe('auto-auth', () => {
  it('exports autoLogin function', async () => {
    const mod = await import('../modes/auto-auth.js');
    expect(typeof mod.autoLogin).toBe('function');
  });

  it('exports buildLoginSteps function', async () => {
    const mod = await import('../modes/auto-auth.js');
    expect(typeof mod.buildLoginSteps).toBe('function');
  });

  describe('buildLoginSteps', () => {
    it('returns steps with provided selectors', async () => {
      const { buildLoginSteps } = await import('../modes/auto-auth.js');
      const selectors: NavMapAuthSelectors = {
        email: '#my-email',
        password: '#my-pass',
        submit: '#login-btn',
      };
      const steps = buildLoginSteps('user@test.com', 'pass123', selectors);
      expect(steps).toEqual([
        { action: 'fill', selector: '#my-email', value: 'user@test.com' },
        { action: 'fill', selector: '#my-pass', value: 'pass123' },
        { action: 'click', selector: '#login-btn' },
      ]);
    });

    it('uses default selectors when none provided', async () => {
      const { buildLoginSteps } = await import('../modes/auto-auth.js');
      const steps = buildLoginSteps('user@test.com', 'pass123');
      expect(steps[0].selector).toContain('input[type="email"]');
      expect(steps[1].selector).toBe('input[type="password"]');
      expect(steps[2].selector).toContain('button[type="submit"]');
    });
  });
});
