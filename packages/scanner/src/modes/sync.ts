import fs from 'node:fs';
import path from 'node:path';
import { validateGraph } from '@neonwatty/nav-map/validation';
import { crawlUrl } from './crawl.js';
import type { NavMapGraph } from './crawl-types.js';
import {
  loadProject,
  resolveProjectEnvironment,
  resolveProjectFilePath,
  type LoadedNavMapProject,
  type NavMapProjectSource,
} from './project.js';
import { scanRepo } from './repo.js';
import { runWorkflowManifest } from './workflow.js';

export interface SyncProjectOptions {
  rootDir?: string;
  environment?: string;
  authState?: string;
  screenshots?: boolean;
  maxPages?: number;
}

export interface SyncProjectReceipt {
  version: 'nav-map-sync-receipt/1.0';
  status: 'passed' | 'failed';
  project: { id: string; name: string };
  source: { type: NavMapProjectSource['type']; reference: string };
  environment: { id: string | null; baseUrl: string | null };
  authStateId: string | null;
  screenshotsRequested: boolean;
  graph: {
    path: string;
    preservedPrevious: boolean;
    nodeCount: number;
    edgeCount: number;
    groupCount: number;
    flowCount: number;
  };
  verification: {
    routeCount: number;
    capturedScreenshotCount: number;
    capturedNodeIds: string[];
  };
  warnings: string[];
  failures: string[];
  receiptPath: string;
  command: string;
  completedAt: string;
  nextActions: string[];
}

export interface SyncProjectResult {
  graphPath: string;
  receiptPath: string;
  receipt: SyncProjectReceipt;
}

export interface SyncProjectRunners {
  scanRepo: typeof scanRepo;
  crawlUrl: typeof crawlUrl;
  runWorkflowManifest: typeof runWorkflowManifest;
}

interface GenerationEvidence {
  graph: NavMapGraph & {
    meta: NavMapGraph['meta'] & { projectId?: string; environmentId?: string };
    flows?: unknown[];
  };
  capturedNodeIds: string[];
  warnings: string[];
}

const DEFAULT_RUNNERS: SyncProjectRunners = { scanRepo, crawlUrl, runWorkflowManifest };

export async function syncProject(
  options: SyncProjectOptions = {},
  runners: SyncProjectRunners = DEFAULT_RUNNERS
): Promise<SyncProjectResult> {
  const loaded = loadProject(options.rootDir ?? '.');
  const environment = resolveProjectEnvironment(loaded, options.environment);
  const screenshotsRequested = options.screenshots !== false;
  const graphPath = resolveProjectFilePath(loaded, loaded.project.artifacts.graph);
  const screenshotDir = resolveProjectFilePath(loaded, loaded.project.artifacts.screenshots);
  const receiptsDir = resolveProjectFilePath(loaded, loaded.project.artifacts.receipts);
  const receiptPath = path.join(receiptsDir, 'latest-sync.json');
  const previousGraph = fs.existsSync(graphPath);
  const temporaryGraphPath = temporarySibling(graphPath);

  fs.mkdirSync(path.dirname(graphPath), { recursive: true });
  fs.mkdirSync(receiptsDir, { recursive: true });

  try {
    const evidence = await generateProjectGraph({
      loaded,
      environmentBaseUrl: environment.baseUrl,
      authState: options.authState,
      screenshotsRequested,
      screenshotDir,
      temporaryGraphPath,
      maxPages: options.maxPages,
      runners,
    });
    evidence.graph.meta.projectId = loaded.project.id;
    if (environment.id) evidence.graph.meta.environmentId = environment.id;
    const validation = validateGraph(evidence.graph);
    if (!validation.valid) {
      const details = validation.errors.map(item => `${item.field}: ${item.message}`).join('; ');
      throw new Error(`Generated graph is invalid. ${details}`);
    }
    writeJsonFile(temporaryGraphPath, evidence.graph);
    fs.renameSync(temporaryGraphPath, graphPath);

    const receipt = buildReceipt({
      loaded,
      status: 'passed',
      graphPath,
      receiptPath,
      previousGraph,
      environmentId: environment.id,
      environmentBaseUrl: environment.baseUrl,
      authState: options.authState,
      screenshotsRequested,
      evidence,
      failures: [],
    });
    writeJsonAtomic(receiptPath, receipt);
    return { graphPath, receiptPath, receipt };
  } catch (error) {
    removeIfPresent(temporaryGraphPath);
    const message = error instanceof Error ? error.message : String(error);
    const receipt = buildReceipt({
      loaded,
      status: 'failed',
      graphPath,
      receiptPath,
      previousGraph,
      environmentId: environment.id,
      environmentBaseUrl: environment.baseUrl,
      authState: options.authState,
      screenshotsRequested,
      failures: [message],
    });
    writeJsonAtomic(receiptPath, receipt);
    throw new Error(`Sync failed: ${message}`, { cause: error });
  }
}

