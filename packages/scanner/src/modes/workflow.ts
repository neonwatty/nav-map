import fs from 'node:fs';
import path from 'node:path';
import {
  routeToId,
  validateWorkflowManifest,
  workflowManifestToGraph,
  type WorkflowManifest,
} from '@neonwatty/nav-map/workflow';
import { createAgentContract, type AgentContract } from './agent-contract.js';
import { findAuthState } from './auth-state.js';
import { captureScreenshots } from '../screenshots/capture.js';

export interface WorkflowCommandOptions {
  output?: string;
  baseUrl?: string;
  screenshotDir?: string;
  screenshots?: boolean;
  generatedAt?: string;
  authState?: string;
}

export interface WorkflowCommandResult {
  outputPath: string;
  nodeCount: number;
  edgeCount: number;
  groupCount: number;
  screenshotCount: number;
}

export interface WorkflowInspectResult {
  outputPath: string;
  valid: boolean;
  nodeCount: number;
  edgeCount: number;
  flowCount: number;
}

export interface WorkflowInspectPayload {
  valid: boolean;
  name: string;
  layout?: unknown;
  sections: unknown[];
  personas: unknown[];
  authStates: {
    id: string;
    label?: string;
    kind: string;
    hasVerify: boolean;
    hasCapture: boolean;
  }[];
  nodes: {
    id: string;
    route: string;
    label: string;
    section?: string;
    authRequirement?: string;
    personas: string[];
    hasExpectations: boolean;
    hasScreenshot: boolean;
    sourceHints: string[];
  }[];
  surfaces: {
    id: string;
    label: string;
    type: string;
    section?: string;
    hasScreenshot: boolean;
    sourceHints: string[];
  }[];
  edges: {
    source: string;
    target: string;
    action?: string;
    type?: string;
    personas: string[];
  }[];
  flows: {
    name: string;
    steps: string[];
  }[];
}

export async function runWorkflowManifest(
  manifestPath: string,
  options: WorkflowCommandOptions = {}
): Promise<WorkflowCommandResult> {
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifest = readWorkflowManifest(resolvedManifestPath);
  const outputPath = path.resolve(options.output ?? 'nav-map.json');
  const shouldCaptureScreenshots = options.screenshots !== false && Boolean(options.baseUrl);
  let screenshotOverrides: Record<string, string> = {};

  if (shouldCaptureScreenshots && options.baseUrl) {
    const screenshotDir = path.resolve(options.screenshotDir ?? 'nav-screenshots');
    const storageState = resolveWorkflowScreenshotStorageState(manifest, options.authState);
    const captured = await captureScreenshots(
      manifest.nodes.map(node => ({
        id: node.id ?? routeToId(node.route),
        route: resolveOptionalRouteTemplate(node.route, manifest.routeVariables ?? {}),
      })),
      options.baseUrl,
      screenshotDir,
      storageState ? { storageState } : {}
    );
    screenshotOverrides = Object.fromEntries(
      Array.from(captured.entries()).map(([nodeId, screenshotPath]) => [
        nodeId,
        normalizeGraphScreenshotPath(screenshotPath, outputPath),
      ])
    );
  }

  const graph = workflowManifestToGraph(manifest, {
    generatedAt: options.generatedAt,
    screenshotOverrides,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));

  return {
    outputPath,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    groupCount: graph.groups.length,
    screenshotCount: Object.keys(screenshotOverrides).length,
  };
}

export async function runWorkflowInspectManifest(
  manifestPath: string,
  options: { output?: string; contract?: boolean; generatedAt?: string } = {}
): Promise<WorkflowInspectResult> {
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifest = readWorkflowManifest(resolvedManifestPath);
  const outputPath = path.resolve(options.output ?? 'workflow.inspect.json');
  const payload = buildWorkflowInspectPayload(manifest);
  const output = options.contract
    ? buildWorkflowInspectContract(payload, manifestPath, options.generatedAt)
    : payload;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  return {
    outputPath,
    valid: payload.valid,
    nodeCount: payload.nodes.length + payload.surfaces.length,
    edgeCount: payload.edges.length,
    flowCount: payload.flows.length,
  };
}

