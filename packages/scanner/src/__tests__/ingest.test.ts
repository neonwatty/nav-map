import { describe, it, expect } from 'vitest';
import { runIngest } from '../modes/ingest.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('runIngest', () => {
  it('throws when no report JSON found in directory', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-ingest-'));
    try {
      await expect(
        runIngest({ reportDir: tmpDir, output: path.join(tmpDir, 'out') })
      ).rejects.toThrow('No Playwright JSON report found');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws with context when report JSON is malformed', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-ingest-'));
    fs.writeFileSync(path.join(tmpDir, 'report.json'), '{invalid json!!!');
    try {
      await expect(
        runIngest({ reportDir: tmpDir, output: path.join(tmpDir, 'out') })
      ).rejects.toThrow('Failed to parse Playwright report');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('produces empty graph when report has no test runs', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-ingest-'));
    const outputDir = path.join(tmpDir, 'out');
    fs.writeFileSync(path.join(tmpDir, 'report.json'), JSON.stringify({ suites: [] }));
    try {
      const result = await runIngest({ reportDir: tmpDir, output: outputDir });
      expect(result.testCount).toBe(0);
      expect(result.routesCovered).toBe(0);
      // Verify output file was written
      expect(fs.existsSync(result.outputPath)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
