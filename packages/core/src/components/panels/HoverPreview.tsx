import { useState, useEffect } from 'react';
import { useNavMapContext } from '../../hooks/useNavMap';

interface HoverPreviewProps {
  screenshot?: string;
  label: string;
  position: { x: number; y: number } | null;
}

export function HoverPreview({ screenshot, label, position }: HoverPreviewProps) {
  const { isDark, screenshotBasePath } = useNavMapContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (position && screenshot) {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [position, screenshot]);

  if (!visible || !position || !screenshot) return null;

  const src = `${screenshotBasePath}/${screenshot}`;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 20,
        top: position.y - 120,
        width: 400,
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d0d0d8'}`,
        background: isDark ? '#14141e' : '#fff',
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.5)'
          : '0 8px 32px rgba(0,0,0,0.15)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <img
        src={src}
        alt={label}
        style={{ width: '100%', display: 'block' }}
      />
      <div
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: isDark ? '#c8c8d0' : '#333',
          borderTop: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
        }}
      >
        {label}
      </div>
    </div>
  );
}
