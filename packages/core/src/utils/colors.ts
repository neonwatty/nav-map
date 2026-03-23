import type { GroupColorMap } from '../types';

export const darkGroupColors: GroupColorMap = {
  marketing: { bg: '#1a2538', border: '#5b9bf5', text: '#c0d8ff' },
  product: { bg: '#1a3028', border: '#4eca6a', text: '#b8f0c8' },
  studio: { bg: '#2a1a38', border: '#b07ce8', text: '#d8c0f0' },
  premium: { bg: '#302818', border: '#f0a050', text: '#f0d8b0' },
  auth: { bg: '#1e2830', border: '#6e8ca8', text: '#b0c8d8' },
  legal: { bg: '#1e2428', border: '#556878', text: '#98a8b0' },
};

export const lightGroupColors: GroupColorMap = {
  marketing: { bg: '#e0ecff', border: '#3b7bdd', text: '#1a3a6a' },
  product: { bg: '#ddf5e6', border: '#2ea050', text: '#1a4028' },
  studio: { bg: '#ece0f8', border: '#8050c0', text: '#3a1a60' },
  premium: { bg: '#fff0d8', border: '#d08030', text: '#604018' },
  auth: { bg: '#e0eef5', border: '#4a7090', text: '#1e3040' },
  legal: { bg: '#e8eef2', border: '#607080', text: '#2a3540' },
};

const fallbackDark = { bg: '#1e1e2a', border: '#888', text: '#aaa' };
const fallbackLight = { bg: '#f0f0f4', border: '#888', text: '#555' };

export function getGroupColors(
  groupId: string,
  isDark: boolean,
  overrides?: GroupColorMap
): { bg: string; border: string; text: string } {
  if (overrides?.[groupId]) return overrides[groupId];
  const map = isDark ? darkGroupColors : lightGroupColors;
  const fallback = isDark ? fallbackDark : fallbackLight;
  return map[groupId] ?? fallback;
}
