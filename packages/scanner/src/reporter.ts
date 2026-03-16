import fs from 'node:fs';
import path from 'node:path';

interface TraceEntry {
  testName: string;
  testFile: string;
  workerId: number;
  tracePath: string;
  status: string;
}

interface NavManifest {
  traces: TraceEntry[];
}

/**
 * Custom Playwright reporter that collects trace file paths.
 *
 * Usage in playwright config:
 *   reporter: [['@neonwatty/nav-map-scanner/dist/reporter.js', { outputDir: 'nav-screenshots' }]]
 */
class NavMapReporter {
  private traces: TraceEntry[] = [];
  private outputDir: string;

  constructor(options?: { outputDir?: string }) {
    this.outputDir = options?.outputDir ?? process.env.NAV_MAP_SCREENSHOT_DIR ?? 'nav-screenshots';
  }

  onTestEnd(
    test: { title: string; location: { file: string } },
    result: {
      status: string;
      workerIndex: number;
      attachments: { name: string; path?: string }[];
    }
  ) {
    const traceAttachment = result.attachments.find(a => a.name === 'trace');
    if (traceAttachment?.path) {
      this.traces.push({
        testName: test.title,
        testFile: test.location.file,
        workerId: result.workerIndex,
        tracePath: traceAttachment.path,
        status: result.status,
      });
    }
  }

  onEnd() {
    fs.mkdirSync(this.outputDir, { recursive: true });
    const manifestPath = path.join(this.outputDir, '.nav-manifest.json');
    const manifest: NavManifest = { traces: this.traces };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nNav-map reporter: wrote manifest with ${this.traces.length} traces to ${manifestPath}`);
  }
}

export default NavMapReporter;
