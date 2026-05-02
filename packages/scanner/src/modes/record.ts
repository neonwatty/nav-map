import fs from 'node:fs';
import path from 'node:path';
import { loadRoutePatterns, type RoutePattern } from './dedup.js';
import { buildGroups } from './record-groups.js';
import { runPlaywrightAndLoadManifest } from './record-playwright.js';
import { assignScreenshotsToPages } from './record-screenshots.js';
import { aggregateTraceNavigations } from './record-trace-aggregation.js';
import type { NavMapGraph, RecordOptions } from './record-types.js';

export type { RecordOptions } from './record-types.js';

export async function recordTests(options: RecordOptions): Promise<NavMapGraph> {
  const { playwrightConfig, routesJson, screenshotDir, name } = options;

  const screenshotDirAbs = path.resolve(screenshotDir);
  fs.mkdirSync(screenshotDirAbs, { recursive: true });

  // Load route patterns if provided
  let routePatterns: RoutePattern[] | undefined;
  if (routesJson && fs.existsSync(routesJson)) {
    console.log(`Loading route patterns from ${routesJson}...`);
    routePatterns = loadRoutePatterns(routesJson);
    console.log(`  ${routePatterns.length} patterns loaded`);
  }

  const traces = runPlaywrightAndLoadManifest({ playwrightConfig }, screenshotDirAbs);
  console.log(`\nProcessing ${traces.length} traces...`);

  const { pages, edgeSet, flows, baseUrl } = await aggregateTraceNavigations(traces, routePatterns);

  console.log(`\nDiscovered ${pages.size} pages, ${edgeSet.size} edges, ${flows.length} flows`);

  await assignScreenshotsToPages(traces, pages, screenshotDirAbs);
  const groups = buildGroups(pages.values());

  return {
    version: '1.0',
    meta: {
      name: name ?? 'Recorded Navigation Map',
      baseUrl,
      generatedAt: new Date().toISOString(),
      generatedBy: 'e2e-record',
    },
    nodes: [...pages.values()],
    edges: [...edgeSet.values()].map(e => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'link' as const,
      label: e.visitCount > 1 ? `${e.visitCount} visits` : undefined,
    })),
    groups,
    flows: flows.length > 0 ? flows : undefined,
  };
}

// Inline parseTraceNavigation and extractScreenshotsFromTrace removed —
// now using shared trace-parser.ts module
