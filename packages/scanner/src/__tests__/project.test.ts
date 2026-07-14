import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  initProject,
  loadProject,
  NAV_MAP_PROJECT_FILE,
  resolveOpenTarget,
  validateProject,
} from '../modes/project.js';

describe('NavMap project initialization', () => {
  it('creates a portable repo project and reuses it idempotently', () => {
    const root = fixtureRoot('fresh-app');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: '@acme/fresh-app' }));

    const created = initProject({ rootDir: root, baseUrl: 'http://localhost:3000/' });
    const projectPath = path.join(root, NAV_MAP_PROJECT_FILE);
    const original = fs.readFileSync(projectPath, 'utf8');

    expect(created).toMatchObject({
      status: 'created',
      projectPath: '.nav-map/project.json',
      project: {
        id: 'acme-fresh-app',
        name: '@acme/fresh-app',
        sourceType: 'repo',
        defaultEnvironment: 'local',
      },
      nextActions: ['nav-map sync', 'nav-map open'],
    });
    expect(loadProject(root).project).toMatchObject({
      source: { type: 'repo', directory: '.' },
      artifacts: {
        graph: '.nav-map/generated/nav-map.json',
        screenshots: '.nav-map/generated/screenshots',
      },
      environments: { local: { baseUrl: 'http://localhost:3000' } },
    });
    expect(fs.readFileSync(path.join(root, '.nav-map', '.gitignore'), 'utf8')).toBe(
      'auth/\ngenerated/\n'
    );

    const reused = initProject({ rootDir: root, baseUrl: 'http://localhost:3000' });
    expect(reused.status).toBe('reused');
    expect(reused.reusedFiles).toContain('.nav-map/project.json');
    expect(fs.readFileSync(projectPath, 'utf8')).toBe(original);
  });

  it('refuses conflicting initialization instead of overwriting', () => {
    const root = fixtureRoot('conflict-app');
    initProject({ rootDir: root, id: 'original' });
    const projectPath = path.join(root, NAV_MAP_PROJECT_FILE);
    const original = fs.readFileSync(projectPath, 'utf8');

    expect(() => initProject({ rootDir: root, id: 'replacement' })).toThrow(
      'conflicts with requested id'
    );
    expect(fs.readFileSync(projectPath, 'utf8')).toBe(original);
  });

  it('supports workflow and URL sources without storing auth material', () => {
    const workflowRoot = fixtureRoot('workflow-app');
    fs.mkdirSync(path.join(workflowRoot, 'docs'));
    fs.writeFileSync(path.join(workflowRoot, 'docs', 'app.workflow.json'), '{}');
    initProject({
      rootDir: workflowRoot,
      manifest: 'docs/app.workflow.json',
      baseUrl: 'https://staging.example.test',
    });
    expect(loadProject(workflowRoot).project).toMatchObject({
      source: { type: 'workflow', manifest: 'docs/app.workflow.json' },
      environments: { local: { baseUrl: 'https://staging.example.test' } },
    });

    const urlRoot = fixtureRoot('url-app');
    initProject({ rootDir: urlRoot, url: 'https://example.test/' });
    expect(loadProject(urlRoot).project).toMatchObject({
      source: { type: 'url', url: 'https://example.test' },
      environments: { local: { baseUrl: 'https://example.test' } },
    });
    expect(fs.readFileSync(path.join(urlRoot, NAV_MAP_PROJECT_FILE), 'utf8')).not.toMatch(
      /cookie|token|password|storageState/i
    );
  });

  it('rejects paths that escape the project root', () => {
    const root = fixtureRoot('safe-app');
    expect(() => initProject({ rootDir: root, manifest: '../outside.json' })).toThrow(
      'must stay inside the project root'
    );
    expect(() =>
      validateProject({
        version: 'nav-map-project/1.0',
        id: 'unsafe',
        name: 'Unsafe',
        source: { type: 'repo', directory: '.' },
        artifacts: {
          graph: '../outside.json',
          screenshots: '.nav-map/screenshots',
          receipts: '.nav-map/receipts',
        },
      })
    ).toThrow('artifacts.graph must stay inside the project root');
  });
});

describe('project-aware open resolution', () => {
  it('resolves initialized projects and explicit graph files', () => {
    const root = fixtureRoot('open-app');
    initProject({ rootDir: root, id: 'open-app' });
    const graphPath = path.join(root, '.nav-map', 'generated', 'nav-map.json');
    fs.mkdirSync(path.dirname(graphPath), { recursive: true });
    fs.writeFileSync(graphPath, '{}');

    const projectTarget = resolveOpenTarget(root);
    expect(projectTarget.jsonPath).toBe(graphPath);
    expect(projectTarget.screenshotDir).toBe(
      path.join(root, '.nav-map', 'generated', 'screenshots')
    );
    expect(projectTarget.project?.project.id).toBe('open-app');

    const explicitGraph = path.join(root, 'legacy.nav-map.json');
    fs.writeFileSync(explicitGraph, '{}');
    expect(resolveOpenTarget(explicitGraph)).toEqual({ jsonPath: explicitGraph });
  });

  it('gives an actionable error before the first sync', () => {
    const root = fixtureRoot('unsynced-app');
    initProject({ rootDir: root });
    expect(() => resolveOpenTarget(root)).toThrow('Run "nav-map sync" first');
  });
});

function fixtureRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nav-map-${name}-`));
}
