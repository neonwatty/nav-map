import type {
  NavMapEdge,
  NavMapExpectedRedirect,
  NavMapFlow,
  NavMapGraph,
  NavMapGroup,
  NavMapHealthStatus,
  NavMapInspectHint,
  NavMapNode,
  NavMapPrototypeSurfaceType,
  NavMapWorkflowLayout,
  NavMapWorkflowHealth,
  NavMapWorkflowMetadata,
  NavMapWorkflowNodeExpectations,
  ViewMode,
} from './types';

export interface WorkflowManifestPersona {
  id: string;
  label: string;
  description?: string;
}

export interface WorkflowManifestSection {
  id: string;
  label: string;
  color?: string;
  routePrefix?: string;
}

export type WorkflowAuthStateKind = 'anonymous' | 'storage-state' | 'setup-command';

export interface WorkflowAuthStateVerify {
  route: string;
  expectStatus?: number;
  expectText?: string;
  expectSelector?: string;
  expectJson?: Record<string, unknown>;
}

export interface WorkflowAuthStateCapture {
  mode: 'headed-login' | 'headed-oauth';
  startRoute: string;
  successRoute: string;
  successSelector?: string;
  successText?: string;
}

export interface WorkflowAuthState {
  id: string;
  label?: string;
  kind: WorkflowAuthStateKind;
  storageStatePath?: string;
  setupCommand?: string;
  capture?: WorkflowAuthStateCapture;
  verify?: WorkflowAuthStateVerify;
}

export type WorkflowNodeExpectations = NavMapWorkflowNodeExpectations;

export type WorkflowRouteVariables = Record<string, string>;

