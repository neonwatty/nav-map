import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { NavMapGraph, GroupColors } from '../types';
import { getGroupColors as getColors } from '../utils/colors';

export interface NavMapContextValue {
  graph: NavMapGraph | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  isDark: boolean;
  screenshotBasePath: string;
  getGroupColors: (groupId: string) => GroupColors;
}

const defaultContext: NavMapContextValue = {
  graph: null,
  selectedNodeId: null,
  setSelectedNodeId: () => {},
  isDark: true,
  screenshotBasePath: '',
  getGroupColors: () => ({ bg: '#1e1e2a', border: '#888', text: '#aaa' }),
};

export const NavMapContext = createContext<NavMapContextValue>(defaultContext);

export function useNavMapContext(): NavMapContextValue {
  return useContext(NavMapContext);
}

export function useNavMapState(
  graph: NavMapGraph | null,
  screenshotBasePath: string
): NavMapContextValue {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const getGroupColors = useCallback(
    (groupId: string): GroupColors => getColors(groupId, isDark),
    [isDark]
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
