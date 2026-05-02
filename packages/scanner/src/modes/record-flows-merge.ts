import type { NavMapGraph } from './record-flows-types.js';

export function mergeGraphs(existing: NavMapGraph, recorded: NavMapGraph): NavMapGraph {
  const merged = JSON.parse(JSON.stringify(existing)) as NavMapGraph;

  const existingNodeMap = new Map(merged.nodes.map(node => [node.id, node]));
  for (const node of recorded.nodes) {
    const existingNode = existingNodeMap.get(node.id);
    if (existingNode) {
      if (node.screenshot) existingNode.screenshot = node.screenshot;
    } else {
      merged.nodes.push(node);
    }
  }

  const existingEdgeKeys = new Set(merged.edges.map(edge => `${edge.source}->${edge.target}`));
  for (const edge of recorded.edges) {
    const key = `${edge.source}->${edge.target}`;
    if (!existingEdgeKeys.has(key)) {
      merged.edges.push(edge);
      existingEdgeKeys.add(key);
    }
  }

  const existingFlows = merged.flows ?? [];
  for (const flow of recorded.flows ?? []) {
    const index = existingFlows.findIndex(existingFlow => existingFlow.name === flow.name);
    if (index >= 0) existingFlows[index] = flow;
    else existingFlows.push(flow);
  }
  merged.flows = existingFlows.length > 0 ? existingFlows : undefined;

  return merged;
}
