import fs from 'node:fs';
import path from 'node:path';
import { routeToId, validateWorkflowManifest } from '@neonwatty/nav-map/workflow';
import { createAgentContract, type AgentContract } from './agent-contract.js';

export type ContextFormat = 'markdown' | 'json';

export interface ContextOptions {
  format: ContextFormat;
  focus: string[];
  section?: string[];
  persona?: string[];
  auth?: string[];
  health?: string[];
  evidence?: string[];
  authState?: string;
  lineBudget: number;
  manifestPath?: string;
}

export interface WorkflowContextRedirect {
  when?: string;
  to: string;
}

export interface WorkflowContextExpectations {
  [key: string]: unknown;
  selectors?: readonly string[];
  text?: readonly string[];
  signedOutRedirect?: string;
  finalUrl?: string;
  status?: number;
}

export interface WorkflowContextNode {
  id?: string;
  route: string;
  label: string;
  section?: string;
  purpose?: string;
  authRequirement?: string;
  personas?: readonly string[];
  expectedRedirects?: readonly WorkflowContextRedirect[];
  expectations?: WorkflowContextExpectations;
  screenshot?: string;
  health?: string | { status?: string; [key: string]: unknown };
  inspect?: unknown;
  sourceHints?: readonly string[];
}

export interface WorkflowContextSurface {
  id: string;
  label: string;
  type: string;
  section?: string;
  purpose?: string;
  screenshot?: string;
  sourceHints?: readonly string[];
  preview?: {
    liveUrl?: string;
    liveMode?: string;
    liveStatus?: string;
    limitations?: readonly string[];
  };
}

export interface WorkflowContextFlow {
  name: string;
  steps: readonly string[];
  partial?: boolean;
}

export interface WorkflowContextManifest {
  name: string;
  baseUrl?: string;
  nodes: readonly WorkflowContextNode[];
  surfaces?: readonly WorkflowContextSurface[];
  flows?: readonly WorkflowContextFlow[];
}

interface ContextRoute {
  id?: string;
  route: string;
  label: string;
  section?: string;
  purpose?: string;
  authRequirement?: string;
  personas: string[];
  expectedRedirects: WorkflowContextRedirect[];
  expectations?: WorkflowContextExpectations;
  health?: string;
  evidence: string[];
  sourceHints: string[];
}

interface ContextSurface {
  id: string;
  label: string;
  surfaceType: string;
  artifactKind: 'prototype' | 'mockup';
  section?: string;
  purpose?: string;
  screenshot?: string;
  sourceHints: string[];
  livePreview?: {
    liveUrl?: string;
    liveMode?: string;
    liveStatus?: string;
    limitations: string[];
  };
  evidence: string[];
}

interface ContextPayload {
  name: string;
  authState?: string;
  baseUrl?: string;
  routes: ContextRoute[];
  surfaces: ContextSurface[];
  flows: WorkflowContextFlow[];
}

const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(api[_-]?key|secret|password|token|private[_-]?key|database[_-]?url|authorization|webhook|cookie|cookies|local[_-]?storage)($|[_-])/i;
const SENSITIVE_VALUE_PATTERNS = [
  /\.nav-map\/auth/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /postgres(?:ql)?:\/\//i,
  /whsec_/i,
  /bearer\s+\S+/i,
  /\b(?:access_token|refresh_token|id_token)\s*[=:]\s*\S+/i,
  /[?&](?:access_token|refresh_token|id_token)=/i,
  /\b(?:api[_-]?key|secret|password|token|database_url|env|localStorage)\s*[=:]\s*\S+/i,
  /\b(?:set-cookie|cookie)\s*:/i,
  /\bcookie\s*=\s*\S+/i,
];
const FILTER_KEYS = ['section', 'persona', 'auth', 'health', 'evidence'] as const;
type ContextFilterKey = (typeof FILTER_KEYS)[number];
const ALLOWED_HEALTH_FILTERS = ['healthy', 'warning', 'failing', 'unchecked', 'unknown'] as const;
const ALLOWED_EVIDENCE_FILTERS = ['screenshot', 'inspect', 'source-hint', 'redirect'] as const;

