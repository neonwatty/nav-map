import path from 'node:path';
import fs from 'node:fs';

export interface TraceNavEvent {
  url: string;
  timestamp: number;
}

export interface TraceActionEvent {
  action: 'goto' | 'waitFor' | 'click' | 'fill' | 'end';
  title: string;
  timestamp: number;
  url?: string;
}

export interface TraceScreenshot {
  sha1: string;
  timestamp: number;
}

export interface TraceParseResult {
  navigations: TraceNavEvent[];
  actions: TraceActionEvent[];
  screenshots: TraceScreenshot[];
}

/**
 * Parse a Playwright trace ZIP for navigation events, action events,
 * and screencast-frame entries.
 */
export async function parseTrace(tracePath: string): Promise<TraceParseResult> {
  const navigations: TraceNavEvent[] = [];
  const actions: TraceActionEvent[] = [];
  const screenshots: TraceScreenshot[] = [];

  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(tracePath);

    for (const entry of zip.getEntries()) {
      if (!entry.entryName.endsWith('.trace')) continue;

      const content = entry.getData().toString('utf-8');
      for (const line of content.split('\n').filter(Boolean)) {
        try {
          const event = JSON.parse(line);

          // Navigation: Frame.goto
          if (event.class === 'Frame' && event.method === 'goto' && event.params?.url) {
            const url = event.params.url;
            const ts = event.startTime ?? 0;
            navigations.push({ url, timestamp: ts });
            actions.push({ action: 'goto', title: `Navigate to ${url}`, timestamp: ts, url });
          }

          // Navigate title in test.trace
          if (event.title && /^Navigate to /.test(event.title) && event.params?.url) {
            navigations.push({ url: event.params.url, timestamp: event.startTime ?? 0 });
          }

          // waitFor* events — key moments
          if (event.class === 'Locator' && event.method?.startsWith('waitFor')) {
            actions.push({
              action: 'waitFor',
              title: event.title ?? `waitFor ${event.method}`,
              timestamp: event.startTime ?? 0,
            });
          }
          if (event.class === 'Frame' && event.method === 'waitForSelector') {
            actions.push({
              action: 'waitFor',
              title: event.title ?? 'waitForSelector',
              timestamp: event.startTime ?? 0,
            });
          }

          // Expect/assertion waits (toBeVisible, toHaveURL, etc.)
          if (
            event.method === 'expect' ||
            (event.title && event.title.startsWith('expect.'))
          ) {
            actions.push({
              action: 'waitFor',
              title: event.title ?? `expect ${event.method}`,
              timestamp: event.startTime ?? 0,
            });
          }

          // Click events
          if (event.class === 'Locator' && event.method === 'click') {
            actions.push({
              action: 'click',
              title: event.title ?? 'click',
              timestamp: event.startTime ?? 0,
            });
          }

          // Fill events
          if (event.class === 'Locator' && event.method === 'fill') {
            actions.push({
              action: 'fill',
              title: event.title ?? 'fill',
              timestamp: event.startTime ?? 0,
            });
          }

          // Screencast frames — screenshots correlated by timestamp
          if (event.type === 'screencast-frame' && event.sha1 && event.timestamp) {
            screenshots.push({ sha1: event.sha1, timestamp: event.timestamp });
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  } catch (err) {
    console.warn(`  Warning: Failed to parse trace ${tracePath}: ${err}`);
  }

  actions.sort((a, b) => a.timestamp - b.timestamp);
  screenshots.sort((a, b) => a.timestamp - b.timestamp);

  return { navigations, actions, screenshots };
}

/**
 * For each key action (goto, waitFor, end), find the nearest screenshot
 * taken AFTER that action via screencast-frame timestamp correlation.
 */
export function correlateScreenshots(
  actions: TraceActionEvent[],
  screenshots: TraceScreenshot[]
): Map<number, string> {
  const result = new Map<number, string>();
  if (screenshots.length === 0) return result;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.action !== 'goto' && action.action !== 'waitFor' && action.action !== 'end') {
      continue;
    }

    let best: TraceScreenshot | null = null;
    for (const ss of screenshots) {
      if (ss.timestamp >= action.timestamp) {
        best = ss;
        break;
      }
    }
    if (!best && screenshots.length > 0) {
      best = screenshots[screenshots.length - 1];
    }
    if (best) {
      result.set(i, best.sha1);
    }
  }

  return result;
}

/**
 * Extract a screenshot image from a trace ZIP by sha1 hash.
 */
export async function extractScreenshotBySha1(
  tracePath: string,
  sha1: string,
  outputDir: string,
  filename: string
): Promise<string | null> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(tracePath);

    for (const entry of zip.getEntries()) {
      if (entry.entryName.includes(sha1)) {
        const ext = entry.entryName.endsWith('.jpeg') ? '.jpeg' : '.png';
        const outPath = path.join(outputDir, `${filename}${ext}`);
        fs.writeFileSync(outPath, entry.getData());
        return outPath;
      }
    }
  } catch (err) {
    console.warn(`  Warning: Could not extract screenshot ${sha1}: ${err}`);
  }
  return null;
}
