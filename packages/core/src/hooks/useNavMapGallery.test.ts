import { act, renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { NavMapGraph } from '../types';
import { useNavMapGallery } from './useNavMapGallery';

const graph: NavMapGraph = {
  version: '1.0',
  meta: { name: 'Test', generatedAt: '2026-01-01', generatedBy: 'manual' },
  nodes: [
    { id: 'home', route: '/', label: 'Home', group: 'root' },
    { id: 'settings', route: '/settings', label: 'Settings', group: 'app' },
  ],
  edges: [],
  groups: [{ id: 'root', label: 'Root' }],
  flows: [
    {
      name: 'Settings flow',
      steps: ['home', 'settings'],
      gallery: {
        home: [{ action: 'goto', title: 'Home', screenshot: 'home.png' }],
        settings: [],
      },
    },
  ],
};

const screenshotNode: Node = {
  id: 'home',
  position: { x: 0, y: 0 },
  data: { label: 'Home', screenshot: 'home.png' },
};

describe('useNavMapGallery', () => {
  it('detects nodes with non-empty gallery entries', () => {
    const { result } = renderHook(() => useNavMapGallery(graph));

    expect([...result.current.galleryNodeIds]).toEqual(['home']);
  });

  it('opens and closes gallery only for nodes with gallery entries', () => {
    const { result } = renderHook(() => useNavMapGallery(graph));

    act(() => {
      result.current.openGalleryForNode('settings');
    });
    expect(result.current.galleryNodeId).toBeNull();

    act(() => {
      result.current.openGalleryForNode('home');
    });
    expect(result.current.galleryNodeId).toBe('home');

    act(() => {
      result.current.closeGallery();
    });
    expect(result.current.galleryNodeId).toBeNull();
  });

  it('shows hover preview for nodes with screenshots and tracks mouse position', () => {
    const { result } = renderHook(() => useNavMapGallery(graph));

    act(() => {
      result.current.onNodeMouseEnter({} as never, screenshotNode);
    });
    expect(result.current.hoverPreview).toEqual({
      screenshot: 'home.png',
      label: 'Home',
      position: null,
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 42, clientY: 64 }));
    });
    expect(result.current.hoverPreview?.position).toEqual({ x: 42, y: 64 });

    act(() => {
      result.current.onNodeMouseLeave();
    });
    expect(result.current.hoverPreview).toBeNull();
  });
});