export function loadWorkflowManifest(filePath: string): WorkflowContextManifest {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8')) as unknown;
  const validation = validateWorkflowManifest(manifest);
  if (!validation.valid) {
    const message = validation.errors
      .map(error => `${error.field}: ${error.message}`)
      .join('\n  - ');
    throw new Error(`Invalid workflow manifest:\n  - ${message}`);
  }

  return manifest as WorkflowContextManifest;
}

export function renderWorkflowContext(
  manifest: WorkflowContextManifest,
  options: ContextOptions
): string {
  const payload = buildWorkflowContextPayload(manifest, options);

  if (options.format === 'json') {
    return JSON.stringify(payload, null, 2);
  }

  return renderWorkflowContextMarkdown(payload, options.lineBudget);
}

export function renderWorkflowContextContract(
  manifest: WorkflowContextManifest,
  options: ContextOptions
): string {
  const payload = buildWorkflowContextPayload(manifest, options);
  const filters = contextFilterSummary(options);
  const contract: AgentContract<'workflow-context', ContextPayload> = createAgentContract({
    kind: 'workflow-context',
    summary: {
      app: payload.name,
      authState: payload.authState ?? null,
      routeCount: payload.routes.length,
      surfaceCount: payload.surfaces.length,
      flowCount: payload.flows.length,
      focus: options.focus,
      ...(Object.keys(filters).length ? { filters } : {}),
    },
    data: payload,
    artifacts: [],
    nextActions: contextNextActions(payload, options.manifestPath),
  });

  return JSON.stringify(contract, null, 2);
}

export function buildWorkflowContextPayload(
  manifest: WorkflowContextManifest,
  options: ContextOptions
): ContextPayload {
  const filters = normalizeContextFilters(options);
  const focusedNodes = manifest.nodes.filter(node => {
    const nodeId = getNodeId(node);
    const focusMatches =
      options.focus.length === 0 ||
      options.focus.includes(node.section ?? '') ||
      options.focus.includes(nodeId);
    return focusMatches && matchesContextFilters(node, filters);
  });
  const focusedIds = new Set(focusedNodes.map(node => getNodeId(node)));
  const focusedSurfaces = (manifest.surfaces ?? []).filter(surface => {
    const focusMatches =
      options.focus.length === 0 ||
      options.focus.includes(surface.section ?? '') ||
      options.focus.includes(surface.id);
    return focusMatches && matchesSurfaceContextFilters(surface, filters);
  });
  for (const surface of focusedSurfaces) focusedIds.add(surface.id);
  const focusedFlows = (manifest.flows ?? [])
    .map(flow => ({
      ...flow,
      steps: flow.steps.filter(step => focusedIds.has(step)),
    }))
    .filter(flow => flow.steps.length > 0);
  const payload = redactContextValue({
    name: manifest.name,
    authState: options.authState,
    baseUrl: manifest.baseUrl,
    routes: focusedNodes.map(node => ({
      id: getNodeId(node),
      route: node.route,
      label: node.label,
      section: node.section,
      purpose: node.purpose,
      authRequirement: node.authRequirement,
      personas: node.personas ?? [],
      expectedRedirects: node.expectedRedirects ?? [],
      expectations: node.expectations,
      health: getHealthStatus(node),
      evidence: getEvidenceKinds(node),
      sourceHints: node.sourceHints ?? [],
    })),
    surfaces: focusedSurfaces.map(surface => ({
      id: surface.id,
      label: surface.label,
      surfaceType: surface.type,
      artifactKind: surface.type === 'html-mockup' ? 'mockup' : 'prototype',
      section: surface.section,
      purpose: surface.purpose,
      screenshot: surface.screenshot,
      sourceHints: surface.sourceHints ?? [],
      ...(surface.preview
        ? {
            livePreview: {
              liveUrl: surface.preview.liveUrl,
              liveMode: surface.preview.liveMode,
              liveStatus: surface.preview.liveStatus,
              limitations: [...(surface.preview.limitations ?? [])],
            },
          }
        : {}),
      evidence: getSurfaceEvidenceKinds(surface),
    })),
    flows: focusedFlows,
  }) as ContextPayload;

  return payload;
}

