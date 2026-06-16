import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadProbeRun,
  renderProbeDiff,
  renderProbeDiffContract,
  writeProbeDiff,
} from '../modes/diff.js';

describe('renderProbeDiff', () => {
  it('renders probe metadata and pass, warn, fail, and unchecked findings with reasons and screenshots', () => {
    const markdown = renderProbeDiff({
      app: 'Deckchecker Speaker',
      authState: 'speaker',
      baseUrl: 'http://localhost:3000',
      startedAt: '2026-06-14T00:00:00.000Z',
      finishedAt: '2026-06-14T00:01:00.000Z',
      results: [
        {
          nodeId: 'speaker-events',
          route: '/my/events',
          concreteRoute: '/my/events',
          finalUrl: 'http://localhost:3000/my/events',
          status: 'pass',
          screenshot: '.nav-map/probe-runs/screenshots/speaker-events.png',
          consoleErrors: [],
          failedRequests: [],
        },
        {
          nodeId: 'speaker-upload',
          route: '/my/events/[eventId]/upload',
          concreteRoute: '/my/events/e1/upload',
          finalUrl: 'http://localhost:3000/my/events/e1/upload',
          status: 'fail',
          reason: 'Missing expected text: Upload',
          screenshot: '.nav-map/probe-runs/screenshots/speaker-upload.png',
          consoleErrors: [],
          failedRequests: [],
        },
        {
          nodeId: 'speaker-results',
          route: '/my/events/[eventId]/results',
          concreteRoute: '/my/events/e1/results',
          finalUrl: 'http://localhost:3000/my/events/e1/results',
          status: 'warn',
          reason: 'Console errors observed',
          screenshot: '.nav-map/probe-runs/screenshots/speaker-results.png',
          consoleErrors: ['Error: request failed'],
          failedRequests: [],
        },
        {
          nodeId: 'speaker-review',
          route: '/my/events/[eventId]/review',
          concreteRoute: '/my/events/e1/review',
          finalUrl: 'http://localhost:3000/my/events/e1/review',
          status: 'unchecked',
          consoleErrors: [],
          failedRequests: [],
        },
      ],
    });

    expect(markdown).toContain('# Deckchecker Speaker Probe Diff');
    expect(markdown).toContain('- Auth state: speaker');
    expect(markdown).toContain('- Base URL: http://localhost:3000');
    expect(markdown).toContain('- Started: 2026-06-14T00:00:00.000Z');
    expect(markdown).toContain('- Finished: 2026-06-14T00:01:00.000Z');
    expect(markdown).toContain('| Node | Status | Route | Final URL | Reason | Screenshot |');
    expect(markdown).toContain('| speaker-events | pass |');
    expect(markdown).toContain('| speaker-upload | fail |');
    expect(markdown).toContain('| speaker-results | warn |');
    expect(markdown).toContain('| speaker-review | unchecked |');
    expect(markdown).toContain('Missing expected text: Upload');
    expect(markdown).toContain('.nav-map/probe-runs/screenshots/speaker-upload.png');
  });

  it('redacts secret-shaped strings from arbitrary probe receipt fields before rendering Markdown', () => {
    const markdown = renderProbeDiff({
      app: 'Deckchecker Speaker',
      authState: 'speaker',
      baseUrl: 'http://localhost:3000?token=secret-value',
      startedAt: '2026-06-14T00:00:00.000Z',
      finishedAt: '2026-06-14T00:01:00.000Z',
      results: [
        {
          nodeId: 'speaker-upload',
          route: '/my/events/[eventId]/upload?access_token=secret',
          concreteRoute: '/my/events/e1/upload?access_token=secret',
          finalUrl: 'http://localhost:3000/my/events/e1/upload?Authorization: Basic abc123',
          status: 'fail',
          reason: 'Missing expected text: Upload token: secret-value',
          screenshot: '.nav-map/probe-runs/screenshots/speaker-upload.png?refresh_token=secret',
          consoleErrors: [],
          failedRequests: [],
        },
      ],
    });

    expect(markdown).not.toMatch(
      /secret-value|access_token=secret|refresh_token=secret|Basic abc123/i
    );
    expect(markdown).toContain('[redacted]');
  });

  it('renders a versioned JSON diff contract and summarizes checks', () => {
    const contract = renderProbeDiffContract({
      app: 'Deckchecker Speaker',
      authState: 'speaker',
      authStateKind: 'storage-state',
      baseUrl: 'http://localhost:3000',
      startedAt: '2026-06-14T00:00:00.000Z',
      finishedAt: '2026-06-14T00:01:00.000Z',
      results: [
        {
          nodeId: 'speaker-upload',
          route: '/my/events/[eventId]/upload',
          concreteRoute: '/my/events/e1/upload',
          finalUrl: 'http://localhost:3000/my/events/e1/upload',
          status: 'fail',
          reason: 'Missing expected text: Upload',
          screenshot: '.nav-map/probe-runs/screenshots/speaker-upload.png',
          checks: [
            { name: 'status', status: 'pass', expected: 200, observed: 200 },
            { name: 'text', status: 'fail', expected: 'Upload', observed: [] },
          ],
          consoleErrors: [],
          failedRequests: [],
        },
      ],
    });

    expect(contract).toMatchObject({
      schemaVersion: 'nav-map-agent-contract/v1',
      kind: 'probe-diff',
      summary: {
        app: 'Deckchecker Speaker',
        authState: 'speaker',
        total: 1,
        fail: 1,
      },
    });
    expect(contract.data.findings[0].checkSummary).toEqual({ pass: 1, fail: 1 });
    expect(contract.nextActions[0].command).toContain('nav-map context <manifest>');
  });
});

describe('probe diff file helpers', () => {
  it('loads probe JSON from disk and writes Markdown to nested parent directories', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diff-'));
    const probePath = path.join(tempDir, 'receipt.json');
    const outputPath = path.join(tempDir, 'nested', 'latest.diff.md');

    fs.writeFileSync(
      probePath,
      JSON.stringify({
        app: 'Deckchecker Speaker',
        baseUrl: 'http://localhost:3000',
        startedAt: '2026-06-14T00:00:00.000Z',
        finishedAt: '2026-06-14T00:01:00.000Z',
        results: [],
      })
    );

    expect(loadProbeRun(probePath).app).toBe('Deckchecker Speaker');

    writeProbeDiff('# Diff\n', outputPath);

    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('# Diff\n');
  });

  it('loads probe runs from versioned contract envelopes', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-diff-'));
    const probePath = path.join(tempDir, 'contract.json');

    fs.writeFileSync(
      probePath,
      JSON.stringify({
        schemaVersion: 'nav-map-agent-contract/v1',
        kind: 'probe-run',
        data: {
          app: 'Deckchecker Speaker',
          baseUrl: 'http://localhost:3000',
          startedAt: '2026-06-14T00:00:00.000Z',
          finishedAt: '2026-06-14T00:01:00.000Z',
          results: [],
        },
      })
    );

    expect(loadProbeRun(probePath).app).toBe('Deckchecker Speaker');
  });
});
