import { describe, it, expect } from 'vitest';
import { validateGraph } from './validateGraph';

const validGraph = {
  version: '1.0' as const,
  meta: { name: 'Test', generatedAt: '2026-01-01', generatedBy: 'manual' as const },
  nodes: [{ id: 'n1', route: '/', label: 'Home', group: 'main' }],
  edges: [{ id: 'e1', source: 'n1', target: 'n1', type: 'link' as const }],
  groups: [{ id: 'main', label: 'Main' }],
};

describe('validateGraph', () => {
  it('returns valid for a correct graph', () => {
    const result = validateGraph(validGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null/undefined input', () => {
    expect(validateGraph(null as never).valid).toBe(false);
    expect(validateGraph(undefined as never).valid).toBe(false);
  });

  it('rejects missing version', () => {
    const { version: _version, ...noVersion } = validGraph;
    const result = validateGraph(noVersion as never);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'version' }));
  });

  it('rejects missing nodes array', () => {
    const result = validateGraph({ ...validGraph, nodes: 'not-array' } as never);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'nodes' }));
  });

  it('rejects empty nodes', () => {
    const result = validateGraph({ ...validGraph, nodes: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'nodes' }));
  });

  it('rejects nodes missing required fields', () => {
    const result = validateGraph({ ...validGraph, nodes: [{ id: 'n1' }] } as never);
    expect(result.valid).toBe(false);
  });

  it('rejects edges referencing non-existent nodes', () => {
    const result = validateGraph({
      ...validGraph,
      edges: [{ id: 'e1', source: 'n1', target: 'missing', type: 'link' as const }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'edges' }));
  });

  it('rejects missing edges array', () => {
    const result = validateGraph({ ...validGraph, edges: undefined } as never);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'edges' }));
  });

  it('rejects missing groups array', () => {
    const result = validateGraph({ ...validGraph, groups: undefined } as never);
    expect(result.valid).toBe(false);
  });

  it('collects multiple errors', () => {
    const result = validateGraph({ version: '2.0' } as never);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateGraph with coverage data', () => {
  const baseGraph = {
    version: '1.0',
    meta: { name: 'test', generatedAt: '2026-01-01', generatedBy: 'merged' },
    nodes: [
      { id: 'home', route: '/', label: 'Home', group: 'marketing' },
      { id: 'about', route: '/about', label: 'About', group: 'marketing' },
    ],
    edges: [{ id: 'e1', source: 'home', target: 'about', type: 'test-transition' }],
    groups: [{ id: 'marketing', label: 'Marketing' }],
  };

  it('accepts generatedBy "merged"', () => {
    const result = validateGraph(baseGraph);
    expect(result.valid).toBe(true);
  });

  it('accepts edge type "test-transition"', () => {
    const result = validateGraph(baseGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts nodes with coverage metadata', () => {
    const graph = {
      ...baseGraph,
      nodes: [
        {
          ...baseGraph.nodes[0],
          metadata: {
            coverage: {
              status: 'covered',
              testCount: 2,
              passCount: 2,
              failCount: 0,
              tests: [],
              lastRun: '2026-01-01T00:00:00Z',
            },
          },
        },
        baseGraph.nodes[1],
      ],
    };
    const result = validateGraph(graph);
    expect(result.valid).toBe(true);
  });
});
