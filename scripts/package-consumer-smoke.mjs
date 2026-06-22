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
        },
        include: ['types.ts'],
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(consumerDir, 'types.ts'),
    [
      "import type { NavMapGraph } from '@neonwatty/nav-map';",
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
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'esm.mjs'),
    [
      "import { validateGraph } from '@neonwatty/nav-map/validation';",
      "import { validateWorkflowManifest, workflowManifestToGraph } from '@neonwatty/nav-map/workflow';",
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      "require.resolve('@neonwatty/nav-map/styles.css');",
      "const workflow = { version: 'workflow-atlas/1.0', name: 'Consumer Smoke', nodes: [{ id: 'home', route: '/', label: 'Home' }] };",
      'if (!validateWorkflowManifest(workflow).valid) throw new Error("workflow export failed");',
      'validateGraph(workflowManifestToGraph(workflow));',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'cjs.cjs'),
    [
      "const { validateGraph } = require('@neonwatty/nav-map/validation');",
      "const { validateWorkflowManifest, workflowManifestToGraph } = require('@neonwatty/nav-map/workflow');",
      "require.resolve('@neonwatty/nav-map/styles.css');",
      "const workflow = { version: 'workflow-atlas/1.0', name: 'Consumer Smoke', nodes: [{ id: 'home', route: '/', label: 'Home' }] };",
      'if (!validateWorkflowManifest(workflow).valid) throw new Error("workflow CJS export failed");',
      'validateGraph(workflowManifestToGraph(workflow));',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'scanner.mjs'),
    [
      "const scanner = await import('@neonwatty/nav-map-scanner');",
      "if (typeof scanner.scanRepo !== 'function') throw new Error('scanRepo export missing');",
      "if (typeof scanner.crawlUrl !== 'function') throw new Error('crawlUrl export missing');",
    ].join('\n')
  );
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: process.env.CI ?? '1' },
  });
  const label = `${command} ${args.join(' ')}`;
  receipts.push({ check: label, status: result.status === 0 ? 'pass' : 'fail' });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`${label} failed\n${output}`);
  }
  return result.stdout;
}
