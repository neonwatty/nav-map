import type { ReactNode } from 'react';

interface PanelEmptyStateProps {
  isDark: boolean;
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}

export function PanelEmptyState({
  isDark,
  icon = '•',
  title,
  description,
  children,
}: PanelEmptyStateProps) {
  return (
    <div
      style={{
        padding: '28px 20px',
        textAlign: 'center',
        color: isDark ? '#777' : '#667',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          margin: '0 auto 12px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark ? '#1a1a28' : '#eef2ff',
          color: isDark ? '#7aacff' : '#3355aa',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#d8d8e0' : '#222' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>{description}</div>
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}
