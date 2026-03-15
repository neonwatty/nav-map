import fs from 'node:fs';
import path from 'node:path';
import { validateGraph } from './schema.js';

interface NavMapGraph {
  version: string;
  meta: Record<string, unknown>;
  nodes: unknown[];
  edges: unknown[];
  groups: unknown[];
  [key: string]: unknown;
}

export function writeNavMapJson(
  graph: NavMapGraph,
  outputPath: string
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validateGraph(graph as any);
  if (errors.length > 0) {
    console.warn('Validation warnings:');
    for (const err of errors) {
      console.warn(`  - ${err}`);
    }
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
}
