import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { initProject, loadProject, NAV_MAP_PROJECT_FILE } from '../modes/project.js';
import { syncProject, type SyncProjectRunners } from '../modes/sync.js';

describe('project sync', () => {
  it('discovers a newly added route on the next real repository sync', async () => {
    const root = fixtureRoot('changed-route');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'changed-route' }));
    writeRoute(root, 'app/page.tsx', '<a href="/about">About</a>');
    initProject({ rootDir: root });

    const first = await syncProject({ rootDir: root, screenshots: false });
    expect(JSON.parse(fs.readFileSync(first.graphPath, 'utf8')).nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ route: '/' })])
    );

    writeRoute(root, 'app/about/page.tsx', '<a href="/">Home</a>');
    const second = await syncProject({ rootDir: root, screenshots: false });
    expect(JSON.parse(fs.readFileSync(second.graphPath, 'utf8')).nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: '/' }),
        expect.objectContaining({ route: '/about' }),
      ])
    );
  });

  it('publishes a repo graph atomically and writes an agent-readable receipt', async () => {
    const root = fixtureRoot('repo');
    initProject({
      rootDir: root,
      id: 'repo-app',
      name: 'Repo Project',
      baseUrl: 'http://localhost:3000',
    });
    const scanRepo = vi.fn(async () => fixtureGraph('Repo App'));

    const result = await syncProject(
      { rootDir: root, screenshots: false },
      fixtureRunners({ scanRepo })
    );

    expect(scanRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        projectDir: root,
        name: 'Repo Project',
        screenshots: false,
        baseUrl: 'http://localhost:3000',
      })
    );
    expect(JSON.parse(fs.readFileSync(result.graphPath, 'utf8'))).toMatchObject({
      meta: { name: 'Repo App', projectId: 'repo-app', environmentId: 'local' },
      nodes: [{ id: 'home' }],
    });
    expect(result.receipt).toMatchObject({
      status: 'passed',
      project: { id: 'repo-app' },
      source: { type: 'repo', reference: '.' },
      graph: { path: '.nav-map/generated/nav-map.json', nodeCount: 1 },
      receiptPath: '.nav-map/generated/receipts/latest-sync.json',
      nextActions: ['nav-map open'],
    });
    expect(fs.readdirSync(path.dirname(result.graphPath))).not.toEqual(
      expect.arrayContaining([expect.stringContaining('.tmp')])
    );
  });

  it('uses a requested URL environment and screenshot controls', async () => {
    const root = fixtureRoot('url');
    initProject({ rootDir: root, name: 'URL Project', url: 'https://local.example.test' });
    addEnvironment(root, 'staging', 'https://staging.example.test');
    const crawlUrl = vi.fn(async () => fixtureGraph('URL App'));

    const result = await syncProject(
      { rootDir: root, environment: 'staging', screenshots: false, maxPages: 12 },
      fixtureRunners({ crawlUrl })
    );

    expect(crawlUrl).toHaveBeenCalledWith({
      startUrl: 'https://staging.example.test',
      name: 'URL Project',
      maxPages: 12,
    });
    expect(result.receipt.environment).toEqual({
      id: 'staging',
      baseUrl: 'https://staging.example.test',
    });
    expect(result.receipt.command).toBe('nav-map sync --environment staging --no-screenshots');
  });

  it('passes a workflow auth-state id without exposing storage contents', async () => {
    const root = fixtureRoot('workflow');
    fs.writeFileSync(path.join(root, 'workflow.json'), '{}');
    initProject({
      rootDir: root,
      manifest: 'workflow.json',
      baseUrl: 'https://workflow.example.test',
    });
    const runWorkflowManifest = vi.fn(async (_manifest: string, options = {}) => {
      fs.writeFileSync(options.output!, JSON.stringify({ ...fixtureGraph('Workflow'), flows: [] }));
      return {
        outputPath: options.output!,
        nodeCount: 1,
        edgeCount: 0,
        groupCount: 1,
        screenshotCount: 1,
        receipt: {
          command: 'redacted by sync receipt',
          manifestPath: path.join(root, 'workflow.json'),
          outputPath: options.output!,
          authStateId: 'member',
          routeVariablesApplied: [],
          screenshotCapture: {
            requested: true,
            routeCount: 1,
            capturedNodeIds: ['home'],
            manifestRouteScreenshotNodeIds: [],
            manifestSurfaceScreenshotIds: [],
            skippedSurfaceIds: [],
          },
          warnings: [],
          nextActions: [],
        },
      };
    });

    const result = await syncProject(
      { rootDir: root, authState: 'member' },
      fixtureRunners({ runWorkflowManifest })
    );

    expect(runWorkflowManifest).toHaveBeenCalledWith(
      path.join(root, 'workflow.json'),
      expect.objectContaining({
        authState: 'member',
        baseUrl: 'https://workflow.example.test',
        screenshots: true,
      })
    );
    expect(result.receipt.authStateId).toBe('member');
    expect(result.receipt.verification).toMatchObject({
      capturedScreenshotCount: 1,
      capturedNodeIds: ['home'],
    });
    expect(JSON.stringify(result.receipt)).not.toMatch(/cookie|token|password|storageState/i);
  });

  it('preserves the last good graph and records a failed receipt', async () => {
    const root = fixtureRoot('failure');
    initProject({ rootDir: root });
    const loaded = loadProject(root);
    const graphPath = path.join(root, loaded.project.artifacts.graph);
    fs.mkdirSync(path.dirname(graphPath), { recursive: true });
    fs.writeFileSync(graphPath, '{"lastGood":true}\n');
    const scanRepo = vi.fn(async () => {
      throw new Error('fixture generation failed');
    });

    await expect(syncProject({ rootDir: root }, fixtureRunners({ scanRepo }))).rejects.toThrow(
      'Sync failed: fixture generation failed'
    );

    expect(fs.readFileSync(graphPath, 'utf8')).toBe('{"lastGood":true}\n');
    const receipt = JSON.parse(
      fs.readFileSync(
        path.join(root, loaded.project.artifacts.receipts, 'latest-sync.json'),
        'utf8'
      )
    );
    expect(receipt).toMatchObject({
      status: 'failed',
      graph: { preservedPrevious: true },
      failures: ['fixture generation failed'],
    });
  });

  it('rejects a legacy flow shape before replacing the last good graph', async () => {
    const root = fixtureRoot('legacy-flow');
    initProject({ rootDir: root });
    const loaded = loadProject(root);
    const graphPath = path.join(root, loaded.project.artifacts.graph);
    fs.mkdirSync(path.dirname(graphPath), { recursive: true });
    fs.writeFileSync(graphPath, '{"lastGood":true}\n');
    const scanRepo = vi.fn(async () => ({
      ...fixtureGraph('Legacy flow'),
      flows: [{ label: 'Checkout', steps: ['home'] }],
    }));

    await expect(syncProject({ rootDir: root }, fixtureRunners({ scanRepo }))).rejects.toThrow(
      'Legacy "label" detected; rename it to "name"'
    );
    expect(fs.readFileSync(graphPath, 'utf8')).toBe('{"lastGood":true}\n');
  });

  it('rejects unknown environments before generation', async () => {
    const root = fixtureRoot('environment');
    initProject({ rootDir: root, baseUrl: 'http://localhost:3000' });
    await expect(syncProject({ rootDir: root, environment: 'missing' })).rejects.toThrow(
      'Unknown project environment "missing". Available: local.'
    );
  });
});

function fixtureRunners(overrides: Partial<SyncProjectRunners>): SyncProjectRunners {
  return {
    scanRepo: async () => fixtureGraph('Repo'),
    crawlUrl: async () => fixtureGraph('URL'),
    runWorkflowManifest: async () => {
      throw new Error('Unexpected workflow generation');
    },
    ...overrides,
  };
}

function fixtureGraph(name: string) {
  return {
    version: '1.0' as const,
    meta: {
      name,
      generatedAt: '2026-07-13T00:00:00.000Z',
      generatedBy: 'repo-scan' as const,
    },
    nodes: [{ id: 'home', route: '/', label: 'Home', group: 'root' }],
    edges: [],
    groups: [{ id: 'root', label: 'Root' }],
  };
}

function addEnvironment(root: string, id: string, baseUrl: string): void {
  const projectPath = path.join(root, NAV_MAP_PROJECT_FILE);
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  project.environments[id] = { baseUrl };
  fs.writeFileSync(projectPath, `${JSON.stringify(project, null, 2)}\n`);
}

function fixtureRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nav-map-sync-${name}-`));
}

function writeRoute(root: string, relativePath: string, source: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `export default function Page() { return <>${source}</>; }\n`);
}
