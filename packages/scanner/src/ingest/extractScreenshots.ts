import type { TraceScreenshot } from './parseTrace.js';

export function selectScreenshotForRoute(
  navigationTimestamp: number,
  screenshots: TraceScreenshot[],
  windowMs = 2000
): TraceScreenshot | null {
  const afterNav = screenshots.filter(
    s => s.timestamp > navigationTimestamp && s.timestamp <= navigationTimestamp + windowMs
  );

  if (afterNav.length > 0) {
    afterNav.sort((a, b) => a.timestamp - b.timestamp);
    return afterNav[0];
  }

  const beforeNav = screenshots.filter(
    s => s.timestamp <= navigationTimestamp && s.timestamp >= navigationTimestamp - windowMs
  );

  if (beforeNav.length > 0) {
    beforeNav.sort((a, b) => b.timestamp - a.timestamp);
    return beforeNav[0];
  }

  return null;
}
