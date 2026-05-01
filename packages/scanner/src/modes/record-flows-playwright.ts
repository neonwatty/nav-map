import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface PlaywrightRunOptions {
  flowsDirAbs: string;
  screenshotDirAbs: string;
  baseUrl: string;
  storageState?: string;
  cwd: string;
  failOnTestErrors?: boolean;
}

export async function createRecordFlowsConfig(options: PlaywrightRunOptions): Promise<string> {
  const { flowsDirAbs, screenshotDirAbs, baseUrl, storageState, cwd } = options;
  const reporterPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'reporter.js');
  const tempConfig = path.join(cwd, '_temp-navmap-playwright.config.ts');
  const storageLine = storageState
    ? `storageState: '${path.resolve(storageState).replace(/\\/g, '/')}',`
    : '';

  const configContent = `
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '${flowsDirAbs.replace(/\\/g, '/')}',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['${reporterPath.replace(/\\/g, '/')}', { outputDir: '${screenshotDirAbs.replace(/\\/g, '/')}' }]],
  timeout: 120_000,
  use: {
    baseURL: '${baseUrl}',
    ${storageLine}
    trace: 'on',
    screenshot: 'on',
  },
});
`;

  fs.writeFileSync(tempConfig, configContent);
  return tempConfig;
}

export async function runRecordFlowsTests(options: PlaywrightRunOptions): Promise<void> {
  const tempConfig = await createRecordFlowsConfig(options);

  try {
    execFileSync('npx', ['playwright', 'test', '--config', tempConfig], {
      stdio: 'inherit',
      cwd: options.cwd,
      timeout: 10 * 60 * 1000,
      killSignal: 'SIGTERM',
    });
  } catch {
    if (options.failOnTestErrors) {
      cleanupTempConfig(tempConfig);
      throw new Error('Tests failed and --fail-on-test-errors is set');
    }
    console.warn('\nSome tests failed — continuing with available traces.\n');
  } finally {
    cleanupTempConfig(tempConfig);
  }
}

function cleanupTempConfig(tempConfig: string): void {
  try {
    fs.unlinkSync(tempConfig);
  } catch {
    // ignore
  }
}
