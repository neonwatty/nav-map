import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runWorkflowInspectManifest, runWorkflowManifest } from '../modes/workflow.js';

const mocks = vi.hoisted(() => ({
  captureScreenshotsMock: vi.fn(),
}));

vi.mock('../screenshots/capture.js', () => ({
  captureScreenshots: mocks.captureScreenshotsMock,
}));

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-workflow-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  vi.clearAllMocks();
});

describe('runWorkflowManifest', () => {
  beforeEach(() => {
    mocks.captureScreenshotsMock.mockResolvedValue(new Map());
  });

  it('writes graph JSON from a workflow manifest without screenshots', async () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'workflow.json');
    const outputPath = path.join(dir, 'public', 'prcard.nav-map.json');

    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Fixture Workflow',
        generatedAt: '2026-06-13T00:00:00.000Z',
        nodes: [
          {
            id: 'home',
            route: '/home',
            label: 'Home',
            section: 'public',
            purpose: 'Introduce the app.',
          },
          {
            id: 'creator',
            route: '/creator',
            label: 'Creator',
            section: 'studio',
            authRequirement: 'signed-in',
          },
        ],
        edges: [{ source: 'home', target: 'creator', action: 'Start creating' }],
      })
    );

    const result = await runWorkflowManifest(manifestPath, {
      output: outputPath,
      screenshots: false,
    });

    expect(result).toMatchObject({
      outputPath,
      nodeCount: 2,
      edgeCount: 1,
      groupCount: 2,
      screenshotCount: 0,
    });

    const graph = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(graph.nodes[0].metadata.purpose).toBe('Introduce the app.');
    expect(graph.nodes[1].metadata.authRequired).toBe(true);
    expect(graph.edges[0].label).toBe('Start creating');
    expect(mocks.captureScreenshotsMock).not.toHaveBeenCalled();
  });

  it('captures screenshots with auth state and resolved route variables', async () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'workflow.json');
    const outputPath = path.join(dir, 'public', 'deckchecker.nav-map.json');
    const screenshotPath = path.join(dir, 'screenshots', 'speaker-upload.webp');

    mocks.captureScreenshotsMock.mockResolvedValue(new Map([['speaker-upload', screenshotPath]]));
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Deckchecker Speaker',
        generatedAt: '2026-06-13T00:00:00.000Z',
        routeVariables: { eventId: 'event-1', sessionId: 'session-1' },
        authStates: [
          {
            id: 'speaker',
            kind: 'storage-state',
            storageStatePath: '.nav-map/auth/speaker.storage.json',
          },
        ],
        nodes: [
          {
            id: 'speaker-upload',
            route: '/my/events/[eventId]/upload?session=[sessionId]',
            label: 'Upload',
            section: 'speaker',
            authRequirement: 'speaker',
          },
        ],
      })
    );

    const result = await runWorkflowManifest(manifestPath, {
      output: outputPath,
      baseUrl: 'https://deckchecker.app',
      screenshotDir: path.join(dir, 'screenshots'),
      authState: 'speaker',
    });

    expect(result.screenshotCount).toBe(1);
    expect(result.receipt).toMatchObject({
      command: expect.stringContaining('nav-map workflow'),
      authStateId: 'speaker',
      routeVariablesApplied: ['eventId', 'sessionId'],
      screenshotCapture: {
        requested: true,
        routeCount: 1,
        capturedNodeIds: ['speaker-upload'],
        skippedSurfaceIds: [],
      },
      warnings: [],
    });
    expect(result.receipt.nextActions[0].command).toContain('nav-map context');
    expect(result.receipt.nextActions[1].command).toContain('--auth-state speaker');
    expect(JSON.stringify(result.receipt)).not.toContain('speaker.storage.json');
    expect(JSON.stringify(result.receipt)).not.toContain('.nav-map/auth');
    expect(mocks.captureScreenshotsMock).toHaveBeenCalledWith(
      [
        {
          id: 'speaker-upload',
          route: '/my/events/event-1/upload?session=session-1',
        },
      ],
      'https://deckchecker.app',
      path.join(dir, 'screenshots'),
      { storageState: path.resolve('.nav-map/auth/speaker.storage.json') }
    );

    const graph = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(graph.nodes[0].screenshot).toBe('../screenshots/speaker-upload.webp');
  });

  it('keeps prototype surfaces in workflow output but only captures screenshots for route nodes', async () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'workflow.json');
    const outputPath = path.join(dir, 'public', 'prototype.nav-map.json');
    const screenshotPath = path.join(dir, 'screenshots', 'dashboard.webp');

    mocks.captureScreenshotsMock.mockResolvedValue(new Map([['dashboard', screenshotPath]]));
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Prototype Surfaces',
        generatedAt: '2026-06-13T00:00:00.000Z',
        nodes: [{ id: 'dashboard', route: '/dashboard', label: 'Dashboard', section: 'live' }],
        surfaces: [
          {
            id: 'dashboard-concept',
            label: 'Dashboard Concept',
            type: 'generated-image',
            section: 'prototype',
            screenshot: 'screenshots/prototypes/dashboard-concept.png',
          },
        ],
        edges: [{ source: 'dashboard-concept', target: 'dashboard', action: 'Implemented by' }],
        flows: [{ name: 'Prototype to route', steps: ['dashboard-concept', 'dashboard'] }],
      })
    );

    const result = await runWorkflowManifest(manifestPath, {
      output: outputPath,
      baseUrl: 'https://example.test',
      screenshotDir: path.join(dir, 'screenshots'),
    });

    expect(result).toMatchObject({
      nodeCount: 2,
      edgeCount: 1,
      screenshotCount: 1,
    });
    expect(result.receipt.screenshotCapture.skippedSurfaceIds).toEqual(['dashboard-concept']);
    expect(result.receipt.warnings).toContain(
      'Prototype/mockup/component surfaces are manifest artifacts, not live captures.'
    );
    expect(mocks.captureScreenshotsMock).toHaveBeenCalledWith(
      [{ id: 'dashboard', route: '/dashboard' }],
      'https://example.test',
      path.join(dir, 'screenshots'),
      {}
    );

    const graph = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(graph.nodes.find((node: { id: string }) => node.id === 'dashboard')?.screenshot).toBe(
      '../screenshots/dashboard.webp'
    );
    expect(
      graph.nodes.find((node: { id: string }) => node.id === 'dashboard-concept')
    ).toMatchObject({
      route: 'prototype://dashboard-concept',
      screenshot: 'screenshots/prototypes/dashboard-concept.png',
      metadata: { kind: 'prototype-surface', surfaceType: 'generated-image' },
    });
  });

  it('throws a helpful error for invalid manifests', async () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'bad-workflow.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Bad',
        nodes: [{ route: 'missing-slash', label: 'Bad route' }],
      })
    );

    await expect(runWorkflowManifest(manifestPath)).rejects.toThrow(
      'nodes.0.route: route must start with "/"'
    );
  });

  it('writes a versioned workflow inspect contract without storage-state paths', async () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'workflow.json');
    const outputPath = path.join(dir, 'workflow.inspect.json');

    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Deckchecker Speaker',
        layout: { defaultViewMode: 'map', defaultTreeRootId: 'speaker-events' },
        sections: [{ id: 'speaker', label: 'Speaker' }],
        personas: [{ id: 'speaker', label: 'Speaker' }],
        authStates: [
          {
            id: 'speaker',
            kind: 'storage-state',
            storageStatePath: '.nav-map/auth/speaker.storage.json',
            verify: { route: '/my/events' },
          },
        ],
        nodes: [
          {
            id: 'speaker-events',
            route: '/my/events',
            label: 'My Events',
            section: 'speaker',
            personas: ['speaker'],
            authRequirement: 'speaker',
            expectations: { selectors: ['main'] },
            screenshot: 'screenshots/speaker-events.webp',
            sourceHints: ['web/src/app/(speaker)/my/events/page.tsx'],
          },
        ],
        edges: [{ source: 'speaker-events', target: 'speaker-events', action: 'Refresh' }],
        flows: [{ name: 'Speaker events', steps: ['speaker-events'] }],
      })
    );

    const result = await runWorkflowInspectManifest(manifestPath, {
      output: outputPath,
      contract: true,
      generatedAt: '2026-06-15T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      outputPath,
      valid: true,
      nodeCount: 1,
      edgeCount: 1,
      flowCount: 1,
    });

    const contract = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(contract).toMatchObject({
      schemaVersion: 'nav-map-agent-contract/v1',
      kind: 'workflow-inspect',
      summary: {
        app: 'Deckchecker Speaker',
        valid: true,
        nodeCount: 1,
        edgeCount: 1,
        flowCount: 1,
        authStateCount: 1,
      },
    });
    expect(contract.data.authStates[0]).toEqual({
      id: 'speaker',
      kind: 'storage-state',
      hasVerify: true,
      hasCapture: false,
    });
    expect(JSON.stringify(contract)).not.toContain('speaker.storage.json');
    expect(JSON.stringify(contract)).not.toContain('.nav-map/auth');
  });

  it('includes prototype surface summaries in workflow inspect output', async () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'workflow.json');
    const outputPath = path.join(dir, 'workflow.inspect.json');

    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Prototype Surfaces',
        nodes: [{ id: 'dashboard', route: '/dashboard', label: 'Dashboard' }],
        surfaces: [
          {
            id: 'dashboard-wireframe',
            label: 'Dashboard Wireframe',
            type: 'html-mockup',
            section: 'prototype',
            screenshot: 'screenshots/prototypes/dashboard-wireframe.png',
            sourceHints: ['mockups/dashboard.html'],
          },
        ],
      })
    );

    const result = await runWorkflowInspectManifest(manifestPath, {
      output: outputPath,
      generatedAt: '2026-06-15T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      nodeCount: 2,
      edgeCount: 0,
      flowCount: 0,
    });

    const inspect = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(inspect.surfaces).toEqual([
      {
        id: 'dashboard-wireframe',
        label: 'Dashboard Wireframe',
        type: 'html-mockup',
        section: 'prototype',
        hasScreenshot: true,
        sourceHints: ['mockups/dashboard.html'],
      },
    ]);
    expect(JSON.stringify(inspect)).not.toContain('.nav-map/auth');
  });
});
