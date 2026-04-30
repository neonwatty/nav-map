export interface GraphValidationError {
  field: string;
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
}

const GENERATED_BY_VALUES = new Set(['repo-scan', 'url-crawl', 'manual', 'e2e-record', 'merged']);
const FRAMEWORK_VALUES = new Set(['nextjs-app', 'nextjs-pages', 'generic']);
const EDGE_TYPE_VALUES = new Set([
  'link',
  'redirect',
  'router-push',
  'shared-nav',
  'test-transition',
]);
const EDGE_DISCOVERY_VALUES = new Set(['static-link', 'observed-interaction']);

export function validateGraph(graph: unknown): GraphValidationResult {
  const errors: GraphValidationError[] = [];

  if (!graph || typeof graph !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'graph', message: 'Graph must be a non-null object' }],
    };
  }

  const g = graph as Record<string, unknown>;

  if (g.version !== '1.0') {
    errors.push({
      field: 'version',
      message: `Expected version "1.0", got "${String(g.version)}"`,
    });
  }

  const meta = asRecord(g.meta);
  if (!meta) {
    errors.push({ field: 'meta', message: 'Missing or invalid meta object' });
  } else {
    validateMeta(meta, errors);
  }

  const groupIds = new Set<string>();
  if (!Array.isArray(g.groups)) {
    errors.push({ field: 'groups', message: 'groups must be an array' });
  } else {
    validateGroups(g.groups, groupIds, errors);
  }

  if (!Array.isArray(g.nodes)) {
    errors.push({ field: 'nodes', message: 'nodes must be an array' });
  } else if (g.nodes.length === 0) {
    errors.push({ field: 'nodes', message: 'nodes array must not be empty' });
  } else {
    const nodeIds = new Set<string>();
    validateNodes(g.nodes, groupIds, nodeIds, errors);

    if (Array.isArray(g.edges)) {
      validateEdges(g.edges, nodeIds, errors);
    }
  }

  if (!Array.isArray(g.edges)) {
    errors.push({ field: 'edges', message: 'edges must be an array' });
  }

  return { valid: errors.length === 0, errors };
}

function validateMeta(meta: Record<string, unknown>, errors: GraphValidationError[]): void {
  if (!isNonEmptyString(meta.name)) {
    errors.push({ field: 'meta.name', message: 'meta.name must be a non-empty string' });
  }

  if (!isNonEmptyString(meta.generatedAt)) {
    errors.push({
      field: 'meta.generatedAt',
      message: 'meta.generatedAt must be a non-empty string',
    });
  }

  if (!GENERATED_BY_VALUES.has(String(meta.generatedBy))) {
    errors.push({
      field: 'meta.generatedBy',
      message: `meta.generatedBy must be one of: ${Array.from(GENERATED_BY_VALUES).join(', ')}`,
    });
  }

  if (meta.framework !== undefined && !FRAMEWORK_VALUES.has(String(meta.framework))) {
    errors.push({
      field: 'meta.framework',
      message: `meta.framework must be one of: ${Array.from(FRAMEWORK_VALUES).join(', ')}`,
    });
  }
}

function validateGroups(
  groups: unknown[],
  groupIds: Set<string>,
  errors: GraphValidationError[]
): void {
  for (const group of groups) {
    const record = asRecord(group);
    const id = record?.id;

    if (!record || !isNonEmptyString(id) || !isNonEmptyString(record.label)) {
      errors.push({
        field: 'groups',
        message: `Group "${String(id)}" missing required fields (id, label)`,
      });
      continue;
    }

    if (groupIds.has(id)) {
      errors.push({ field: 'groups', message: `Duplicate group id "${id}"` });
    }
    groupIds.add(id);
  }
}

function validateNodes(
  nodes: unknown[],
  groupIds: Set<string>,
  nodeIds: Set<string>,
  errors: GraphValidationError[]
): void {
  for (const node of nodes) {
    const record = asRecord(node);
    const id = record?.id;

    if (
      !record ||
      !isNonEmptyString(id) ||
      !isNonEmptyString(record.route) ||
      !isNonEmptyString(record.label) ||
      !isNonEmptyString(record.group)
    ) {
      errors.push({
        field: 'nodes',
        message: `Node "${String(id)}" missing required fields (id, route, label, group)`,
      });
      continue;
    }

    if (!record.route.startsWith('/')) {
      errors.push({ field: 'nodes.route', message: `Node "${id}" route must start with "/"` });
    }

    if (nodeIds.has(id)) {
      errors.push({ field: 'nodes', message: `Duplicate node id "${id}"` });
    }
    nodeIds.add(id);

    if (groupIds.size > 0 && !groupIds.has(record.group)) {
      errors.push({
        field: 'nodes.group',
        message: `Node "${id}" references unknown group "${record.group}"`,
      });
    }
  }
}

function validateEdges(
  edges: unknown[],
  nodeIds: Set<string>,
  errors: GraphValidationError[]
): void {
  const edgeIds = new Set<string>();

  for (const edge of edges) {
    const record = asRecord(edge);
    const id = record?.id;

    if (
      !record ||
      !isNonEmptyString(id) ||
      !isNonEmptyString(record.source) ||
      !isNonEmptyString(record.target) ||
      !isNonEmptyString(record.type)
    ) {
      errors.push({
        field: 'edges',
        message: `Edge "${String(id)}" missing required fields (id, source, target, type)`,
      });
      continue;
    }

    if (edgeIds.has(id)) {
      errors.push({ field: 'edges', message: `Duplicate edge id "${id}"` });
    }
    edgeIds.add(id);

    if (!EDGE_TYPE_VALUES.has(record.type)) {
      errors.push({
        field: 'edges.type',
        message: `Edge "${id}" type must be one of: ${Array.from(EDGE_TYPE_VALUES).join(', ')}`,
      });
    }

    if (
      record.discovery !== undefined &&
      (!isNonEmptyString(record.discovery) || !EDGE_DISCOVERY_VALUES.has(record.discovery))
    ) {
      errors.push({
        field: 'edges.discovery',
        message: `Edge "${id}" discovery must be one of: ${Array.from(EDGE_DISCOVERY_VALUES).join(', ')}`,
      });
    }

    if (!nodeIds.has(record.source)) {
      errors.push({
        field: 'edges',
        message: `Edge "${id}" references unknown source "${record.source}"`,
      });
    }
    if (!nodeIds.has(record.target)) {
      errors.push({
        field: 'edges',
        message: `Edge "${id}" references unknown target "${record.target}"`,
      });
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