function renderWorkflowContextMarkdown(payload: ContextPayload, lineBudget: number): string {
  const safeLineBudget = Number.isFinite(lineBudget) ? Math.max(1, Math.floor(lineBudget)) : 250;
  const lines = [
    `# ${payload.name} Agent Context`,
    '',
    payload.authState ? `Auth state: \`${payload.authState}\`` : 'Auth state: not specified',
    '',
    '## Routes',
    ...payload.routes.flatMap(route => routeLines(route)),
    '',
    '## Surfaces',
    ...payload.surfaces.flatMap(surface => surfaceLines(surface)),
    '',
    '## Flows',
    ...payload.flows.map(flow => `- ${flow.name}: ${flow.steps.join(' -> ')}`),
  ];

  return lines.slice(0, safeLineBudget).join('\n');
}

export function writeContextOutput(output: string, outputPath?: string): void {
  if (!outputPath) {
    process.stdout.write(output);
    return;
  }

  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, output);
}

function routeLines(route: ContextRoute): string[] {
  return [
    '',
    `### ${route.id ?? route.route}`,
    `- Route: \`${route.route}\``,
    `- Label: ${route.label}`,
    `- Section: ${route.section ?? 'uncategorized'}`,
    `- Purpose: ${route.purpose ?? 'No purpose recorded'}`,
    `- Auth: ${route.authRequirement ?? 'unspecified'}`,
    `- Personas: ${route.personas.join(', ') || 'none'}`,
    ...(route.expectedRedirects.length
      ? [
          `- Redirects: ${route.expectedRedirects
            .map(redirect => `${redirect.when ? `${redirect.when} -> ` : ''}${redirect.to}`)
            .join('; ')}`,
        ]
      : []),
    ...(route.expectations?.selectors?.length
      ? [`- Expected selectors: ${route.expectations.selectors.join('; ')}`]
      : []),
    ...(route.expectations?.text?.length
      ? [`- Expected text: ${route.expectations.text.join('; ')}`]
      : []),
    ...(route.expectations?.signedOutRedirect
      ? [`- Signed-out redirect: ${route.expectations.signedOutRedirect}`]
      : []),
    ...(route.expectations?.finalUrl ? [`- Final URL: ${route.expectations.finalUrl}`] : []),
    ...(route.expectations?.status ? [`- Expected status: ${route.expectations.status}`] : []),
    ...(route.health ? [`- Health: ${route.health}`] : []),
    `- Evidence: ${route.evidence.join(', ') || 'none'}`,
    ...(route.sourceHints.length ? [`- Source hints: ${route.sourceHints.join(', ')}`] : []),
  ];
}

function surfaceLines(surface: ContextSurface): string[] {
  return [
    '',
    `### ${surface.id}`,
    `- Label: ${surface.label}`,
    `- Artifact: ${surface.artifactKind}`,
    `- Surface type: ${surface.surfaceType}`,
    `- Section: ${surface.section ?? 'uncategorized'}`,
    `- Purpose: ${surface.purpose ?? 'No purpose recorded'}`,
    ...(surface.screenshot ? [`- Screenshot: ${surface.screenshot}`] : []),
    ...(surface.livePreview?.liveUrl ? [`- Live target: ${surface.livePreview.liveUrl}`] : []),
    ...(surface.livePreview?.liveMode ? [`- Live mode: ${surface.livePreview.liveMode}`] : []),
    ...(surface.livePreview?.liveStatus
      ? [`- Live status: ${surface.livePreview.liveStatus}`]
      : []),
    ...(surface.livePreview?.limitations.length
      ? [`- Limitations: ${surface.livePreview.limitations.join('; ')}`]
      : []),
    `- Evidence: ${surface.evidence.join(', ') || 'none'}`,
    ...(surface.sourceHints.length ? [`- Source hints: ${surface.sourceHints.join(', ')}`] : []),
  ];
}

function getNodeId(node: WorkflowContextNode): string {
  return node.id ?? routeToId(node.route);
}

function normalizeContextFilters(options: ContextOptions): Record<ContextFilterKey, string[]> {
  const filters = Object.fromEntries(
    FILTER_KEYS.map(key => [key, uniqueList(options[key] ?? [])])
  ) as Record<ContextFilterKey, string[]>;

  validateKnownFilterValues('health', filters.health, ALLOWED_HEALTH_FILTERS);
  validateKnownFilterValues('evidence', filters.evidence, ALLOWED_EVIDENCE_FILTERS);

  return filters;
}

function contextFilterSummary(
  options: ContextOptions
): Partial<Record<ContextFilterKey, string[]>> {
  return Object.fromEntries(
    Object.entries(normalizeContextFilters(options)).filter(([, values]) => values.length > 0)
  ) as Partial<Record<ContextFilterKey, string[]>>;
}

