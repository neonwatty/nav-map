import { useEffect, useRef } from 'react';
import { useNavMapContext } from '../../hooks/useNavMap';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  route: string;
  filePath?: string;
  baseUrl?: string;
  onClose: () => void;
  onFocusSubtree?: (nodeId: string) => void;
}

export function ContextMenu({
  x,
  y,
  nodeId,
  route,
  filePath,
  baseUrl,
  onClose,
  onFocusSubtree,
}: ContextMenuProps) {
  const { isDark } = useNavMapContext();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Element)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const items: { label: string; icon: string; action: () => void; disabled?: boolean }[] = [
    {
      label: 'Copy route',
      icon: '\u2398',
      action: () => {
        navigator.clipboard.writeText(route);
        onClose();
      },
    },
    {
      label: 'Open in browser',
      icon: '\u2197',
      action: () => {
        const url = baseUrl ? `${baseUrl}${route}` : route;
        window.open(url, '_blank');
        onClose();
      },
      disabled: !baseUrl && !route.startsWith('http'),
    },
    {
      label: 'Open in editor',
      icon: '\u270E',
      action: () => {
        if (filePath) {
          window.open(`vscode://file/${filePath}`, '_self');
        }
        onClose();
      },
      disabled: !filePath,
    },
  ];

  if (onFocusSubtree) {
    items.push({
      label: 'Focus subtree',
      icon: '\u2B21',
      action: () => {
        onFocusSubtree(nodeId);
        onClose();
      },
    });
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: isDark ? '#14141e' : '#fff',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        borderRadius: 8,
        padding: '4px 0',
        zIndex: 200,
        minWidth: 180,
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
      }}
    >
      {items.map(item => (
        <button
          key={item.label}
          onClick={item.action}
          disabled={item.disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 14px',
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: item.disabled ? (isDark ? '#333' : '#ccc') : isDark ? '#c8c8d0' : '#333',
            cursor: item.disabled ? 'default' : 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            if (!item.disabled) {
              (e.target as HTMLElement).style.background = isDark
                ? 'rgba(91,155,245,0.08)'
                : 'rgba(51,85,170,0.06)';
            }
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.background = 'none';
          }}
        >
          <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
