import fs from 'node:fs';
import path from 'node:path';

export interface NavMapAuthSelectors {
  email: string;
  password: string;
  submit: string;
}

export interface NavMapAuthConfig {
  loginUrl?: string;
  email: string;
  password: string;
  selectors?: NavMapAuthSelectors;
}

export interface NavMapConfig {
  url: string;
  name?: string;
  maxPages?: number;
  output?: string;
  screenshotDir?: string;
  interactions?: boolean;
  maxInteractionsPerPage?: number;
  includeInteraction?: string[];
  excludeInteraction?: string[];
  auth?: NavMapAuthConfig;
}

export interface ResolvedConfig {
  url: string;
  name: string;
  maxPages: number;
  output: string;
  screenshotDir: string;
  interactions: boolean;
  maxInteractionsPerPage: number;
  includeInteraction: string[];
  excludeInteraction: string[];
  auth?: NavMapAuthConfig & { loginUrl: string; selectors: NavMapAuthSelectors };
}

export const DEFAULT_SELECTORS: NavMapAuthSelectors = {
  email: 'input[type="email"], input[name="email"], input[id="email"]',
  password: 'input[type="password"]',
  submit: 'button[type="submit"], input[type="submit"]',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateConfig(config: any): string[] {
  const errors: string[] = [];

  if (!config.url) {
    errors.push('Missing required field: url');
    return errors;
  }

  try {
    const parsed = new URL(config.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push('URL must use http or https protocol');
    }
  } catch {
    errors.push(`Invalid URL: ${config.url}`);
  }

  if (config.maxPages !== undefined) {
    if (!Number.isInteger(config.maxPages) || config.maxPages < 1) {
      errors.push('maxPages must be a positive integer');
    }
  }

  if (config.interactions !== undefined && typeof config.interactions !== 'boolean') {
    errors.push('interactions must be a boolean');
  }

  if (config.maxInteractionsPerPage !== undefined) {
    if (!Number.isInteger(config.maxInteractionsPerPage) || config.maxInteractionsPerPage < 1) {
      errors.push('maxInteractionsPerPage must be a positive integer');
    }
  }

  validateStringArray(config.includeInteraction, 'includeInteraction', errors);
  validateStringArray(config.excludeInteraction, 'excludeInteraction', errors);

  if (config.auth) {
    if (!config.auth.email && !config.auth.password) {
      errors.push('auth.email and auth.password are both required when auth is provided');
    } else if (config.auth.email && !config.auth.password) {
      errors.push('auth.password is required when auth.email is provided');
    } else if (config.auth.password && !config.auth.email) {
      errors.push('auth.email is required when auth.password is provided');
    }
  }

  return errors;
}

function validateStringArray(value: unknown, fieldName: string, errors: string[]): void {
  if (value === undefined) return;

  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    errors.push(`${fieldName} must be an array of strings`);
  }
}

export function applyDefaults(config: NavMapConfig): ResolvedConfig {
  const hostname = new URL(config.url).hostname;

  const resolved: ResolvedConfig = {
    url: config.url,
    name: config.name ?? hostname,
    maxPages: config.maxPages ?? 50,
    output: config.output ?? 'nav-map.json',
    screenshotDir: config.screenshotDir ?? 'nav-screenshots',
    interactions: config.interactions ?? true,
    maxInteractionsPerPage: config.maxInteractionsPerPage ?? 20,
    includeInteraction: config.includeInteraction ?? [],
    excludeInteraction: config.excludeInteraction ?? [],
  };

  if (config.auth) {
    resolved.auth = {
      ...config.auth,
      loginUrl: config.auth.loginUrl ?? config.url,
      selectors: config.auth.selectors ?? DEFAULT_SELECTORS,
    };
  }

  return resolved;
}

export function loadConfig(configPath?: string): NavMapConfig {
  const filePath = configPath ? path.resolve(configPath) : path.resolve('nav-map.config.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as NavMapConfig;
}
