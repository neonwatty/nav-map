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

const startItems = [
  {
    title: 'Inspect structure',
    description:
      'Use Hierarchy for app sections, then switch to Map when you need page-to-page links.',
  },
  {
    title: 'Find a route',
    description: 'Open Search to jump to a page and preview screenshots before changing context.',
  },
  {
    title: 'Review health',
    description: 'Run Audit to find unreachable pages, dead ends, and isolated route groups.',
  },
  {
    title: 'Replay journeys',
    description:
      'Select a flow, then double-click nodes with Flow badges to inspect recorded steps.',
  },
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
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
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
          Start Here
        </h2>
        <p
          style={{
            margin: '0 0 16px',
            color: isDark ? '#aaa' : '#5a6070',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Nav Map helps you move from architecture overview to specific route decisions without
          losing context.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {startItems.map(item => (
            <div
              key={item.title}
              style={{
                border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
                borderRadius: 8,
                padding: 12,
                background: isDark ? '#101018' : '#f8f9fc',
              }}
            >
              <div
                style={{
                  color: isDark ? '#e0e0e8' : '#333',
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {item.title}
              </div>
              <div style={{ color: isDark ? '#999' : '#666', fontSize: 12, lineHeight: 1.45 }}>
                {item.description}
              </div>
            </div>
          ))}
        </div>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isDark ? '#d0d0d8' : '#444',
            margin: '0 0 8px',
          }}
        >
          Keyboard Shortcuts
        </h3>
        <div style={{ columns: '220px 2', columnGap: 24 }}>
          {shortcuts.map(s => (
            <div
              key={s.key}
              style={{
                breakInside: 'avoid',
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
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 20,
            width: '100%',
            border: 0,
            borderRadius: 8,
            padding: '10px 12px',
            background: isDark ? '#2a4b8d' : '#3355aa',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Explore map
        </button>
      </div>
    </div>
  );
}
