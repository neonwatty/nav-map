interface NavMapGraph {
  version?: string;
  meta?: {
    name?: string;
    generatedAt?: string;
    generatedBy?: string;
  };
  nodes?: {
    id?: string;
    route?: string;
    label?: string;
    group?: string;
  }[];
  edges?: {
    id?: string;
    source?: string;
    target?: string;
    type?: string;
  }[];
  groups?: {
    id?: string;
    label?: string;
  }[];
}

export function validateGraph(graph: NavMapGraph): string[] {
  const errors: string[] = [];

  if (!graph.version) {
    errors.push('Missing version field');
  } else if (graph.version !== '1.0') {
    errors.push(`Unknown version: ${graph.version}`);
  }

  if (!graph.meta) {
    errors.push('Missing meta field');
  } else {
    if (!graph.meta.name) errors.push('Missing meta.name');
    if (!graph.meta.generatedAt) errors.push('Missing meta.generatedAt');
    if (!graph.meta.generatedBy) errors.push('Missing meta.generatedBy');
  }

  if (!graph.nodes || graph.nodes.length === 0) {
    errors.push('No nodes found');
  } else {
    const nodeIds = new Set<string>();
    for (const node of graph.nodes) {
      if (!node.id) errors.push('Node missing id');
      if (!node.route) errors.push(`Node ${node.id} missing route`);
      if (!node.label) errors.push(`Node ${node.id} missing label`);
      if (!node.group) errors.push(`Node ${node.id} missing group`);
      if (node.id) {
        if (nodeIds.has(node.id)) {
          errors.push(`Duplicate node id: ${node.id}`);
        }
        nodeIds.add(node.id);
      }
    }

    // Validate edges reference existing nodes
    if (graph.edges) {
      for (const edge of graph.edges) {
        if (!edge.id) errors.push('Edge missing id');
        if (!edge.source) errors.push(`Edge ${edge.id} missing source`);
        if (!edge.target) errors.push(`Edge ${edge.id} missing target`);
        if (edge.source && !nodeIds.has(edge.source)) {
          errors.push(`Edge ${edge.id} references unknown source: ${edge.source}`);
        }
        if (edge.target && !nodeIds.has(edge.target)) {
          errors.push(`Edge ${edge.id} references unknown target: ${edge.target}`);
        }
      }
    }
  }

  if (!graph.groups || graph.groups.length === 0) {
    errors.push('No groups found');
  }

  return errors;
}
