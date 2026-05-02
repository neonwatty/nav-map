import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { loadRoutePatterns, type RoutePattern } from './dedup.js';
import type { NavMapGraph, RecordFlowsManifest } from './record-flows-types.js';

export interface ExistingGraphContext {
  existingGraph?: NavMapGraph;
  routePatterns?: RoutePattern[];
}

export function loadExistingGraph(routesJson?: string): ExistingGraphContext {
  if (!routesJson || !fs.existsSync(routesJson)) return {};

  console.log(`Loading existing graph from ${routesJson}...`);
  const existingGraph = JSON.parse(fs.readFileSync(routesJson, 'utf-8')) as NavMapGraph;
  const routePatterns = loadRoutePatterns(routesJson);
  console.log(`  ${routePatterns.length} route patterns loaded`);
  return { existingGraph, routePatterns };
}

export async function discoverFlowTests(flowsDirAbs: string): Promise<string[]> {
  const testFiles = await glob('**/*.spec.{ts,js}', { cwd: flowsDirAbs });
  if (testFiles.length === 0) {
    throw new Error(`No .spec.ts/.spec.js files found in ${flowsDirAbs}`);
  }

  console.log(`Found ${testFiles.length} flow test(s):`);
  for (const file of testFiles) console.log(`  ${file}`);
  return testFiles;
}

export function resolveRecordFlowsCwd(flowsDirAbs: string, testFiles: string[]): string {
  try {
    const firstTestReal = fs.realpathSync(path.join(flowsDirAbs, testFiles[0]));
    let dir = path.dirname(firstTestReal);
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
      dir = path.dirname(dir);
    }
  } catch {
    // fallback to flows dir
  }
  return flowsDirAbs;
}

export function readRecordFlowsManifest(screenshotDirAbs: string): RecordFlowsManifest {
  const manifestPath = path.join(screenshotDirAbs, '.nav-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Reporter manifest not found at ${manifestPath}.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as RecordFlowsManifest;
  console.log(`\nProcessing ${manifest.traces.length} trace(s)...`);
  return manifest;
}
