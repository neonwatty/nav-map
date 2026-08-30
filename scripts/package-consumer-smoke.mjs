#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const keep = process.argv.includes('--keep');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-package-consumer-'));
const packDir = path.join(tempRoot, 'packs');
const consumerDir = path.join(tempRoot, 'consumer');
const receipts = [];

fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(consumerDir, { recursive: true });

try {
  run('pnpm', ['--filter', '@neonwatty/nav-map', 'build'], repoRoot);
  run('pnpm', ['--filter', '@neonwatty/nav-map-scanner', 'build'], repoRoot);

  const coreTarball = packPackage('packages/core');
  const scannerTarball = packPackage('packages/scanner');

  writeConsumerProject(coreTarball, scannerTarball);
  run('pnpm', ['install', '--ignore-workspace'], consumerDir);
  run('pnpm', ['exec', 'tsc', '--noEmit'], consumerDir);
  run('node', ['esm.mjs'], consumerDir);
  run('node', ['cjs.cjs'], consumerDir);
  run('node', ['scanner.mjs'], consumerDir);
  run('pnpm', ['exec', 'nav-map', '--help'], consumerDir);
  run('pnpm', ['exec', 'nav-map', 'init', '--help'], consumerDir);
  run('pnpm', ['exec', 'nav-map', 'sync', '--help'], consumerDir);
  run('pnpm', ['exec', 'nav-map', 'open', '--help'], consumerDir);

  console.log(
    JSON.stringify(
      {
        ok: true,
        tempRoot: keep ? tempRoot : '<removed>',
        checks: receipts,
      },
      null,
      2
    )
  );
} finally {
  if (!keep) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function packPackage(packageDir) {
  const before = new Set(fs.readdirSync(packDir));
  run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', packDir], repoRoot);
  const after = fs.readdirSync(packDir).filter(file => file.endsWith('.tgz') && !before.has(file));
  if (after.length !== 1) {
    throw new Error(`Expected one tarball from ${packageDir}, found ${after.length}`);
  }
  const tarball = path.join(packDir, after[0]);
  receipts.push({ check: `pack ${packageDir}`, tarball: path.basename(tarball) });
  return tarball;
}

function writeConsumerProject(coreTarball, scannerTarball) {
  fs.writeFileSync(
    path.join(consumerDir, 'package.json'),
    JSON.stringify(
      {
        name: 'nav-map-package-consumer-smoke',
        private: true,
        type: 'module',
        dependencies: {
          '@neonwatty/nav-map': `file:${coreTarball}`,
          '@neonwatty/nav-map-scanner': `file:${scannerTarball}`,
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          typescript: '^5.7.0',
        },
        devDependencies: {},
        pnpm: {
          overrides: {
            '@neonwatty/nav-map': `file:${coreTarball}`,
          },
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(consumerDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          jsx: 'react-jsx',
        },
        include: ['types.tsx'],
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(consumerDir, 'types.tsx'),
    [
      "import { WorkflowCanvas, workflowCanvasV1Fixture, type NavMapGraph, type WorkflowCanvasV1 } from '@neonwatty/nav-map';",
      "import type { WorkflowManifest } from '@neonwatty/nav-map/workflow';",
      "import { validateGraph } from '@neonwatty/nav-map/validation';",
      "import { validateWorkflowManifest, workflowManifestToGraph } from '@neonwatty/nav-map/workflow';",
      '',
      'const workflow = {',
      "  version: 'workflow-atlas/1.0',",
      "  name: 'Consumer Smoke',",
      "  nodes: [{ id: 'home', route: '/', label: 'Home' }],",
      '} satisfies WorkflowManifest;',
      'const result = validateWorkflowManifest(workflow);',
      'if (!result.valid) throw new Error(result.errors[0]?.message ?? "invalid workflow");',
      'const graph: NavMapGraph = workflowManifestToGraph(workflow);',
      'validateGraph(graph);',
      'const canvasDocument: WorkflowCanvasV1 = workflowCanvasV1Fixture;',
      'const canvas = <WorkflowCanvas document={canvasDocument} defaultSelectedNodeId="welcome" />;',
      'void canvas;',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'esm.mjs'),
    [
      "import fs from 'node:fs';",
      "import { fileURLToPath } from 'node:url';",
      "import React from 'react';",
      "import { renderToStaticMarkup } from 'react-dom/server';",
      "import { WorkflowCanvas, workflowCanvasV1Fixture, validateWorkflowCanvas } from '@neonwatty/nav-map';",
      "import { validateGraph } from '@neonwatty/nav-map/validation';",
      "import { validateWorkflowManifest, workflowManifestToGraph } from '@neonwatty/nav-map/workflow';",
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      "require.resolve('@neonwatty/nav-map/styles.css');",
      "const packageEntry = fileURLToPath(import.meta.resolve('@neonwatty/nav-map'));",
      "if (packageEntry.startsWith(process.env.NAV_MAP_FORBIDDEN_WORKSPACE_ROOT)) throw new Error('ESM resolved from workspace instead of tarball');",
      "const stylesheet = fs.readFileSync(require.resolve('@neonwatty/nav-map/styles.css'), 'utf8');",
      "if (!stylesheet.includes('.react-flow') || !stylesheet.includes('.workflow-canvas')) throw new Error('combined public stylesheet missing');",
      "const workflow = { version: 'workflow-atlas/1.0', name: 'Consumer Smoke', nodes: [{ id: 'home', route: '/', label: 'Home' }] };",
      'if (!validateWorkflowManifest(workflow).valid) throw new Error("workflow export failed");',
      'validateGraph(workflowManifestToGraph(workflow));',
      'if (!validateWorkflowCanvas(workflowCanvasV1Fixture).valid) throw new Error("workflow canvas fixture invalid");',
      "const html = renderToStaticMarkup(React.createElement(WorkflowCanvas, { document: workflowCanvasV1Fixture, defaultSelectedNodeId: 'welcome' }));",
      "if (!html.includes('Privacy-safe onboarding review') || !html.includes('Workflow steps')) throw new Error('ESM WorkflowCanvas render failed');",
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'cjs.cjs'),
    [
      "const fs = require('node:fs');",
      "const React = require('react');",
      "const { renderToStaticMarkup } = require('react-dom/server');",
      "const { WorkflowCanvas, workflowCanvasV1Fixture, validateWorkflowCanvas } = require('@neonwatty/nav-map');",
      "const { validateGraph } = require('@neonwatty/nav-map/validation');",
      "const { validateWorkflowManifest, workflowManifestToGraph } = require('@neonwatty/nav-map/workflow');",
      "require.resolve('@neonwatty/nav-map/styles.css');",
      "const packageEntry = require.resolve('@neonwatty/nav-map');",
      "if (packageEntry.startsWith(process.env.NAV_MAP_FORBIDDEN_WORKSPACE_ROOT)) throw new Error('CJS resolved from workspace instead of tarball');",
      "const stylesheet = fs.readFileSync(require.resolve('@neonwatty/nav-map/styles.css'), 'utf8');",
      "if (!stylesheet.includes('.react-flow') || !stylesheet.includes('.workflow-canvas')) throw new Error('combined public stylesheet missing in CJS');",
      "const workflow = { version: 'workflow-atlas/1.0', name: 'Consumer Smoke', nodes: [{ id: 'home', route: '/', label: 'Home' }] };",
      'if (!validateWorkflowManifest(workflow).valid) throw new Error("workflow CJS export failed");',
      'validateGraph(workflowManifestToGraph(workflow));',
      'if (!validateWorkflowCanvas(workflowCanvasV1Fixture).valid) throw new Error("workflow canvas fixture invalid in CJS");',
      "const html = renderToStaticMarkup(React.createElement(WorkflowCanvas, { document: workflowCanvasV1Fixture, defaultSelectedNodeId: 'welcome' }));",
      "if (!html.includes('Privacy-safe onboarding review') || !html.includes('Workflow steps')) throw new Error('CJS WorkflowCanvas render failed');",
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'scanner.mjs'),
    [
      "import fs from 'node:fs';",
      "import path from 'node:path';",
      "import { fileURLToPath } from 'node:url';",
      "const scanner = await import('@neonwatty/nav-map-scanner');",
      "if (typeof scanner.scanRepo !== 'function') throw new Error('scanRepo export missing');",
      "if (typeof scanner.crawlUrl !== 'function') throw new Error('crawlUrl export missing');",
      "if (typeof scanner.startServer !== 'function') throw new Error('startServer export missing');",
      "if (typeof scanner.initProject !== 'function') throw new Error('initProject export missing');",
      "if (typeof scanner.loadProject !== 'function') throw new Error('loadProject export missing');",
      "if (typeof scanner.resolveOpenTarget !== 'function') throw new Error('resolveOpenTarget export missing');",
      "if (typeof scanner.syncProject !== 'function') throw new Error('syncProject export missing');",
      "const scannerEntry = fileURLToPath(import.meta.resolve('@neonwatty/nav-map-scanner'));",
      "const viewerDir = path.join(path.dirname(scannerEntry), 'viewer');",
      "if (!fs.existsSync(path.join(viewerDir, 'app.js'))) throw new Error('viewer JavaScript missing from scanner package');",
      "if (!fs.existsSync(path.join(viewerDir, 'app.css'))) throw new Error('viewer stylesheet missing from scanner package');",
    ].join('\n')
  );
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
      NAV_MAP_FORBIDDEN_WORKSPACE_ROOT: repoRoot,
    },
  });
  const label = `${command} ${args.join(' ')}`;
  receipts.push({ check: label, status: result.status === 0 ? 'pass' : 'fail' });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`${label} failed\n${output}`);
  }
  return result.stdout;
}