function readWorkflowManifest(manifestPath: string): WorkflowManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Workflow manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as WorkflowManifest;
  const validation = validateWorkflowManifest(manifest);
  if (!validation.valid) {
    const message = validation.errors
      .map(error => `${error.field}: ${error.message}`)
      .join('\n  - ');
    throw new Error(`Invalid workflow manifest:\n  - ${message}`);
  }

  return manifest;
}

function normalizeGraphScreenshotPath(screenshotPath: string, outputPath: string): string {
  const relativePath = path.relative(path.dirname(outputPath), path.resolve(screenshotPath));
  return relativePath.split(path.sep).join('/');
}

function buildWorkflowInspectPayload(manifest: WorkflowManifest): WorkflowInspectPayload {
  return {
    valid: true,
    name: manifest.name,
    layout: manifest.layout,
    sections: [...(manifest.sections ?? [])],
    personas: [...(manifest.personas ?? [])],
    authStates: (manifest.authStates ?? []).map(state => ({
      id: state.id,
      label: state.label,
      kind: state.kind,
      hasVerify: Boolean(state.verify),
      hasCapture: Boolean(state.capture),
    })),
    nodes: manifest.nodes.map(node => ({
      id: node.id ?? routeToId(node.route),
      route: node.route,
      label: node.label,
      section: node.section,
      authRequirement: node.authRequirement,
      personas: [...(node.personas ?? [])],
      hasExpectations: Boolean(node.expectations),
      hasScreenshot: Boolean(node.screenshot),
      sourceHints: [...(node.sourceHints ?? [])],
    })),
    surfaces: (manifest.surfaces ?? []).map(surface => ({
      id: surface.id,
      label: surface.label,
      type: surface.type,
      section: surface.section,
      hasScreenshot: Boolean(surface.screenshot),
      sourceHints: [...(surface.sourceHints ?? [])],
    })),
    edges: (manifest.edges ?? []).map(edge => ({
      source: edge.source,
      target: edge.target,
      action: edge.action,
      type: edge.type,
      personas: [...(edge.personas ?? [])],
    })),
    flows: (manifest.flows ?? []).map(flow => ({
      name: flow.name,
      steps: [...flow.steps],
    })),
  };
}

function buildWorkflowInspectContract(
  payload: WorkflowInspectPayload,
  manifestPath: string,
  generatedAt?: string
): AgentContract<'workflow-inspect', WorkflowInspectPayload> {
  return createAgentContract({
    kind: 'workflow-inspect',
    generatedAt,
    summary: {
      app: payload.name,
      valid: payload.valid,
      nodeCount: payload.nodes.length + payload.surfaces.length,
      edgeCount: payload.edges.length,
      flowCount: payload.flows.length,
      authStateCount: payload.authStates.length,
    },
    data: payload,
    artifacts: [],
    nextActions: [
      {
        label: 'Render focused context',
        command: `nav-map context ${shellArg(manifestPath)} --format json --contract`,
        reason: 'Load route-level context after validating the manifest shape.',
        safety: 'read-only',
      },
      {
        label: 'Generate workflow graph',
        command: `nav-map workflow ${shellArg(manifestPath)} -o public/nav-map.json`,
        reason: 'Generate the visual graph once the manifest contract looks correct.',
        safety: 'writes-local-files',
      },
    ],
  });
}

function resolveWorkflowScreenshotStorageState(
  manifest: WorkflowManifest,
  authStateId?: string
): string | undefined {
  if (!authStateId) return undefined;

  const state = findAuthState(manifest, authStateId);
  if (!state) {
    throw new Error(`Unknown auth state: ${authStateId}`);
  }
  if (state.kind !== 'storage-state') {
    return undefined;
  }
  if (!state.storageStatePath) {
    throw new Error(`Auth state "${authStateId}" has no storageStatePath`);
  }

  return path.resolve(state.storageStatePath);
}

function resolveOptionalRouteTemplate(route: string, variables: Record<string, string>): string {
  return route.replace(/\[([^\]]+)\]/g, (match, key: string) => variables[key] ?? match);
}

function shellArg(value: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}
