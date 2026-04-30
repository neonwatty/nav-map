import fs from 'node:fs';
import path from 'node:path';
import { parseReport } from '../ingest/parseReport.js';
import { parseTrace } from '../ingest/parseTrace.js';
import { selectScreenshotForRoute } from '../ingest/extractScreenshots.js';
import {
  mergeGraph,
  type TestCoverageData,
  type RouteCoverageEntry,
} from '../ingest/mergeGraph.js';
import { routeToId } from '../ingest/routeToId.js';
import { validateGraph } from '@neonwatty/nav-map/validation';
import type {
  NavMapGraph,
  NavMapFlowGallery,
  NavMapFlowStep,
  CoverageTestRef,
} from '@neonwatty/nav-map';

export interface IngestOptions {
  reportDir: string;
  output: string;
  baseGraphPath?: string;
  baseUrl?: string;
  screenshots?: boolean;
}

export interface IngestResult {
  outputPath: string;
  testCount: number;
  routesCovered: number;
  routesUncovered: number;
}

async function optimizeScreenshot(buffer: Buffer, outputPath: string): Promise<void> {
  try {
    const sharp = (await import('sharp')).default;
    await sharp(buffer).resize(320, 200, { fit: 'cover' }).webp({ quality: 80 }).toFile(outputPath);
  } catch (err) {
    console.warn(
      `Screenshot optimization failed, writing raw buffer: ${err instanceof Error ? err.message : err}`
    );
    fs.writeFileSync(outputPath, buffer);
  }
}

function findReport(dir: string): string | null {
  // Check common locations
  const candidates = [path.join(dir, 'report.json'), path.join(dir, 'results.json')];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Look for any .json file in the directory
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (files.length === 1) return path.join(dir, files[0]);

  return null;
}

export async function runIngest(options: IngestOptions): Promise<IngestResult> {
  const { reportDir, output, baseGraphPath, baseUrl = '', screenshots = true } = options;
  const resolvedDir = path.resolve(reportDir);
  const outputDir = path.resolve(output);

  // Find the JSON report
  const reportPath = findReport(resolvedDir);
  if (!reportPath) {
    throw new Error(
      `No Playwright JSON report found in ${resolvedDir}. Expected report.json or a .json file.`
    );
  }

  let reportData: Record<string, unknown>;
  try {
    reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `Failed to parse Playwright report at ${reportPath}: ${err instanceof Error ? err.message : err}`,
      { cause: err }
    );
  }
  const testRuns = parseReport(reportData);

  console.log(`Found ${testRuns.length} test runs`);

  // Create output directories
  fs.mkdirSync(outputDir, { recursive: true });
  const screenshotDir = path.join(outputDir, 'screenshots');
  if (screenshots) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Parse traces and build coverage data
  const routeCoverage: Record<string, RouteCoverageEntry> = {};
  const processedRuns: TestCoverageData['testRuns'] = [];

  for (const run of testRuns) {
    if (!run.tracePath || !fs.existsSync(run.tracePath)) {
      console.warn(`  Skipping ${run.name}: no trace file at ${run.tracePath}`);
      continue;
    }

    console.log(`  Processing: ${run.name} (${run.status})`);
    const traceBuffer = fs.readFileSync(run.tracePath);
    const trace = parseTrace(traceBuffer, baseUrl);

    // Build flow gallery with screenshots
    const gallery: NavMapFlowGallery = {};
    const flowSteps: string[] = [];

    for (const route of trace.routes) {
      const nodeId = routeToId(route);
      flowSteps.push(nodeId);

      const gotoAction = trace.actions.find(a => a.method === 'goto' && a.route === route);
      const navTimestamp = gotoAction?.timestamp ?? 0;

      const steps: NavMapFlowStep[] = [
        {
          action: 'goto',
          title: `Navigate to ${route}`,
          timestamp: navTimestamp,
        },
      ];

      // Find and save screenshot for this route
      if (screenshots && navTimestamp > 0) {
        const frame = selectScreenshotForRoute(navTimestamp, trace.screenshots);
        if (frame && trace.resourceBuffers.has(frame.sha1)) {
          const filename = `${run.id}-${nodeId}.webp`;
          await optimizeScreenshot(
            trace.resourceBuffers.get(frame.sha1)!,
            path.join(screenshotDir, filename)
          );
          steps[0].screenshot = `screenshots/${filename}`;
        }
      }

      gallery[nodeId] = steps;
    }

    // Aggregate route coverage
    const testRef: CoverageTestRef = {
      id: run.id,
      name: run.name,
      specFile: run.specFile,
      status: run.status,
    };

    for (const route of trace.routes) {
      if (!routeCoverage[route]) {
        routeCoverage[route] = {
          testCount: 0,
          passCount: 0,
          failCount: 0,
          tests: [],
          lastRun: run.startTime,
        };
      }
      const entry = routeCoverage[route];
      entry.testCount++;
      if (run.status === 'passed') entry.passCount++;
      if (run.status === 'failed') entry.failCount++;
      entry.tests.push(testRef);
      if (run.startTime > entry.lastRun) entry.lastRun = run.startTime;
    }

    processedRuns.push({
      id: run.id,
      name: run.name,
      specFile: run.specFile,
      status: run.status,
      duration: run.duration,
      startTime: run.startTime,
      routesVisited: trace.routes,
      flow: { name: run.name, steps: flowSteps, gallery },
    });
  }

  const coverageData: TestCoverageData = {
    testRuns: processedRuns,
    routeCoverage,
  };

  // Merge with base graph if provided, otherwise create minimal graph
  let resultGraph: NavMapGraph;

  if (baseGraphPath) {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(baseGraphPath), 'utf-8'));
    const validation = validateGraph(parsed);
    if (!validation.valid) {
      const issues = validation.errors.map((e: { message: string }) => e.message).join(', ');
      throw new Error(`Base graph at ${baseGraphPath} is not valid: ${issues}`);
    }
    const baseGraph = parsed as NavMapGraph;
    resultGraph = mergeGraph(baseGraph, coverageData);
  } else {
    // No base graph -- build from test data alone
    const minimalBase: NavMapGraph = {
      version: '1.0',
      meta: {
        name: 'test-coverage',
        generatedAt: new Date().toISOString(),
        generatedBy: 'e2e-record',
      },
      nodes: [],
      edges: [],
      groups: [],
    };
    resultGraph = mergeGraph(minimalBase, coverageData);
  }

  // Write output
  const outputPath = path.join(outputDir, 'nav-map.json');
  fs.writeFileSync(outputPath, JSON.stringify(resultGraph, null, 2));

  const coveredCount = Object.keys(routeCoverage).length;
  const uncoveredCount = resultGraph.nodes.filter(n => n.coverage?.status === 'uncovered').length;

  return {
    outputPath,
    testCount: processedRuns.length,
    routesCovered: coveredCount,
    routesUncovered: uncoveredCount,
  };
}
