import { useState, useCallback } from 'react';

export type WalkthroughMode = 'explore' | 'presentation';

export interface WalkthroughState {
  path: string[];
  currentIndex: number;
  push: (nodeId: string) => void;
  goTo: (index: number) => void;
  goBack: () => void;
  goForward: () => void;
  clear: () => void;
  currentNodeId: string | null;
  mode: WalkthroughMode;
  setMode: (mode: WalkthroughMode) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  stepLabel: string;
}

export function useWalkthrough(): WalkthroughState {
  const [path, setPath] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [mode, setMode] = useState<WalkthroughMode>('explore');

  // In explore mode, currentIndex is always the end of the path
  // In presentation mode, we can step through the path
  const currentIndex = mode === 'presentation' ? viewIndex : path.length - 1;
  const currentNodeId = path[currentIndex] ?? null;
  const canGoBack = currentIndex > 0;
  const canGoForward = mode === 'presentation' && currentIndex < path.length - 1;
  const stepLabel = path.length > 0
    ? `${currentIndex + 1} / ${path.length}`
    : '';

  const push = useCallback((nodeId: string) => {
    setPath(prev => {
      if (prev[prev.length - 1] === nodeId) return prev;
      const existingIndex = prev.indexOf(nodeId);
      if (existingIndex !== -1) {
        return prev.slice(0, existingIndex + 1);
      }
      return [...prev, nodeId];
    });
    setViewIndex(prev => prev + 1);
  }, []);

  const goTo = useCallback((index: number) => {
    setPath(prev => {
      if (index < 0 || index >= prev.length) return prev;
      if (mode === 'presentation') {
        setViewIndex(index);
        return prev;
      }
      return prev.slice(0, index + 1);
    });
  }, [mode]);

  const goBack = useCallback(() => {
    if (mode === 'presentation') {
      setViewIndex(prev => Math.max(0, prev - 1));
    } else {
      setPath(prev => {
        if (prev.length <= 1) return [];
        return prev.slice(0, -1);
      });
    }
  }, [mode]);

  const goForward = useCallback(() => {
    if (mode === 'presentation') {
      setViewIndex(prev => Math.min(prev + 1, path.length - 1));
    }
  }, [mode, path.length]);

  const clear = useCallback(() => {
    setPath([]);
    setViewIndex(0);
    setMode('explore');
  }, []);

  const handleSetMode = useCallback((newMode: WalkthroughMode) => {
    setMode(newMode);
    if (newMode === 'presentation') {
      setViewIndex(0);
    }
  }, []);

  return {
    path,
    currentIndex,
    push,
    goTo,
    goBack,
    goForward,
    clear,
    currentNodeId,
    mode,
    setMode: handleSetMode,
    canGoBack,
    canGoForward,
    stepLabel,
  };
}
