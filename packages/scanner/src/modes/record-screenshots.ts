import fs from 'node:fs';
import path from 'node:path';
import type { PageRecord } from './dedup.js';
import type { TraceEntry } from './record-types.js';
import { extractScreenshotBySha1, parseTrace } from './trace-parser.js';

export async function assignScreenshotsToPages(
  traces: TraceEntry[],
  pages: Map<string, PageRecord>,
  screenshotDirAbs: string
): Promise<void> {
  console.log('Extracting screenshots from traces...');
  for (const trace of traces) {
    if (!fs.existsSync(trace.tracePath)) continue;
    const { screenshots: traceScreenshots } = await parseTrace(trace.tracePath);
    if (traceScreenshots.length > 0) {
      const lastSs = traceScreenshots[traceScreenshots.length - 1];
      for (const page of pages.values()) {
        if (!page.screenshot) {
          const extracted = await extractScreenshotBySha1(
            trace.tracePath,
            lastSs.sha1,
            screenshotDirAbs,
            page.id
          );
          if (extracted) {
            page.screenshot = path.relative(process.cwd(), extracted);
          }
          break;
        }
      }
    }
  }
}
