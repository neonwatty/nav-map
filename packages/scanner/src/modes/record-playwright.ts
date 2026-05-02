import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { RecordOptions, TraceEntry } from './record-types.js';

export function runPlaywrightAndLoadManifest(
  options: Pick<RecordOptions, 'playwrightConfig'>,
  screenshotDirAbs: string
): TraceEntry[] {
  const reporterPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'reporter.js');
  const configPath = path.resolve(options.playwrightConfig);
  const args = ['playwright', 'test', '--config', configPath, `--reporter=${reporterPath}`];

  console.log(`Running: npx ${args.join(' ')}`);
  console.log(`Screenshot dir: ${screenshotDirAbs}\n`);

  const env = {
    ...process.env,
    NAV_MAP_SCREENSHOT_DIR: screenshotDirAbs,
  };

  try {
    execFileSync('npx', args, {
      stdio: 'inherit',
      env,
      cwd: path.dirname(configPath),
      timeout: 10 * 60 * 1000,
    });
  } catch {
    console.warn('\nSome tests failed — continuing with available traces.\n');
  }

  const manifestPath = path.join(screenshotDirAbs, '.nav-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Reporter manifest not found at ${manifestPath}. Ensure trace: 'on' is set in your Playwright config.`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return manifest.traces;
}
