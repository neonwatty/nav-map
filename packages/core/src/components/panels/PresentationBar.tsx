import type { NavMapNode } from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';

interface PresentationBarProps {
  currentNodeId: string | null;
  nodes: NavMapNode[];
  stepLabel: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onExit: () => void;
  screenshotBasePath: string;
}

export function PresentationBar({
  currentNodeId,
  nodes,
  stepLabel,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onExit,
  screenshotBasePath,
}: PresentationBarProps) {
  const { isDark, getGroupColors } = useNavMapContext();
  const currentNode = nodes.find(n => n.id === currentNodeId);

  if (!currentNode) return null;

  const colors = getGroupColors(currentNode.group);
  const screenshotSrc = currentNode.screenshot
    ? `${screenshotBasePath}/${currentNode.screenshot}`
    : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? 'rgba(5, 5, 10, 0.85)' : 'rgba(200, 200, 210, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
        pointerEvents: 'auto',
      }}
      onClick={onExit}
    >
      {/* Main card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: isDark ? '#14141e' : '#fff',
          borderRadius: 16,
          border: `2px solid ${colors.border}`,
          overflow: 'hidden',
          maxWidth: 600,
          width: '90%',
          boxShadow: isDark
            ? `0 16px 60px rgba(0,0,0,0.6), 0 0 30px ${colors.border}22`
            : '0 16px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Screenshot */}
        {screenshotSrc && (
          <div style={{ width: '100%', maxHeight: 350, overflow: 'hidden' }}>
            <img
              src={screenshotSrc}
              alt={currentNode.label}
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        {/* Info */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: colors.border,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: isDark ? '#e0e0e8' : '#222',
              }}
            >
              {currentNode.label}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              fontFamily: "'SF Mono', Monaco, monospace",
              color: isDark ? '#6688bb' : '#2563eb',
              marginTop: 6,
            }}
          >
            {currentNode.route}
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '12px 24px',
            borderTop: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
          }}
        >
          <button onClick={onBack} disabled={!canGoBack} style={navButtonStyle(isDark, !canGoBack)}>
            &#x2190; Prev
          </button>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? '#888' : '#666',
              minWidth: 60,
              textAlign: 'center',
            }}
          >
            Step {stepLabel}
          </span>
          <button
            onClick={onForward}
            disabled={!canGoForward}
            style={navButtonStyle(isDark, !canGoForward)}
          >
            Next &#x2192;
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onExit}
            style={{
              background: 'none',
              border: `1px solid ${isDark ? '#333' : '#ccc'}`,
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              color: isDark ? '#888' : '#666',
              cursor: 'pointer',
            }}
          >
            Exit Presentation
          </button>
        </div>
      </div>
    </div>
  );
}

function navButtonStyle(isDark: boolean, disabled: boolean): React.CSSProperties {
  return {
    background: isDark ? '#1a1a28' : '#f0f2f8',
    border: `1px solid ${isDark ? '#2a2a3a' : '#d0d0d8'}`,
    borderRadius: 6,
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: disabled ? (isDark ? '#333' : '#ccc') : isDark ? '#c8c8d0' : '#333',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