export interface WorkflowManifestNode {
  id?: string;
  route: string;
  label: string;
  section?: string;
  purpose?: string;
  personas?: string[];
  authRequirement?: string;
  expectedRedirects?: NavMapExpectedRedirect[];
  health?: NavMapWorkflowHealth | NavMapHealthStatus;
  inspect?: NavMapInspectHint;
  screenshot?: string;
  filePath?: string;
  tags?: string[];
  expectations?: WorkflowNodeExpectations;
  sourceHints?: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowManifestSurface {
  id: string;
  label: string;
  type: NavMapPrototypeSurfaceType;
  section?: string;
  purpose?: string;
  screenshot?: string;
  sourceHints?: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowManifestEdge {
  id?: string;
  source: string;
  target: string;
  action?: string;
  label?: string;
  type?: NavMapEdge['type'];
  discovery?: NavMapEdge['discovery'];
  personas?: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowManifestFlow {
  name: string;
  steps: string[];
  partial?: boolean;
}

export type WorkflowManifestLayout = NavMapWorkflowLayout;

export interface WorkflowManifest {
  version: 'workflow-atlas/1.0';
  name: string;
  baseUrl?: string;
  description?: string;
  generatedAt?: string;
  generatedBy?: NavMapGraph['meta']['generatedBy'];
  layout?: WorkflowManifestLayout;
  personas?: WorkflowManifestPersona[];
  sections?: WorkflowManifestSection[];
  authStates?: WorkflowAuthState[];
  routeVariables?: WorkflowRouteVariables;
  nodes: WorkflowManifestNode[];
  surfaces?: WorkflowManifestSurface[];
  edges?: WorkflowManifestEdge[];
  flows?: WorkflowManifestFlow[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowManifestValidationError {
  field: string;
  message: string;
}

export interface WorkflowManifestValidationResult {
  valid: boolean;
  errors: WorkflowManifestValidationError[];
}

export interface WorkflowManifestToGraphOptions {
  generatedAt?: string;
  generatedBy?: NavMapGraph['meta']['generatedBy'];
  screenshotOverrides?: Record<string, string>;
}

export function validateWorkflowManifest(manifest: unknown): WorkflowManifestValidationResult {
  const errors: WorkflowManifestValidationError[] = [];
  const record = asRecord(manifest);

  if (!record) {
    return {
      valid: false,
      errors: [{ field: 'manifest', message: 'Manifest must be a non-null object' }],
    };
  }

  if (record.version !== 'workflow-atlas/1.0') {
    errors.push({
      field: 'version',
      message: 'version must be "workflow-atlas/1.0"',
    });
  }

  if (!isNonEmptyString(record.name)) {
    errors.push({ field: 'name', message: 'name must be a non-empty string' });
  }

  if (!Array.isArray(record.nodes) || record.nodes.length === 0) {
    errors.push({ field: 'nodes', message: 'nodes must be a non-empty array' });
  }

  validateAuthStates(record.authStates, errors);
  validateRouteVariables(record.routeVariables, errors);
  validateLayout(record.layout, errors);

  const nodeIds = new Set<string>();
  if (Array.isArray(record.nodes)) {
    record.nodes.forEach((node, index) => {
      const nodeRecord = asRecord(node);
      if (!nodeRecord) {
        errors.push({ field: `nodes.${index}`, message: 'node must be an object' });
        return;
      }

      if (!isNonEmptyString(nodeRecord.route)) {
        errors.push({ field: `nodes.${index}.route`, message: 'route must be a non-empty string' });
      } else if (!nodeRecord.route.startsWith('/')) {
        errors.push({ field: `nodes.${index}.route`, message: 'route must start with "/"' });
      }

      if (!isNonEmptyString(nodeRecord.label)) {
        errors.push({ field: `nodes.${index}.label`, message: 'label must be a non-empty string' });
      }

      validateNodeExpectations(nodeRecord.expectations, `nodes.${index}.expectations`, errors);
      if (nodeRecord.sourceHints !== undefined && !isStringArray(nodeRecord.sourceHints)) {
        errors.push({
          field: `nodes.${index}.sourceHints`,
          message: 'sourceHints must be an array of strings',
        });
      }

      const id = isNonEmptyString(nodeRecord.id)
        ? nodeRecord.id
        : isNonEmptyString(nodeRecord.route)
          ? routeToId(nodeRecord.route)
          : '';

      if (id) {
        if (nodeIds.has(id)) {
          errors.push({ field: `nodes.${index}.id`, message: `duplicate node id "${id}"` });
        }
        nodeIds.add(id);
      }
    });
  }
  validateSurfaces(record.surfaces, nodeIds, errors);

  if (Array.isArray(record.edges)) {
    record.edges.forEach((edge, index) => {
      const edgeRecord = asRecord(edge);
      if (!edgeRecord) {
        errors.push({ field: `edges.${index}`, message: 'edge must be an object' });
        return;
      }

      if (!isNonEmptyString(edgeRecord.source)) {
        errors.push({
          field: `edges.${index}.source`,
          message: 'source must be a non-empty string',
        });
      } else if (!nodeIds.has(edgeRecord.source)) {
        errors.push({
          field: `edges.${index}.source`,
          message: `source references unknown node "${edgeRecord.source}"`,
        });
      }

      if (!isNonEmptyString(edgeRecord.target)) {
        errors.push({
          field: `edges.${index}.target`,
          message: 'target must be a non-empty string',
        });
      } else if (!nodeIds.has(edgeRecord.target)) {
        errors.push({
          field: `edges.${index}.target`,
          message: `target references unknown node "${edgeRecord.target}"`,
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function workflowManifestToGraph(
  manifest: WorkflowManifest,
  options: WorkflowManifestToGraphOptions = {}
): NavMapGraph {
  const validation = validateWorkflowManifest(manifest);
  if (!validation.valid) {
    const message = validation.errors.map(error => `${error.field}: ${error.message}`).join('; ');
    throw new Error(`Invalid workflow manifest: ${message}`);
  }

  const sectionMap = new Map<string, WorkflowManifestSection>();
  for (const section of manifest.sections ?? []) {
    sectionMap.set(section.id, section);
  }

  const authStateKinds = new Map(
    manifest.authStates?.map(authState => [authState.id, authState.kind])
  );
  const nodeSectionIds = new Set<string>();
  const routeNodes = manifest.nodes.map(node => {
    const id = node.id ?? routeToId(node.route);
    const group = node.section ?? inferSectionId(node.route);
    nodeSectionIds.add(group);
    const health =
      typeof node.health === 'string'
        ? ({ status: node.health } satisfies NavMapWorkflowHealth)
        : node.health;
    const metadata: NavMapWorkflowMetadata = {
      ...(node.metadata ?? {}),
      artifactKind:
        (node.metadata?.artifactKind as NavMapWorkflowMetadata['artifactKind']) ?? 'app',
      ...(node.purpose ? { purpose: node.purpose } : {}),
      section: group,
      ...(node.personas ? { personas: node.personas } : {}),
      ...(node.authRequirement ? { authRequirement: node.authRequirement } : {}),
      ...resolveAuthRequiredMetadata(node, authStateKinds),
      ...(node.expectedRedirects ? { expectedRedirects: node.expectedRedirects } : {}),
      ...(health ? { health } : {}),
      ...(node.inspect ? { inspect: node.inspect } : {}),
      ...(node.tags ? { tags: node.tags } : {}),
      ...(node.expectations ? { expectations: node.expectations } : {}),
      ...(node.sourceHints ? { sourceHints: node.sourceHints } : {}),
    };

    return {
      id,
      route: node.route,
      label: node.label,
      group,
      ...(node.screenshot || options.screenshotOverrides?.[id]
        ? { screenshot: options.screenshotOverrides?.[id] ?? node.screenshot }
        : {}),
      ...(node.filePath ? { filePath: node.filePath } : {}),
      metadata,
    } satisfies NavMapNode;
  });
  const surfaceNodes = (manifest.surfaces ?? []).map(surface => {
    const group = surface.section ?? 'prototype';
    nodeSectionIds.add(group);
    const metadata: NavMapWorkflowMetadata = {
      ...(surface.metadata ?? {}),
      kind: 'prototype-surface',
      surfaceType: surface.type,
      artifactKind:
        (surface.metadata?.artifactKind as NavMapWorkflowMetadata['artifactKind']) ??
        (surface.type === 'html-mockup' ? 'mockup' : 'prototype'),
      section: group,
      ...(surface.purpose ? { purpose: surface.purpose } : {}),
      ...(surface.sourceHints ? { sourceHints: surface.sourceHints } : {}),
    };

    return {
      id: surface.id,
      route: `prototype://${surface.id}`,
      label: surface.label,
      group,
      ...(surface.screenshot ? { screenshot: surface.screenshot } : {}),
      metadata,
    } satisfies NavMapNode;
  });
  const nodes = [...routeNodes, ...surfaceNodes];

  const groups = buildGroups({
    sectionMap,
    nodeSectionIds,
    sectionOrder: manifest.layout?.sectionOrder,
  });

  const edges = (manifest.edges ?? []).map((edge, index) => {
    const type = edge.type ?? 'link';
    const label = edge.label ?? edge.action;
    return {
      id: edge.id ?? `${edge.source}-to-${edge.target}-${index + 1}`,
      source: edge.source,
      target: edge.target,
      type,
      ...(label ? { label } : {}),
      ...(edge.action ? { action: edge.action } : {}),
      ...(edge.discovery ? { discovery: edge.discovery } : {}),
      ...(edge.personas ? { personas: edge.personas } : {}),
      ...(edge.metadata ? { metadata: edge.metadata } : {}),
    } satisfies NavMapEdge;
  });

  const flows: NavMapFlow[] | undefined = manifest.flows?.map(flow => ({
    name: flow.name,
    steps: flow.steps,
    ...(flow.partial !== undefined ? { partial: flow.partial } : {}),
  }));
  const hasWorkflowMetadata = Boolean(
    manifest.metadata ||
    manifest.description ||
    manifest.layout ||
    manifest.personas ||
    manifest.authStates ||
    manifest.routeVariables
  );

  return {
    version: '1.0',
    meta: {
      name: manifest.name,
      ...(manifest.baseUrl ? { baseUrl: manifest.baseUrl } : {}),
      generatedAt: options.generatedAt ?? manifest.generatedAt ?? new Date().toISOString(),
      generatedBy: options.generatedBy ?? manifest.generatedBy ?? 'manual',
      framework: 'generic',
      ...(hasWorkflowMetadata
        ? {
            workflow: {
              ...(manifest.metadata ?? {}),
              ...(manifest.description ? { description: manifest.description } : {}),
              ...(manifest.layout ? { layout: manifest.layout } : {}),
              ...(manifest.personas ? { personas: manifest.personas } : {}),
              ...(manifest.authStates ? { authStates: manifest.authStates } : {}),
              ...(manifest.routeVariables ? { routeVariables: manifest.routeVariables } : {}),
            },
          }
        : {}),
    },
    nodes,
    edges,
    groups,
    ...(flows ? { flows } : {}),
  };
}

export function routeToId(route: string): string {
  const trimmed = route.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return 'index';
  return trimmed
    .replace(/\[\.\.\.(.+?)\]/g, '$1')
    .replace(/\[(.+?)\]/g, '$1')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function inferSectionId(route: string): string {
  const [firstSegment] = route.replace(/^\/+/, '').split('/');
  return firstSegment ? routeToId(firstSegment) : 'root';
}

function buildGroups(options: {
  sectionMap: Map<string, WorkflowManifestSection>;
  nodeSectionIds: Set<string>;
  sectionOrder?: string[];
}): NavMapGroup[] {
  const ids = new Set([...options.sectionMap.keys(), ...options.nodeSectionIds]);
  const order = new Map(options.sectionOrder?.map((id, index) => [id, index]) ?? []);
  return Array.from(ids)
    .sort((a, b) => {
      const aRank = order.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bRank = order.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return a.localeCompare(b);
    })
    .map(id => {
      const section = options.sectionMap.get(id);
      return {
        id,
        label: section?.label ?? titleCase(id),
        ...(section?.color ? { color: section.color } : {}),
        ...(section?.routePrefix ? { routePrefix: section.routePrefix } : {}),
      };
    });
}

function validateAuthStates(value: unknown, errors: WorkflowManifestValidationError[]): void {
  if (value === undefined) return;

  if (!Array.isArray(value)) {
    errors.push({ field: 'authStates', message: 'authStates must be an array of objects' });
    return;
  }

  const authStateIds = new Set<string>();
  value.forEach((authState, index) => {
    const authStateRecord = asRecord(authState);
    if (!authStateRecord) {
      errors.push({ field: `authStates.${index}`, message: 'authState must be an object' });
      return;
    }

    if (!isNonEmptyString(authStateRecord.id)) {
      errors.push({ field: `authStates.${index}.id`, message: 'id must be a non-empty string' });
    } else if (authStateIds.has(authStateRecord.id)) {
      errors.push({
        field: `authStates.${index}.id`,
        message: `duplicate authState id "${authStateRecord.id}"`,
      });
    } else {
      authStateIds.add(authStateRecord.id);
    }

    if (!isWorkflowAuthStateKind(authStateRecord.kind)) {
      errors.push({
        field: `authStates.${index}.kind`,
        message: 'kind must be anonymous, storage-state, or setup-command',
      });
    } else {
      if (
        authStateRecord.kind === 'storage-state' &&
        !isNonEmptyString(authStateRecord.storageStatePath)
      ) {
        errors.push({
          field: `authStates.${index}.storageStatePath`,
          message: 'storage-state auth states require storageStatePath',
        });
      }

      if (
        authStateRecord.kind === 'setup-command' &&
        !isNonEmptyString(authStateRecord.setupCommand)
      ) {
        errors.push({
          field: `authStates.${index}.setupCommand`,
          message: 'setup-command auth states require setupCommand',
        });
      }
    }

    validateAuthStateVerify(authStateRecord.verify, `authStates.${index}.verify`, errors);
    validateAuthStateCapture(authStateRecord.capture, `authStates.${index}.capture`, errors);
  });
}

function validateAuthStateVerify(
  value: unknown,
  field: string,
  errors: WorkflowManifestValidationError[]
): void {
  if (value === undefined) return;

  const verify = asRecord(value);
  if (!verify) {
    errors.push({ field, message: 'verify must be an object' });
    return;
  }

  validateRouteString(verify.route, `${field}.route`, 'route', errors);

  if (verify.expectStatus !== undefined && typeof verify.expectStatus !== 'number') {
    errors.push({ field: `${field}.expectStatus`, message: 'expectStatus must be a number' });
  }
  if (verify.expectText !== undefined && typeof verify.expectText !== 'string') {
    errors.push({ field: `${field}.expectText`, message: 'expectText must be a string' });
  }
  if (verify.expectSelector !== undefined && typeof verify.expectSelector !== 'string') {
    errors.push({ field: `${field}.expectSelector`, message: 'expectSelector must be a string' });
  }
  if (verify.expectJson !== undefined && !asRecord(verify.expectJson)) {
    errors.push({ field: `${field}.expectJson`, message: 'expectJson must be an object' });
  }
}

function validateAuthStateCapture(
  value: unknown,
  field: string,
  errors: WorkflowManifestValidationError[]
): void {
  if (value === undefined) return;

  const capture = asRecord(value);
  if (!capture) {
    errors.push({ field, message: 'capture must be an object' });
    return;
  }

  if (capture.mode !== 'headed-login' && capture.mode !== 'headed-oauth') {
    errors.push({ field: `${field}.mode`, message: 'mode must be headed-login or headed-oauth' });
  }

  validateRouteString(capture.startRoute, `${field}.startRoute`, 'startRoute', errors);
  validateRouteString(capture.successRoute, `${field}.successRoute`, 'successRoute', errors);

  if (capture.successSelector !== undefined && typeof capture.successSelector !== 'string') {
    errors.push({ field: `${field}.successSelector`, message: 'successSelector must be a string' });
  }
  if (capture.successText !== undefined && typeof capture.successText !== 'string') {
    errors.push({ field: `${field}.successText`, message: 'successText must be a string' });
  }
}

function validateRouteVariables(value: unknown, errors: WorkflowManifestValidationError[]): void {
  if (value === undefined) return;

  const routeVariables = asRecord(value);
  if (!routeVariables) {
    errors.push({ field: 'routeVariables', message: 'routeVariables must be an object' });
    return;
  }

  for (const [key, routeVariableValue] of Object.entries(routeVariables)) {
    if (typeof routeVariableValue !== 'string') {
      errors.push({
        field: `routeVariables.${key}`,
        message: 'route variable values must be strings',
      });
    }
  }
}

function validateLayout(value: unknown, errors: WorkflowManifestValidationError[]): void {
  if (value === undefined) return;

  const layout = asRecord(value);
  if (!layout) {
    errors.push({ field: 'layout', message: 'layout must be an object' });
    return;
  }

  if (layout.defaultViewMode !== undefined && !isWorkflowViewMode(layout.defaultViewMode)) {
    errors.push({
      field: 'layout.defaultViewMode',
      message: 'defaultViewMode must be hierarchy, map, flow, or tree',
    });
  }
  if (layout.defaultTreeRootId !== undefined && !isNonEmptyString(layout.defaultTreeRootId)) {
    errors.push({
      field: 'layout.defaultTreeRootId',
      message: 'defaultTreeRootId must be a non-empty string',
    });
  }
  if (layout.sectionOrder !== undefined && !isStringArray(layout.sectionOrder)) {
    errors.push({
      field: 'layout.sectionOrder',
      message: 'sectionOrder must be an array of strings',
    });
  }
}

function validateSurfaces(
  value: unknown,
  nodeIds: Set<string>,
  errors: WorkflowManifestValidationError[]
): void {
  if (value === undefined) return;

  if (!Array.isArray(value)) {
    errors.push({ field: 'surfaces', message: 'surfaces must be an array of objects' });
    return;
  }

  value.forEach((surface, index) => {
    const surfaceRecord = asRecord(surface);
    if (!surfaceRecord) {
      errors.push({ field: `surfaces.${index}`, message: 'surface must be an object' });
      return;
    }

    if (!isNonEmptyString(surfaceRecord.id)) {
      errors.push({ field: `surfaces.${index}.id`, message: 'id must be a non-empty string' });
    } else if (nodeIds.has(surfaceRecord.id)) {
      errors.push({
        field: `surfaces.${index}.id`,
        message: `duplicate node id "${surfaceRecord.id}"`,
      });
    } else {
      nodeIds.add(surfaceRecord.id);
    }

    if (!isNonEmptyString(surfaceRecord.label)) {
      errors.push({
        field: `surfaces.${index}.label`,
        message: 'label must be a non-empty string',
      });
    }
    if (!isPrototypeSurfaceType(surfaceRecord.type)) {
      errors.push({
        field: `surfaces.${index}.type`,
        message:
          'type must be screenshot, generated-image, html-mockup, video, keyframe, component, or concept-screen',
      });
    }
    if (surfaceRecord.sourceHints !== undefined && !isStringArray(surfaceRecord.sourceHints)) {
      errors.push({
        field: `surfaces.${index}.sourceHints`,
        message: 'sourceHints must be an array of strings',
      });
    }
  });
}

function validateNodeExpectations(
  value: unknown,
  field: string,
  errors: WorkflowManifestValidationError[]
): void {
  if (value === undefined) return;

  const expectations = asRecord(value);
  if (!expectations) {
    errors.push({ field, message: 'expectations must be an object' });
    return;
  }

  if (expectations.selectors !== undefined && !isStringArray(expectations.selectors)) {
    errors.push({
      field: `${field}.selectors`,
      message: 'selectors must be an array of strings',
    });
  }
  if (expectations.text !== undefined && !isStringArray(expectations.text)) {
    errors.push({ field: `${field}.text`, message: 'text must be an array of strings' });
  }
  if (
    expectations.signedOutRedirect !== undefined &&
    typeof expectations.signedOutRedirect !== 'string'
  ) {
    errors.push({
      field: `${field}.signedOutRedirect`,
      message: 'signedOutRedirect must be a string',
    });
  }
  if (expectations.finalUrl !== undefined && typeof expectations.finalUrl !== 'string') {
    errors.push({ field: `${field}.finalUrl`, message: 'finalUrl must be a string' });
  }
  if (expectations.status !== undefined && typeof expectations.status !== 'number') {
    errors.push({ field: `${field}.status`, message: 'status must be a number' });
  }
}

function validateRouteString(
  value: unknown,
  field: string,
  label: string,
  errors: WorkflowManifestValidationError[]
): void {
  if (!isNonEmptyString(value)) {
    errors.push({ field, message: `${label} must be a non-empty route string` });
  } else if (!value.startsWith('/')) {
    errors.push({ field, message: `${label} must start with "/"` });
  }
}

function resolveAuthRequiredMetadata(
  node: WorkflowManifestNode,
  authStateKinds: Map<string, WorkflowAuthStateKind>
): Pick<NavMapWorkflowMetadata, 'authRequired'> {
  if (typeof node.metadata?.authRequired === 'boolean') {
    return { authRequired: node.metadata.authRequired };
  }

  if (
    !node.authRequirement ||
    ['public', 'anonymous', 'signed-out'].includes(node.authRequirement)
  ) {
    return { authRequired: false };
  }

  const authStateKind = authStateKinds.get(node.authRequirement);
  if (authStateKind) {
    return { authRequired: authStateKind === 'storage-state' || authStateKind === 'setup-command' };
  }

  return { authRequired: true };
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isWorkflowAuthStateKind(value: unknown): value is WorkflowAuthStateKind {
  return value === 'anonymous' || value === 'storage-state' || value === 'setup-command';
}

function isPrototypeSurfaceType(value: unknown): value is NavMapPrototypeSurfaceType {
  return (
    value === 'screenshot' ||
    value === 'generated-image' ||
    value === 'html-mockup' ||
    value === 'video' ||
    value === 'keyframe' ||
    value === 'component' ||
    value === 'concept-screen'
  );
}

function isWorkflowViewMode(value: unknown): value is ViewMode {
  return value === 'hierarchy' || value === 'map' || value === 'flow' || value === 'tree';
}
