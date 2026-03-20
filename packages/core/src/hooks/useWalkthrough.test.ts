import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWalkthrough } from './useWalkthrough';

describe('useWalkthrough', () => {
  it('starts with empty path', () => {
    const { result } = renderHook(() => useWalkthrough());
    expect(result.current.path).toEqual([]);
    expect(result.current.currentNodeId).toBeNull();
    expect(result.current.mode).toBe('explore');
  });

  it('push adds nodes to path', () => {
    const { result } = renderHook(() => useWalkthrough());
    act(() => result.current.push('home'));
    act(() => result.current.push('blog'));
    expect(result.current.path).toEqual(['home', 'blog']);
    expect(result.current.currentNodeId).toBe('blog');
  });

  it('push deduplicates consecutive same node', () => {
    const { result } = renderHook(() => useWalkthrough());
    act(() => result.current.push('home'));
    act(() => result.current.push('home'));
    expect(result.current.path).toEqual(['home']);
  });

  it('push truncates path when revisiting earlier node', () => {
    const { result } = renderHook(() => useWalkthrough());
    act(() => result.current.push('home'));
    act(() => result.current.push('blog'));
    act(() => result.current.push('studio'));
    act(() => result.current.push('home'));
    expect(result.current.path).toEqual(['home']);
  });

  it('goBack removes last node in explore mode', () => {
    const { result } = renderHook(() => useWalkthrough());
    act(() => result.current.push('home'));
    act(() => result.current.push('blog'));
    act(() => result.current.goBack());
    expect(result.current.path).toEqual(['home']);
    expect(result.current.currentNodeId).toBe('home');
  });

  it('clear resets everything', () => {
    const { result } = renderHook(() => useWalkthrough());
    act(() => result.current.push('home'));
    act(() => result.current.push('blog'));
    act(() => result.current.clear());
    expect(result.current.path).toEqual([]);
    expect(result.current.currentNodeId).toBeNull();
    expect(result.current.mode).toBe('explore');
  });

  describe('presentation mode', () => {
    it('setMode to presentation resets viewIndex to 0', () => {
      const { result } = renderHook(() => useWalkthrough());
      act(() => result.current.push('home'));
      act(() => result.current.push('blog'));
      act(() => result.current.push('studio'));
      act(() => result.current.setMode('presentation'));

      expect(result.current.mode).toBe('presentation');
      expect(result.current.currentNodeId).toBe('home');
      expect(result.current.stepLabel).toBe('1 / 3');
    });

    it('goForward steps through path', () => {
      const { result } = renderHook(() => useWalkthrough());
      act(() => result.current.push('home'));
      act(() => result.current.push('blog'));
      act(() => result.current.push('studio'));
      act(() => result.current.setMode('presentation'));

      act(() => result.current.goForward());
      expect(result.current.currentNodeId).toBe('blog');
      expect(result.current.stepLabel).toBe('2 / 3');

      act(() => result.current.goForward());
      expect(result.current.currentNodeId).toBe('studio');
      expect(result.current.canGoForward).toBe(false);
    });

    it('goBack steps backward in presentation', () => {
      const { result } = renderHook(() => useWalkthrough());
      act(() => result.current.push('home'));
      act(() => result.current.push('blog'));
      act(() => result.current.setMode('presentation'));

      act(() => result.current.goForward());
      expect(result.current.currentNodeId).toBe('blog');

      act(() => result.current.goBack());
      expect(result.current.currentNodeId).toBe('home');
      expect(result.current.canGoBack).toBe(false);
    });
  });
});