async function generateProjectGraph(input: {
  loaded: LoadedNavMapProject;
  environmentBaseUrl?: string;
  authState?: string;
  screenshotsRequested: boolean;
  screenshotDir: string;
  temporaryGraphPath: string;
  maxPages?: number;
  runners: SyncProjectRunners;
}): Promise<GenerationEvidence> {
  const { loaded, environmentBaseUrl, screenshotsRequested, screenshotDir } = input;
  const { source } = loaded.project;

  if (source.type === 'repo') {
    if (input.authState) throw new Error('--auth-state is only supported for workflow projects.');
    const graph = await input.runners.scanRepo({
      projectDir: resolveProjectFilePath(loaded, source.directory),
      name: loaded.project.name,
      screenshots: screenshotsRequested && Boolean(environmentBaseUrl),
      baseUrl: environmentBaseUrl,
      screenshotDir,
    });
    return graphEvidence(graph);
  }

  if (source.type === 'url') {
    if (input.authState) throw new Error('--auth-state is only supported for workflow projects.');
    const graph = await input.runners.crawlUrl({
      startUrl: environmentBaseUrl ?? source.url,
      name: loaded.project.name,
      ...(screenshotsRequested ? { screenshotDir } : {}),
      ...(input.maxPages ? { maxPages: input.maxPages } : {}),
    });
    const failures = graph.meta.diagnostics?.crawl;
    const warnings = failures
      ? [
          ...failures.failedPages.map(item => `Page failed: ${item.url} (${item.reason})`),
          ...failures.screenshotFailures.map(
            item => `Screenshot failed: ${item.url} (${item.reason})`
          ),
          ...(failures.maxPagesReached ? ['Crawl stopped at the configured page limit.'] : []),
        ]
      : [];
    return graphEvidence(graph, warnings);
  }

  const manifestPath = resolveProjectFilePath(loaded, source.manifest);
  const result = await input.runners.runWorkflowManifest(manifestPath, {
    output: input.temporaryGraphPath,
    baseUrl: environmentBaseUrl,
    screenshotDir,
    authState: input.authState,
    screenshots: screenshotsRequested,
  });
  const graph = JSON.parse(
    fs.readFileSync(input.temporaryGraphPath, 'utf8')
  ) as GenerationEvidence['graph'];
  return {
    graph,
    capturedNodeIds: result.receipt.screenshotCapture.capturedNodeIds,
    warnings: result.receipt.warnings,
  };
}

function graphEvidence(
  graph: GenerationEvidence['graph'],
  warnings: string[] = []
): GenerationEvidence {
  return {
    graph,
    capturedNodeIds: graph.nodes.filter(node => Boolean(node.screenshot)).map(node => node.id),
    warnings,
  };
}

function buildReceipt(input: {
  loaded: LoadedNavMapProject;
  status: SyncProjectReceipt['status'];
  graphPath: string;
  receiptPath: string;
  previousGraph: boolean;
  environmentId?: string;
  environmentBaseUrl?: string;
  authState?: string;
  screenshotsRequested: boolean;
  evidence?: GenerationEvidence;
  failures: string[];
}): SyncProjectReceipt {
  const graph = input.evidence?.graph;
  return {
    version: 'nav-map-sync-receipt/1.0',
    status: input.status,
    project: { id: input.loaded.project.id, name: input.loaded.project.name },
    source: sourceReceipt(input.loaded.project.source),
    environment: {
      id: input.environmentId ?? null,
      baseUrl: input.environmentBaseUrl ?? null,
    },
    authStateId: input.authState ?? null,
    screenshotsRequested: input.screenshotsRequested,
    graph: {
      path: projectRelative(input.loaded, input.graphPath),
      preservedPrevious: input.status === 'failed' && input.previousGraph,
      nodeCount: graph?.nodes.length ?? 0,
      edgeCount: graph?.edges.length ?? 0,
      groupCount: graph?.groups.length ?? 0,
      flowCount: graph?.flows?.length ?? 0,
    },
    verification: {
      routeCount: graph?.nodes.filter(node => Boolean(node.route)).length ?? 0,
      capturedScreenshotCount: input.evidence?.capturedNodeIds.length ?? 0,
      capturedNodeIds: input.evidence?.capturedNodeIds ?? [],
    },
    warnings: input.evidence?.warnings ?? [],
    failures: input.failures,
    receiptPath: projectRelative(input.loaded, input.receiptPath),
    command: buildCommand(input),
    completedAt: new Date().toISOString(),
    nextActions:
      input.status === 'passed'
        ? ['nav-map open']
        : ['Fix the reported failure and run nav-map sync again.'],
  };
}

function sourceReceipt(source: NavMapProjectSource): SyncProjectReceipt['source'] {
  if (source.type === 'repo') return { type: source.type, reference: source.directory };
  if (source.type === 'workflow') return { type: source.type, reference: source.manifest };
  return { type: source.type, reference: source.url };
}

function buildCommand(input: {
  environmentId?: string;
  authState?: string;
  screenshotsRequested: boolean;
}): string {
  const args = ['nav-map sync'];
  if (input.environmentId) args.push(`--environment ${input.environmentId}`);
  if (input.authState) args.push(`--auth-state ${input.authState}`);
  if (!input.screenshotsRequested) args.push('--no-screenshots');
  return args.join(' ');
}

function temporarySibling(filePath: string): string {
  return path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  );
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = temporarySibling(filePath);
  try {
    writeJsonFile(temporaryPath, value);
    fs.renameSync(temporaryPath, filePath);
  } finally {
    removeIfPresent(temporaryPath);
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function removeIfPresent(filePath: string): void {
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

function projectRelative(loaded: LoadedNavMapProject, filePath: string): string {
  return path.relative(loaded.rootDir, filePath).split(path.sep).join('/');
}
