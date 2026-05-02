import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGroups } from '../modes/record-groups.js';
import { aggregateTraceNavigations } from '../modes/record-trace-aggregation.js';
import { assignScreenshotsToPages } from '../modes/record-screenshots.js';
import { extractScreenshotBySha1, parseTrace } from '../modes/trace-parser.js';
import type { PageRecord } from '../modes/dedup.js';

vi.mock('../modes/trace-parser.js', () => ({
  parseTrace: vi.fn(),
  extractScreenshotBySha1: vi.fn(),
}));

const parseTraceMock = vi.mocked(parseTrace);
const extractScreenshotBySha1Mock = vi.mocked(extractScreenshotBySha1);

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-record-helpers-'));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function writeTrace(name: string): string {
  const tracePath = path.join(tempDir, name);
  fs.writeFileSync(tracePath, '');
  return tracePath;
}

describe('record mode helpers', () => {
  it('aggregates trace navigations into pages, edges, flows, and base URL', async () => {
    const tracePath = writeTrace('flow.zip');
    parseTraceMock.mockResolvedValue({
      navigations: [
        { url: 'https://example.com/', timestamp: 1 },
        { url: 'https://example.com/docs', timestamp: 2 },
        { url: 'https://example.com/docs', timestamp: 3 },
        { url: 'https://example.com/settings?tab=billing', timestamp: 4 },
        { url: 'https://example.com/login', timestamp: 5 },
      ],
      actions: [],
      screenshots: [],
    });

    const result = await aggregateTraceNavigations([
      {
        testName: 'happy path',
        testFile: 'flow.spec.ts',
        workerId: 0,
        tracePath,
        status: 'passed',
      },
    ]);

    expect(result.baseUrl).toBe('https://example.com');
    expect([...result.pages.keys()]).toEqual(['home', 'docs', 'settings']);
    expect([...result.edgeSet.values()]).toEqual([
      { source: 'home', target: 'docs', visitCount: 1 },
      { source: 'docs', target: 'settings', visitCount: 1 },
    ]);
    expect(result.flows).toEqual([{ name: 'happy path', steps: ['home', 'docs', 'settings'] }]);
  });

  it('skips missing traces during aggregation', async () => {
    const result = await aggregateTraceNavigations([
      {
        testName: 'missing',
        testFile: 'missing.spec.ts',
        workerId: 0,
        tracePath: path.join(tempDir, 'missing.zip'),
        status: 'failed',
      },
    ]);

    expect(parseTraceMock).not.toHaveBeenCalled();
    expect(result.pages.size).toBe(0);
    expect(result.edgeSet.size).toBe(0);
    expect(result.flows).toEqual([]);
  });

  it('assigns the last screenshot to the first page without a screenshot', async () => {
    const tracePath = writeTrace('screenshots.zip');
    const extractedPath = path.join(tempDir, 'settings.png');
    const pages = new Map<string, PageRecord>([
      ['index', { id: 'index', route: '/', label: 'Home', group: 'root', screenshot: 'home.png' }],
      ['settings', { id: 'settings', route: '/settings', label: 'Settings', group: 'settings' }],
    ]);

    parseTraceMock.mockResolvedValue({
      navigations: [],
      actions: [],
      screenshots: [
        { sha1: 'early', timestamp: 1 },
        { sha1: 'latest', timestamp: 2 },
      ],
    });
    extractScreenshotBySha1Mock.mockResolvedValue(extractedPath);

    await assignScreenshotsToPages(
      [
        {
          testName: 'screenshots',
          testFile: 'screenshots.spec.ts',
          workerId: 0,
          tracePath,
          status: 'passed',
        },
      ],
      pages,
      tempDir
    );

    expect(extractScreenshotBySha1Mock).toHaveBeenCalledWith(
      tracePath,
      'latest',
      tempDir,
      'settings'
    );
    expect(pages.get('settings')?.screenshot).toBe(path.relative(process.cwd(), extractedPath));
  });

  it('builds stable colored groups from page records', () => {
    expect(
      buildGroups([
        { id: 'index', route: '/', label: 'Home', group: 'root' },
        { id: 'settings', route: '/settings', label: 'Settings', group: 'settings' },
        { id: 'settings-billing', route: '/settings/billing', label: 'Billing', group: 'settings' },
      ])
    ).toEqual([
      { id: 'root', label: 'Root', color: '#5b9bf5', routePrefix: '/' },
      { id: 'settings', label: 'Settings', color: '#4eca6a', routePrefix: '/settings' },
    ]);
  });
});
