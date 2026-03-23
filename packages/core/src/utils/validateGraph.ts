export interface GraphValidationError {
  field: string;
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
}

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

  if (!g.meta || typeof g.meta !== 'object') {
    errors.push({ field: 'meta', message: 'Missing or invalid meta object' });
  }

  if (!Array.isArray(g.nodes)) {
    errors.push({ field: 'nodes', message: 'nodes must be an array' });
  } else if (g.nodes.length === 0) {
    errors.push({ field: 'nodes', message: 'nodes array must not be empty' });
  } else {
    const nodeIds = new Set<string>();
    for (const node of g.nodes) {
      if (!node.id || !node.route || !node.label || !node.group) {
        errors.push({
          field: 'nodes',
          message: `Node "${String(node.id)}" missing required fields (id, route, label, group)`,
        });
      }
      if (node.id) nodeIds.add(node.id);
    }

    if (Array.isArray(g.edges)) {
      for (const edge of g.edges) {
        if (!nodeIds.has(edge.source)) {
          errors.push({
            field: 'edges',
            message: `Edge "${String(edge.id)}" references unknown source "${String(edge.source)}"`,
          });
        }
        if (!nodeIds.has(edge.target)) {
          errors.push({
            field: 'edges',
            message: `Edge "${String(edge.id)}" references unknown target "${String(edge.target)}"`,
          });
        }
      }
    }
  }

  if (!Array.isArray(g.edges)) {
    errors.push({ field: 'edges', message: 'edges must be an array' });
  }

  if (!Array.isArray(g.groups)) {
    errors.push({ field: 'groups', message: 'groups must be an array' });
  }

  return { valid: errors.length === 0, errors };
}
