import { describe, expect, it } from 'vitest';
import { applyDefaults } from '../config.js';
import { formatConfigErrors, formatConfigSummary } from '../config-report.js';

describe('config-report', () => {
  it('formats validation errors with numbered actionable output', () => {
    expect(
      formatConfigErrors(['Missing required field: url', 'maxPages must be a positive integer'])
    ).toMatchInlineSnapshot(`
        "Config validation failed:
          1. Missing required field: url
          2. maxPages must be a positive integer

        Fix nav-map.config.json, then rerun \`nav-map check-config\`."
      `);
  });

  it('formats a valid resolved config summary', () => {
    const config = applyDefaults({
      url: 'https://example.com',
      output: 'public/nav-map.json',
      diagnosticsOutput: '.nav-map/diagnostics.json',
      auth: {
        email: 'user@example.com',
        password: 'secret',
        loginUrl: 'https://example.com/login',
      },
    });

    expect(formatConfigSummary(config, 'nav-map.config.json')).toContain(
      'Auth: enabled (https://example.com/login)'
    );
    expect(formatConfigSummary(config, 'nav-map.config.json')).toContain(
      'Output: public/nav-map.json'
    );
    expect(formatConfigSummary(config, 'nav-map.config.json')).toContain(
      'Diagnostics output: .nav-map/diagnostics.json'
    );
  });
});
