import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { NavMapGraph, GroupColors, EdgeMode, NavMapTheme } from '../types';
import { getGroupColors as getColors } from '../utils/colors';

export interface NavMapContextValue {
  graph: NavMapGraph | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  isDark: boolean;
  screenshotBasePath: string;
  getGroupColors: (groupId: string) => GroupColors;
  focusedGroupId: string | null;
  edgeMode: EdgeMode;
  showCoverage: boolean;
}

const defaultContext: NavMapContextValue = {
  graph: null,
  selectedNodeId: null,
  setSelectedNodeId: () => {},
  isDark: true,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#1e1e2a', border: '#888', text: '#aaa' }),
  focusedGroupId: null,
  edgeMode: 'smooth',
  showCoverage: false,
};

export const NavMapContext = createContext<NavMapContextValue>(defaultContext);

export function useNavMapContext(): NavMapContextValue {
  return useContext(NavMapContext);
}

export function useNavMapState(
  graph: NavMapGraph | null,
  screenshotBasePath: string,
  theme?: NavMapTheme
): Omit<NavMapContextValue, 'focusedGroupId' | 'edgeMode' | 'showCoverage'> {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const getGroupColors = useCallback(
    (groupId: string): GroupColors => getColors(groupId, isDark, theme?.groupColors),
    [isDark, theme?.groupColors]
  );

  return {
    graph,
    selectedNodeId,
    setSelectedNodeId,
    isDark,
    screenshotBasePath,
    getGroupColors,
  };
}
