import { useNavMapContext } from '../../hooks/useNavMap';

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: '↓ →', label: 'Navigate outgoing' },
  { key: '↑ ←', label: 'Navigate incoming' },
  { key: 'Backspace', label: 'Back in path' },
  { key: 'Esc', label: 'Clear selection' },
  { key: '/ or ⌘K', label: 'Search pages' },
  { key: '0', label: 'Reset view' },
  { key: 'L', label: 'Toggle layout' },
  { key: 'F', label: 'Toggle focus mode' },
  { key: 'N', label: 'Toggle shared nav' },
  { key: 'O', label: 'Open page in browser' },
  { key: '?', label: 'This help' },
];

export function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  const { isDark } = useNavMapContext();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: isDark ? '#14141e' : '#fff',
          border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
          borderRadius: 12,
          padding: '24px 32px',
          minWidth: 320,
          boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(0,0,0,0.15)',
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: isDark ? '#e0e0e8' : '#333',
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Keyboard Shortcuts
        </h2>
        {shortcuts.map(s => (
          <div
            key={s.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              fontSize: 13,
              color: isDark ? '#999' : '#666',
            }}
          >
            <span>{s.label}</span>
            <span
              style={{
                fontFamily: "'SF Mono', Monaco, monospace",
                fontSize: 11,
                background: isDark ? '#1a1a28' : '#f0f2f8',
                color: isDark ? '#aaa' : '#445',
                border: `1px solid ${isDark ? '#2a2a3a' : '#dde'}`,
                borderRadius: 4,
                padding: '2px 8px',
                marginLeft: 16,
              }}
            >
              {s.key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
