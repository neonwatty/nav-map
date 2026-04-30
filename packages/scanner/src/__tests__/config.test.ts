import { describe, it, expect } from 'vitest';
import { validateConfig, applyDefaults } from '../config.js';
import type { NavMapConfig } from '../config.js';

describe('validateConfig', () => {
  it('returns no errors for a valid minimal config', () => {
    const config = { url: 'https://example.com' };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  it('returns error when url is missing', () => {
    const config = {};
    const errors = validateConfig(config as NavMapConfig);
    expect(errors).toContain('Missing required field: url');
  });

  it('returns error when url is not a valid URL', () => {
    const config = { url: 'not-a-url' };
    const errors = validateConfig(config);
    expect(errors).toContain('Invalid URL: not-a-url');
  });

  it('returns error when url is not HTTP(S)', () => {
    const config = { url: 'ftp://example.com' };
    const errors = validateConfig(config);
    expect(errors).toContain('URL must use http or https protocol');
  });

  it('returns error when auth has email but no password', () => {
    const config = {
      url: 'https://example.com',
      auth: { email: 'a@b.com' },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('auth.password is required when auth.email is provided');
  });

  it('returns error when auth has password but no email', () => {
    const config = {
      url: 'https://example.com',
      auth: { password: 'secret' },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('auth.email is required when auth.password is provided');
  });

  it('accepts valid auth config', () => {
    const config = {
      url: 'https://example.com',
      auth: { email: 'a@b.com', password: 'secret' },
    };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  it('returns error when auth is present but empty (no email or password)', () => {
    const config = {
      url: 'https://example.com',
      auth: {},
    };
    const errors = validateConfig(config);
    expect(errors).toContain(
      'auth.email and auth.password are both required when auth is provided'
    );
  });

  it('returns error when maxPages is not a positive integer', () => {
    const config = { url: 'https://example.com', maxPages: -1 };
    const errors = validateConfig(config);
    expect(errors).toContain('maxPages must be a positive integer');
  });

  it('returns error when optional string fields are blank or non-strings', () => {
    const config = {
      url: 'https://example.com',
      name: '',
      output: 123,
      diagnosticsOutput: '   ',
      screenshotDir: '   ',
    };
    const errors = validateConfig(config);
    expect(errors).toContain('name must be a non-empty string');
    expect(errors).toContain('output must be a non-empty string');
    expect(errors).toContain('diagnosticsOutput must be a non-empty string');
    expect(errors).toContain('screenshotDir must be a non-empty string');
  });

  it('returns error when interaction config has invalid types', () => {
    const config = {
      url: 'https://example.com',
      interactions: 'yes',
      failOnDiagnostics: 'yes',
      maxInteractionsPerPage: 0,
      includeInteraction: 'open',
      excludeInteraction: ['delete', 123],
    };
    const errors = validateConfig(config);
    expect(errors).toContain('interactions must be a boolean');
    expect(errors).toContain('failOnDiagnostics must be a boolean');
    expect(errors).toContain('maxInteractionsPerPage must be a positive integer');
    expect(errors).toContain('includeInteraction must be an array of strings');
    expect(errors).toContain('excludeInteraction must be an array of strings');
  });

  it('returns error when auth loginUrl is invalid', () => {
    const config = {
      url: 'https://example.com',
      auth: { email: 'a@b.com', password: 'secret', loginUrl: 'ftp://example.com/login' },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('auth.loginUrl must use http or https protocol');
  });

  it('returns error when auth credentials are blank or non-strings', () => {
    const config = {
      url: 'https://example.com',
      auth: { email: '', password: 123 },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('auth.email is required when auth.password is provided');
    expect(errors).toContain('auth.email must be a non-empty string');
    expect(errors).toContain('auth.password must be a non-empty string');
  });

  it('returns error when auth selectors are malformed', () => {
    const config = {
      url: 'https://example.com',
      auth: {
        email: 'a@b.com',
        password: 'secret',
        selectors: { email: '#email', password: '', submit: 123 },
      },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('auth.selectors.password must be a non-empty string');
    expect(errors).toContain('auth.selectors.submit must be a non-empty string');
  });

  it('returns error when auth selectors are not an object', () => {
    const config = {
      url: 'https://example.com',
      auth: { email: 'a@b.com', password: 'secret', selectors: [] },
    };
    const errors = validateConfig(config);
    expect(errors).toContain('auth.selectors must be an object');
  });
});

describe('applyDefaults', () => {
  it('fills in all defaults for a minimal config', () => {
    const config = { url: 'https://my-app.example.com/dashboard' };
    const result = applyDefaults(config);
    expect(result.name).toBe('my-app.example.com');
    expect(result.maxPages).toBe(50);
    expect(result.output).toBe('nav-map.json');
    expect(result.diagnosticsOutput).toBeUndefined();
    expect(result.failOnDiagnostics).toBe(false);
    expect(result.screenshotDir).toBe('nav-screenshots');
    expect(result.interactions).toBe(true);
    expect(result.maxInteractionsPerPage).toBe(20);
    expect(result.includeInteraction).toEqual([]);
    expect(result.excludeInteraction).toEqual([]);
  });

  it('preserves user-supplied values', () => {
    const config = {
      url: 'https://example.com',
      name: 'My App',
      maxPages: 20,
      output: 'custom.json',
      diagnosticsOutput: '.nav-map/diagnostics.json',
      failOnDiagnostics: true,
      interactions: false,
      maxInteractionsPerPage: 5,
      includeInteraction: ['settings'],
      excludeInteraction: ['delete'],
    };
    const result = applyDefaults(config);
    expect(result.name).toBe('My App');
    expect(result.maxPages).toBe(20);
    expect(result.output).toBe('custom.json');
    expect(result.diagnosticsOutput).toBe('.nav-map/diagnostics.json');
    expect(result.failOnDiagnostics).toBe(true);
    expect(result.interactions).toBe(false);
    expect(result.maxInteractionsPerPage).toBe(5);
    expect(result.includeInteraction).toEqual(['settings']);
    expect(result.excludeInteraction).toEqual(['delete']);
  });

  it('defaults auth.loginUrl to url when auth is provided', () => {
    const config = {
      url: 'https://example.com',
      auth: { email: 'a@b.com', password: 'pass' },
    };
    const result = applyDefaults(config);
    expect(result.auth!.loginUrl).toBe('https://example.com');
  });

  it('defaults auth selectors when not provided', () => {
    const config = {
      url: 'https://example.com',
      auth: { email: 'a@b.com', password: 'pass' },
    };
    const result = applyDefaults(config);
    expect(result.auth!.selectors).toEqual({
      email: 'input[type="email"], input[name="email"], input[id="email"]',
      password: 'input[type="password"]',
      submit: 'button[type="submit"], input[type="submit"]',
    });
  });

  it('preserves custom selectors', () => {
    const config = {
      url: 'https://example.com',
      auth: {
        email: 'a@b.com',
        password: 'pass',
        selectors: {
          email: '#my-email',
          password: '#my-pass',
          submit: '#my-btn',
        },
      },
    };
    const result = applyDefaults(config);
    expect(result.auth!.selectors).toEqual({
      email: '#my-email',
      password: '#my-pass',
      submit: '#my-btn',
    });
  });
});
