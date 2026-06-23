import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  evaluateProbeNode,
  resolveRouteTemplate,
  runProbe,
  type ProbeManifest,
} from '../modes/probe.js';

const mocks = vi.hoisted(() => ({
  launchMock: vi.fn(),
  contextCloseMock: vi.fn(),
  browserCloseMock: vi.fn(),
  newContextMock: vi.fn(),
  newPageMock: vi.fn(),
  screenshotMock: vi.fn(),
  gotoMock: vi.fn(),
  pageOnMock: vi.fn(),
  textVisibleMock: vi.fn(),
  textWaitForMock: vi.fn(),
  selectorVisibleMock: vi.fn(),
  selectorWaitForMock: vi.fn(),
  bodyInnerTextMock: vi.fn(),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: mocks.launchMock,
  },
}));

describe('probe helpers', () => {
  beforeEach(() => {
    mocks.launchMock.mockReset();
    mocks.contextCloseMock.mockReset();
    mocks.browserCloseMock.mockReset();
    mocks.newContextMock.mockReset();
    mocks.newPageMock.mockReset();
    mocks.screenshotMock.mockReset();
    mocks.gotoMock.mockReset();
    mocks.pageOnMock.mockReset();
    mocks.textVisibleMock.mockReset();
    mocks.textWaitForMock.mockReset();
    mocks.selectorVisibleMock.mockReset();
    mocks.selectorWaitForMock.mockReset();
    mocks.bodyInnerTextMock.mockReset();

    mocks.textVisibleMock.mockResolvedValue(true);
    mocks.textWaitForMock.mockResolvedValue(undefined);
    mocks.selectorVisibleMock.mockResolvedValue(true);
    mocks.selectorWaitForMock.mockResolvedValue(undefined);
    mocks.bodyInnerTextMock.mockResolvedValue(
      'My Events Nav Map Speaker Workflow Fixture Upload Deck Scan Results'
    );
    mocks.gotoMock.mockResolvedValue({ status: () => 200 });
    mocks.newPageMock.mockResolvedValue({
      goto: mocks.gotoMock,
      url: () => 'http://localhost:3000/my/events/e1/upload',
      getByText: () => ({
        first: () => ({ isVisible: mocks.textVisibleMock, waitFor: mocks.textWaitForMock }),
      }),
      locator: (selector: string) =>
        selector === 'body'
          ? {
              innerText: mocks.bodyInnerTextMock,
              first: () => ({
                isVisible: mocks.selectorVisibleMock,
                waitFor: mocks.selectorWaitForMock,
              }),
            }
          : {
              first: () => ({
                isVisible: mocks.selectorVisibleMock,
                waitFor: mocks.selectorWaitForMock,
              }),
            },
      screenshot: mocks.screenshotMock,
      on: mocks.pageOnMock,
    });
    mocks.newContextMock.mockResolvedValue({
      newPage: mocks.newPageMock,
      close: mocks.contextCloseMock,
    });
    mocks.launchMock.mockResolvedValue({
      newContext: mocks.newContextMock,
      close: mocks.browserCloseMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves route templates from manifest variables', () => {
    expect(resolveRouteTemplate('/my/events/[eventId]/upload', { eventId: 'e1' })).toBe(
      '/my/events/e1/upload'
    );
  });

  it('throws a clear error for missing route variables', () => {
    expect(() => resolveRouteTemplate('/my/events/[eventId]/upload', {})).toThrow(
      'Missing route variable: eventId'
    );
  });

  it('marks route observations as pass when expectations match', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        expected: {
          status: 200,
          text: ['My Events'],
          selectors: ['main'],
          finalUrl: '/my/events',
        },
        observed: {
          status: 200,
          finalUrl: 'http://localhost:3000/my/events',
          matchedText: ['My Events'],
          matchedSelectors: ['main'],
          consoleErrors: [],
          failedRequests: [],
        },
      }).status
    ).toBe('pass');
  });

  it('marks route observations as fail when a required expectation is missing', () => {
    const result = evaluateProbeNode({
      nodeId: 'speaker-events',
      expected: { text: ['My Events'] },
      observed: {
        finalUrl: 'http://localhost:3000/my/events',
        matchedText: [],
        matchedSelectors: [],
        consoleErrors: [],
        failedRequests: [],
      },
    });

    expect(result.status).toBe('fail');
    expect(result.reason).toContain('Missing expected text');
  });

  it('evaluates signed-out redirect expectations against the final URL', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        expected: { signedOutRedirect: '/sign-in?next=/my/events' },
        observed: {
          finalUrl: 'http://localhost:3000/sign-in?next=/my/events',
          matchedText: [],
          matchedSelectors: [],
          consoleErrors: [],
          failedRequests: [],
        },
      }).status
    ).toBe('pass');

    const result = evaluateProbeNode({
      nodeId: 'speaker-events',
      expected: { signedOutRedirect: '/sign-in?next=/my/events' },
      observed: {
        finalUrl: 'http://localhost:3000/my/events',
        matchedText: [],
        matchedSelectors: [],
        consoleErrors: [],
        failedRequests: [],
      },
    });

    expect(result.status).toBe('fail');
    expect(result.reason).toContain('Expected signed-out redirect');
  });

  it('matches signed-out redirects with encoded query values', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        authStateKind: 'anonymous',
        expected: { signedOutRedirect: '/sign-in?next=/my/events' },
        observed: {
          finalUrl: 'http://localhost:3000/sign-in?next=%2Fmy%2Fevents',
          matchedText: [],
          matchedSelectors: [],
          consoleErrors: [],
          failedRequests: [],
        },
      }).status
    ).toBe('pass');
  });

  it('ignores signed-out redirect expectations for authenticated probes', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        authStateKind: 'storage-state',
        expected: {
          signedOutRedirect: '/sign-in?next=/my/events',
          status: 200,
          text: ['My Events'],
          selectors: ['main'],
        },
        observed: {
          status: 200,
          finalUrl: 'http://localhost:3000/my/events',
          matchedText: ['My Events'],
          matchedSelectors: ['main'],
          consoleErrors: [],
          failedRequests: [],
        },
      }).status
    ).toBe('pass');
  });

  it('uses signed-out redirect as the expectation contract for anonymous probes', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        authStateKind: 'anonymous',
        expected: {
          signedOutRedirect: '/sign-in?next=/my/events',
          status: 200,
          text: ['My Events'],
          selectors: ['main'],
        },
        observed: {
          status: 200,
          finalUrl: 'http://localhost:3000/sign-in?next=/my/events',
          matchedText: [],
          matchedSelectors: ['main'],
          consoleErrors: [],
          failedRequests: [],
        },
      }).status
    ).toBe('pass');
  });

  it('warns for console errors when expectations otherwise match', () => {
    const result = evaluateProbeNode({
      nodeId: 'speaker-events',
      expected: { status: 200 },
      observed: {
        status: 200,
        finalUrl: 'http://localhost:3000/my/events',
        matchedText: [],
        matchedSelectors: [],
        consoleErrors: ['Error: token=secret-value'],
        failedRequests: [],
      },
    });

    expect(result.status).toBe('warn');
    expect(result.reason).toContain('Console errors observed');
  });

  it('warns for failed requests when expectations otherwise match', () => {
    const result = evaluateProbeNode({
      nodeId: 'speaker-events',
      expected: { status: 200 },
      observed: {
        status: 200,
        finalUrl: 'http://localhost:3000/my/events',
        matchedText: [],
        matchedSelectors: [],
        consoleErrors: [],
        failedRequests: ['GET /api/error 500'],
      },
    });

    expect(result.status).toBe('warn');
    expect(result.reason).toContain('Failed network requests observed');
  });

  it('marks routes without expectations as unchecked', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        observed: {
          finalUrl: 'http://localhost:3000/my/events',
          matchedText: [],
          matchedSelectors: [],
          consoleErrors: [],
          failedRequests: [],
        },
      }).status
    ).toBe('unchecked');
  });

  it('marks routes with empty expectations as unchecked', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        expected: {},
        observed: {
          finalUrl: 'http://localhost:3000/my/events',
          matchedText: [],
          matchedSelectors: [],
          consoleErrors: ['Error: token=secret-value'],
          failedRequests: [],
        },
      }).status
    ).toBe('unchecked');
  });

  it('runs selected flow nodes with generated ids, auth storage state, screenshots, and a safe receipt', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-probe-'));
    const storageStatePath = path.join(tempDir, 'speaker.storage.json');
    fs.writeFileSync(storageStatePath, JSON.stringify({ cookies: [], origins: [] }));
    const outputPath = path.join(tempDir, 'receipt.json');
    const screenshotsDir = path.join(tempDir, 'screenshots');
    const manifest: ProbeManifest = {
      version: 'workflow-atlas/1.0',
      name: 'Deckchecker Speaker',
      authStates: [
        {
          id: 'speaker',
          kind: 'storage-state',
          storageStatePath,
        },
      ],
      routeVariables: { eventId: 'e1' },
      nodes: [
        {
          route: '/my/events/[eventId]/upload',
          label: 'Upload',
          expectations: { status: 200, text: ['Upload'], selectors: ['main'] },
        },
        {
          id: 'speaker-results',
          route: '/my/events/[eventId]/results',
          label: 'Results',
        },
      ],
      flows: [
        {
          name: 'Speaker deck workflow',
          steps: ['my-events-eventid-upload'],
        },
      ],
    };

    const run = await runProbe({
      manifest,
      baseUrl: 'http://localhost:3000',
      authState: 'speaker',
      flow: 'Speaker deck workflow',
      outputPath,
      screenshotsDir,
    });

    expect(run.results).toHaveLength(1);
    expect(run).toMatchObject({
      command: expect.stringContaining('nav-map probe <manifest>'),
      selection: {
        flow: 'Speaker deck workflow',
        nodeIds: ['my-events-eventid-upload'],
        routeVariableKeys: ['eventId'],
      },
      screenshotSummary: {
        screenshotDir: screenshotsDir,
        captured: 1,
        capturedNodeIds: ['my-events-eventid-upload'],
      },
      warnings: [],
    });
    expect(run.results[0]).toMatchObject({
      nodeId: 'my-events-eventid-upload',
      route: '/my/events/[eventId]/upload',
      concreteRoute: '/my/events/e1/upload',
      status: 'pass',
    });
    expect(mocks.gotoMock).toHaveBeenCalledWith('http://localhost:3000/my/events/e1/upload', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    expect(mocks.textWaitForMock).toHaveBeenCalledWith({
      state: 'visible',
      timeout: 10_000,
    });
    expect(mocks.selectorWaitForMock).toHaveBeenCalledWith({
      state: 'visible',
      timeout: 10_000,
    });
    expect(mocks.newContextMock).toHaveBeenCalledWith({
      storageState: path.resolve(storageStatePath),
    });
    expect(mocks.screenshotMock).toHaveBeenCalledWith({
      path: path.join(screenshotsDir, 'my-events-eventid-upload.png'),
      fullPage: false,
    });
    expect(mocks.contextCloseMock).toHaveBeenCalledOnce();
    expect(mocks.browserCloseMock).toHaveBeenCalledOnce();

    const receipt = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(receipt.nextActions[0].command).toContain('nav-map diff <manifest>');
    expect(receipt.results[0].screenshot).toBe(
      path.join(screenshotsDir, 'my-events-eventid-upload.png')
    );
    expect(receipt.results[0].checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'status', status: 'pass' }),
        expect.objectContaining({ name: 'text', status: 'pass', expected: 'Upload' }),
        expect.objectContaining({ name: 'selector', status: 'pass', expected: 'main' }),
      ])
    );
    expect(receipt.results[0].observed).toMatchObject({
      status: 200,
      finalUrl: 'http://localhost:3000/my/events/e1/upload',
    });
    expect(JSON.stringify(receipt)).not.toContain(storageStatePath);
    expect(JSON.stringify(receipt)).not.toMatch(/token=secret-value|cookie|localStorage/i);
  });

  it('writes a failed receipt when route navigation fails before rendering', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-probe-'));
    const outputPath = path.join(tempDir, 'receipt.json');
    const screenshotsDir = path.join(tempDir, 'screenshots');
    mocks.gotoMock.mockRejectedValueOnce(new Error('net::ERR_UNSAFE_PORT'));

    const run = await runProbe({
      manifest: {
        version: 'workflow-atlas/1.0',
        name: 'Golden Agent Workflow',
        nodes: [
          {
            id: 'home',
            route: '/',
            label: 'Home',
            expectations: { status: 200, text: ['Home'] },
          },
        ],
      },
      baseUrl: 'http://127.0.0.1:9',
      outputPath,
      screenshotsDir,
      contract: true,
    });

    expect(run.results).toHaveLength(1);
    expect(run.results[0]).toMatchObject({
      nodeId: 'home',
      status: 'fail',
      reason: expect.stringContaining('Navigation failed'),
      checks: [expect.objectContaining({ name: 'navigation', status: 'fail' })],
    });
    expect(mocks.screenshotMock).not.toHaveBeenCalled();
    expect(mocks.contextCloseMock).toHaveBeenCalledOnce();
    expect(mocks.browserCloseMock).toHaveBeenCalledOnce();

    const receipt = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(receipt).toMatchObject({
      kind: 'probe-run',
      summary: {
        app: 'Golden Agent Workflow',
        total: 1,
        fail: 1,
      },
    });
    expect(JSON.stringify(receipt)).toContain('net::ERR_UNSAFE_PORT');
  });

  it('writes a safe failed receipt when auth-state storage is not usable', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-probe-'));
    const outputPath = path.join(tempDir, 'receipt.json');
    const screenshotsDir = path.join(tempDir, 'screenshots');

    const run = await runProbe({
      manifest: {
        version: 'workflow-atlas/1.0',
        name: 'Deckchecker Speaker',
        authStates: [
          {
            id: 'speaker',
            kind: 'storage-state',
            storageStatePath: path.join(tempDir, 'missing.storage.json'),
          },
        ],
        nodes: [
          {
            id: 'speaker-events',
            route: '/my/events',
            label: 'Events',
            expectations: { status: 200, text: ['My Events'] },
          },
        ],
      },
      baseUrl: 'http://localhost:3000',
      authState: 'speaker',
      outputPath,
      screenshotsDir,
      contract: true,
    });

    expect(run.authStateStatus).toMatchObject({
      authState: 'speaker',
      reasonCode: 'missing-storage-state-file',
    });
    expect(run.results[0]).toMatchObject({
      nodeId: 'speaker-events',
      status: 'fail',
      checks: [expect.objectContaining({ name: 'authState', status: 'fail' })],
    });
    expect(mocks.launchMock).not.toHaveBeenCalled();

    const receipt = fs.readFileSync(outputPath, 'utf-8');
    expect(receipt).toContain('missing-storage-state-file');
    expect(receipt).not.toContain('missing.storage.json');
  });

  it('writes a versioned probe contract envelope when requested', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-probe-'));
    const outputPath = path.join(tempDir, 'contract.json');
    const screenshotsDir = path.join(tempDir, 'screenshots');

    await runProbe({
      manifest: {
        version: 'workflow-atlas/1.0',
        name: 'Deckchecker Speaker',
        nodes: [
          {
            id: 'speaker-events',
            route: '/my/events',
            label: 'Events',
            expectations: { status: 200, text: ['My Events'], selectors: ['main'] },
          },
        ],
      },
      baseUrl: 'http://localhost:3000',
      outputPath,
      screenshotsDir,
      contract: true,
    });

    const receipt = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(receipt).toMatchObject({
      schemaVersion: 'nav-map-agent-contract/v1',
      kind: 'probe-run',
      summary: {
        app: 'Deckchecker Speaker',
        total: 1,
        pass: 1,
        fail: 0,
      },
    });
    expect(receipt.data.results[0].checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'status', status: 'pass' })])
    );
    expect(receipt.data).toMatchObject({
      command: expect.stringContaining('nav-map probe <manifest>'),
      selection: { nodeIds: ['speaker-events'] },
      screenshotSummary: {
        captured: 1,
        capturedNodeIds: ['speaker-events'],
      },
    });
    expect(receipt.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'probe-receipt', path: outputPath }),
        expect.objectContaining({ kind: 'screenshot' }),
      ])
    );
    expect(receipt.nextActions[0].command).toContain('nav-map diff <manifest>');
  });

  it('redacts colon, JSON, and basic-auth secret shapes in probe receipts', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-probe-'));
    const outputPath = path.join(tempDir, 'receipt.json');
    const screenshotsDir = path.join(tempDir, 'screenshots');
    const handlers: Record<string, (payload: unknown) => void> = {};

    mocks.pageOnMock.mockImplementation((event: string, handler: (payload: unknown) => void) => {
      handlers[event] = handler;
    });
    mocks.gotoMock.mockImplementation(async () => {
      handlers.console?.({
        type: () => 'error',
        text: () => 'token: secret-value {"access_token":"secret"} Authorization: Basic abc123',
      });
      handlers.requestfailed?.({
        method: () => 'GET',
        url: () => 'http://localhost:3000/api?refresh_token: secret',
        failure: () => ({ errorText: 'Authorization: Basic abc123' }),
      });
      return { status: () => 200 };
    });

    await runProbe({
      manifest: {
        version: 'workflow-atlas/1.0',
        name: 'Deckchecker Speaker',
        nodes: [
          {
            id: 'speaker-events',
            route: '/my/events',
            label: 'Events',
            expectations: { status: 200 },
          },
        ],
      },
      baseUrl: 'http://localhost:3000',
      outputPath,
      screenshotsDir,
    });

    const receipt = fs.readFileSync(outputPath, 'utf-8');
    expect(receipt).not.toMatch(
      /secret-value|access_token":"secret|refresh_token: secret|Basic abc123/i
    );
  });

  it('runs explicit node ids over flow selection and all nodes when no selection is provided', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-probe-'));
    const manifest: ProbeManifest = {
      version: 'workflow-atlas/1.0',
      name: 'Deckchecker Speaker',
      nodes: [
        { id: 'speaker-events', route: '/my/events', label: 'Events' },
        { id: 'speaker-results', route: '/my/events/e1/results', label: 'Results' },
      ],
      flows: [{ name: 'Speaker deck workflow', steps: ['speaker-events'] }],
    };

    const explicitRun = await runProbe({
      manifest,
      baseUrl: 'http://localhost:3000',
      flow: 'Speaker deck workflow',
      nodes: ['speaker-results'],
      outputPath: path.join(tempDir, 'explicit.json'),
      screenshotsDir: path.join(tempDir, 'explicit-screenshots'),
    });
    const allRun = await runProbe({
      manifest,
      baseUrl: 'http://localhost:3000',
      outputPath: path.join(tempDir, 'all.json'),
      screenshotsDir: path.join(tempDir, 'all-screenshots'),
    });

    expect(explicitRun.results.map(result => result.nodeId)).toEqual(['speaker-results']);
    expect(allRun.results.map(result => result.nodeId)).toEqual([
      'speaker-events',
      'speaker-results',
    ]);
  });
});