function matchesContextFilters(
  node: WorkflowContextNode,
  filters: Record<ContextFilterKey, string[]>
): boolean {
  return (
    matchesAny(filters.section, [node.section]) &&
    matchesAny(filters.persona, node.personas ?? []) &&
    matchesAny(filters.auth, [node.authRequirement]) &&
    matchesAny(filters.health, [getHealthStatus(node)]) &&
    matchesAny(filters.evidence, getEvidenceKinds(node))
  );
}

function matchesSurfaceContextFilters(
  surface: WorkflowContextSurface,
  filters: Record<ContextFilterKey, string[]>
): boolean {
  if (filters.persona.length > 0 || filters.auth.length > 0 || filters.health.length > 0) {
    return false;
  }
  return (
    matchesAny(filters.section, [surface.section]) &&
    matchesAny(filters.evidence, getSurfaceEvidenceKinds(surface))
  );
}

function matchesAny(filters: string[], values: readonly (string | undefined)[]): boolean {
  if (filters.length === 0) return true;
  const valueSet = new Set(values.filter((value): value is string => Boolean(value)));
  return filters.some(filter => valueSet.has(filter));
}

function getHealthStatus(node: WorkflowContextNode): string | undefined {
  if (typeof node.health === 'string') return node.health;
  return typeof node.health?.status === 'string' ? node.health.status : undefined;
}

function getEvidenceKinds(node: WorkflowContextNode): string[] {
  return [
    ...(node.screenshot ? ['screenshot'] : []),
    ...(Object.prototype.hasOwnProperty.call(node, 'inspect') ? ['inspect'] : []),
    ...(node.sourceHints?.length ? ['source-hint'] : []),
    ...(node.expectedRedirects?.length ? ['redirect'] : []),
  ];
}

function getSurfaceEvidenceKinds(surface: WorkflowContextSurface): string[] {
  return [
    ...(surface.screenshot ? ['screenshot'] : []),
    ...(surface.preview?.liveUrl ? ['inspect'] : []),
    ...(surface.sourceHints?.length ? ['source-hint'] : []),
  ];
}

function uniqueList(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .flatMap(item => item.split(','))
        .map(item => item.trim())
        .filter(Boolean)
    ),
  ];
}

function validateKnownFilterValues(
  key: 'health' | 'evidence',
  values: readonly string[],
  allowed: readonly string[]
): void {
  const invalid = values.filter(value => !allowed.includes(value));
  if (invalid.length > 0) {
    throw new Error(`--${key} must be one of: ${allowed.join(', ')}`);
  }
}

function contextNextActions(
  payload: ContextPayload,
  manifestPath = '<manifest>'
): {
  label: string;
  command: string;
  reason: string;
  safety: 'read-only' | 'writes-local-files';
}[] {
  const baseUrl = payload.baseUrl ?? '<base-url>';
  const auth = payload.authState ? ` --auth-state ${shellArg(payload.authState)}` : '';
  const focus =
    payload.routes.length > 0
      ? ` --nodes ${shellArg(payload.routes.map(route => route.id ?? route.route).join(','))}`
      : '';

  return [
    {
      label: 'Probe focused routes',
      command: `nav-map probe ${shellArg(manifestPath)} --base-url ${shellArg(baseUrl)}${auth}${focus}`,
      reason:
        'Collect expected-vs-observed route evidence for this context slice. Prototype/mockup surfaces remain context artifacts unless they have live targets.',
      safety: 'writes-local-files',
    },
    {
      label: 'Generate screenshot-backed graph',
      command: `nav-map workflow ${shellArg(manifestPath)} --base-url ${shellArg(baseUrl)}${auth} -o public/nav-map.json`,
      reason: 'Refresh the visual workflow graph after validating route and surface context.',
      safety: 'writes-local-files',
    },
  ];
}

function shellArg(value: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function redactContextValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return isSensitiveValue(value) ? '[redacted]' : value;
  }
  if (Array.isArray(value)) {
    return value.map(item => redactContextValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        isSensitiveKey(key) ? '[redacted]' : redactContextValue(nestedValue),
      ])
    );
  }
  return value;
}

function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return SENSITIVE_KEY_PATTERN.test(`_${normalized}_`);
}
