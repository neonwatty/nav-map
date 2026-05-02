import fs from 'node:fs';
import path from 'node:path';
import { runRecordFlowsTests } from './record-flows-playwright.js';
import {
  discoverFlowTests,
  loadExistingGraph,
  readRecordFlowsManifest,
  resolveRecordFlowsCwd,
} from './record-flows-discovery.js';
import { mergeGraphs } from './record-flows-merge.js';
import { buildRecordedGraph } from './record-flows-processor.js';
import type { NavMapGraph, RecordFlowsOptions } from './record-flows-types.js';

export type { RecordFlowsOptions } from './record-flows-types.js';

export async function recordFlows(options: RecordFlowsOptions): Promise<NavMapGraph> {
  const { flowsDir, baseUrl, storageState, routesJson, screenshotDir, name, failOnTestErrors } =
    options;

  const flowsDirAbs = path.resolve(flowsDir);
  const screenshotDirAbs = path.resolve(screenshotDir);
  fs.mkdirSync(screenshotDirAbs, { recursive: true });

  const { existingGraph, routePatterns } = loadExistingGraph(routesJson);
  const testFiles = await discoverFlowTests(flowsDirAbs);
  const cwd = resolveRecordFlowsCwd(flowsDirAbs, testFiles);
  console.log(`Working directory: ${cwd}`);

  console.log('\nRunning Playwright tests...');
  await runRecordFlowsTests({
    flowsDirAbs,
    screenshotDirAbs,
    baseUrl,
    storageState,
    cwd,
    failOnTestErrors,
  });

  const manifest = readRecordFlowsManifest(screenshotDirAbs);
  const graph = await buildRecordedGraph({
    manifest,
    routePatterns,
    screenshotDirAbs,
    baseUrl,
    name,
  });

  return existingGraph ? mergeGraphs(existingGraph, graph) : graph;
}
