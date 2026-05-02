import type { CSSProperties } from 'react';

export function toolbarButtonStyle(isDark: boolean, active = false): CSSProperties {
  return {
    background: active ? (isDark ? '#1e2540' : '#e0e8ff') : isDark ? '#14141e' : '#fff',
    border: `1px solid ${active ? (isDark ? '#4466aa' : '#6688cc') : isDark ? '#2a2a3a' : '#d8dae0'}`,
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    color: active ? (isDark ? '#7aacff' : '#3355aa') : isDark ? '#888' : '#666',
    cursor: 'pointer',
  };
}

export function toolbarPopoverStyle(isDark: boolean, minWidth: number): CSSProperties {
  return {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: isDark ? '#14141e' : '#fff',
    border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
    borderRadius: 10,
    padding: '4px 0',
    minWidth,
    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
  };
}
