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
