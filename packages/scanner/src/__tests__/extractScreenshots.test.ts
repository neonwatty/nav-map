import { describe, it, expect } from 'vitest';
import { selectScreenshotForRoute } from '../ingest/extractScreenshots.js';
import type { TraceScreenshot } from '../ingest/parseTrace.js';

describe('selectScreenshotForRoute', () => {
  const screenshots: TraceScreenshot[] = [
    { sha1: 'frame-1000.jpeg', timestamp: 1000, width: 1280, height: 800 },
    { sha1: 'frame-1600.jpeg', timestamp: 1600, width: 1280, height: 800 },
    { sha1: 'frame-5000.jpeg', timestamp: 5000, width: 1280, height: 800 },
    { sha1: 'frame-5600.jpeg', timestamp: 5600, width: 1280, height: 800 },
    { sha1: 'frame-9600.jpeg', timestamp: 9600, width: 1280, height: 800 },
  ];

  it('selects the closest screenshot after a navigation timestamp', () => {
    const result = selectScreenshotForRoute(1000, screenshots);
    expect(result?.sha1).toBe('frame-1600.jpeg');
  });

  it('selects within a time window (default 2000ms)', () => {
    const result = selectScreenshotForRoute(1000, screenshots, 500);
    expect(result?.sha1).toBe('frame-1000.jpeg');
  });

  it('returns null if no screenshot within window', () => {
    const result = selectScreenshotForRoute(20000, screenshots);
    expect(result).toBeNull();
  });

  it('prefers screenshots after the navigation over before', () => {
    const result = selectScreenshotForRoute(5000, screenshots);
    expect(result?.sha1).toBe('frame-5600.jpeg');
  });
});
