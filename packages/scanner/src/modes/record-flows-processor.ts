import fs from 'node:fs';
import path from 'node:path';
import { isLoginPage, normalizeRoute, type RoutePattern } from './dedup.js';
import { correlateScreenshots, extractScreenshotBySha1, parseTrace } from './trace-parser.js';
import type { FlowGallery, NavMapGraph, RecordFlowsManifest } from './record-flows-types.js';

interface RecordedFlowState {
  pages: Map<string, NavMapGraph['nodes'][number]>;
  edgeSet: Map<string, { source: string; target: string; visitCount: number }>;
  flows: NonNullable<NavMapGraph['flows']>;
}

const GROUP_COLORS = ['#5b9bf5', '#4eca6a', '#b07ce8', '#f0a050', '#6e8ca8', '#556878'];

export async function buildRecordedGraph(options: {
  manifest: RecordFlowsManifest;
  routePatterns?: RoutePattern[];
  screenshotDirAbs: string;
  baseUrl: string;
  name?: string;
}): Promise<NavMapGraph> {
  const state: RecordedFlowState = { pages: new Map(), edgeSet: new Map(), flows: [] };

  for (const trace of options.manifest.traces) {
    if (!fs.existsSync(trace.tracePath)) {
      console.warn(`  Trace not found: ${trace.tracePath}`);
      continue;
    }
    await processTrace(trace, state, options.routePatterns, options.screenshotDirAbs);
  }

  console.log(
    `\nDiscovered ${state.pages.size} page(s), ${state.edgeSet.size} edge(s), ${state.flows.length} flow(s)`
  );

  return {
    version: '1.0',
    meta: {
      name: options.name ?? 'Recorded Flows',
      baseUrl: options.baseUrl,
      generatedAt: new Date().toISOString(),
      generatedBy: 'e2e-record',
    },
    nodes: [...state.pages.values()],
    edges: [...state.edgeSet.values()].map(edge => ({
      id: `e-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'link' as const,
    })),
    groups: buildGroups(state.pages),
    flows: state.flows.length > 0 ? state.flows : undefined,
  };
}

async function processTrace(
  trace: RecordFlowsManifest['traces'][number],
  state: RecordedFlowState,
  routePatterns: RoutePattern[] | undefined,
  screenshotDirAbs: string
): Promise<void> {
  console.log(`  Parsing: ${trace.testName}`);
  const { actions, screenshots } = await parseTrace(trace.tracePath);
  const lastTs = actions.length > 0 ? actions[actions.length - 1].timestamp + 1 : 0;
  actions.push({ action: 'end', title: 'Test complete', timestamp: lastTs });

  const ssMap = correlateScreenshots(actions, screenshots);
  const flowSteps: string[] = [];
  const gallery: FlowGallery = {};
  let prevNodeId: string | null = null;
  let currentNodeId: string | null = null;
  let stepCounter = 0;

  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];
    if (action.action === 'goto' && action.url) {
      const nextNodeId = addGotoAction(action.url, state, routePatterns, prevNodeId, flowSteps);
      if (!nextNodeId) continue;
      prevNodeId = currentNodeId;
      currentNodeId = nextNodeId;
    }

    if (!shouldCaptureGalleryStep(action.action, currentNodeId)) continue;
    stepCounter++;
    const screenshotPath = await extractGalleryScreenshot({
      tracePath: trace.tracePath,
      testName: trace.testName,
      screenshotDirAbs,
      sha1: ssMap.get(index),
      stepCounter,
    });
    addGalleryStep(gallery, currentNodeId, action, screenshotPath);
    updatePageScreenshot(state.pages, currentNodeId, screenshotPath);
  }

  if (flowSteps.length >= 1) {
    state.flows.push({
      name: trace.testName,
      steps: flowSteps,
      gallery: Object.keys(gallery).length > 0 ? gallery : undefined,
      partial: trace.status === 'failed' ? true : undefined,
    });
  }
}

function addGotoAction(
  url: string,
  state: RecordedFlowState,
  routePatterns: RoutePattern[] | undefined,
  prevNodeId: string | null,
  flowSteps: string[]
): string | null {
  const pathname = getPathname(url);
  if (!pathname || isLoginPage(url)) return null;

  const normalized = normalizeRoute(pathname, routePatterns);
  if (!normalized) return null;

  if (!state.pages.has(normalized.id)) {
    state.pages.set(normalized.id, {
      id: normalized.id,
      route: normalized.route,
      label: normalized.label,
      group: normalized.group,
    });
  }

  if (prevNodeId && prevNodeId !== normalized.id) {
    const key = `${prevNodeId}->${normalized.id}`;
    const existing = state.edgeSet.get(key);
    if (existing) existing.visitCount++;
    else state.edgeSet.set(key, { source: prevNodeId, target: normalized.id, visitCount: 1 });
  }

  if (!flowSteps.includes(normalized.id)) flowSteps.push(normalized.id);
  return normalized.id;
}

function getPathname(url: string): string | null {
  try {
    return url.startsWith('/') ? url.split('?')[0].split('#')[0] : new URL(url).pathname;
  } catch {
    return null;
  }
}

function shouldCaptureGalleryStep(
  action: string,
  currentNodeId: string | null
): currentNodeId is string {
  return Boolean(currentNodeId && (action === 'goto' || action === 'waitFor' || action === 'end'));
}

async function extractGalleryScreenshot(options: {
  tracePath: string;
  testName: string;
  screenshotDirAbs: string;
  sha1?: string;
  stepCounter: number;
}): Promise<string | undefined> {
  if (!options.sha1) return undefined;
  const safeName = options.testName
    .replace(/[^a-zA-Z0-9]/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '');
  const filename = `${safeName}-step-${String(options.stepCounter).padStart(2, '0')}`;
  const extracted = await extractScreenshotBySha1(
    options.tracePath,
    options.sha1,
    options.screenshotDirAbs,
    filename
  );
  return extracted ? path.relative(process.cwd(), extracted) : undefined;
}

function addGalleryStep(
  gallery: FlowGallery,
  nodeId: string,
  action: {
    action: 'goto' | 'waitFor' | 'click' | 'fill' | 'end';
    title: string;
    timestamp: number;
  },
  screenshotPath: string | undefined
): void {
  gallery[nodeId] ??= [];
  gallery[nodeId].push({
    action: action.action,
    title: action.title,
    screenshot: screenshotPath,
    timestamp: action.timestamp,
  });
}

function updatePageScreenshot(
  pages: Map<string, NavMapGraph['nodes'][number]>,
  nodeId: string,
  screenshotPath: string | undefined
): void {
  if (!screenshotPath) return;
  const page = pages.get(nodeId);
  if (page) page.screenshot = screenshotPath;
}

function buildGroups(pages: Map<string, NavMapGraph['nodes'][number]>): NavMapGraph['groups'] {
  const groupMap = new Map<string, Set<string>>();
  for (const page of pages.values()) {
    const pageIds = groupMap.get(page.group) ?? new Set<string>();
    pageIds.add(page.id);
    groupMap.set(page.group, pageIds);
  }

  return [...groupMap.entries()]
    .filter(([, pageIds]) => pageIds.size > 0)
    .map(([id], index) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: GROUP_COLORS[index % GROUP_COLORS.length],
      routePrefix: id === 'root' ? '/' : `/${id}`,
    }));
}
