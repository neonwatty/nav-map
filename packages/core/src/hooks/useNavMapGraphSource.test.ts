import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../types';
import { useNavMapGraphSource } from './useNavMapGraphSource';

const validGraph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [{ id: 'n1', route: '/', label: 'Home', group: 'main' }],
  edges: [],
  groups: [{ id: 'main', label: 'Main' }],
};

describe('useNavMapGraphSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the provided graph immediately', () => {
    const { result } = renderHook(() => useNavMapGraphSource({ graph: validGraph }));

    expect(result.current).toBe(validGraph);
  });

  it('reports validation errors for invalid provided graphs', async () => {
    const onValidationError = vi.fn();
    const invalidGraph = { ...validGraph, nodes: [] };

    renderHook(() => useNavMapGraphSource({ graph: invalidGraph, onValidationError }));

    await waitFor(() => {
      expect(onValidationError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ field: 'nodes' })])
      );
    });
  });

  it('fetches and validates graphUrl when no graph prop is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(validGraph) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useNavMapGraphSource({ graphUrl: '/nav-map.json' }));

    await waitFor(() => {
      expect(result.current).toBe(validGraph);
    });
    expect(fetchMock).toHaveBeenCalledWith('/nav-map.json');
  });
});
