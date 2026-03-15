import type { NavMapNode } from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';

interface WalkthroughBarProps {
  path: string[];
  nodes: NavMapNode[];
  onGoTo: (index: number) => void;
  onClear: () => void;
  onPresent?: () => void;
}

export function WalkthroughBar({ path, nodes, onGoTo, onClear, onPresent }: WalkthroughBarProps) {
  const { isDark } = useNavMapContext();

  if (path.length === 0) return null;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: isDark ? 'rgba(16, 16, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
        border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
        borderRadius: 8,
        padding: '6px 10px',
        zIndex: 20,
        maxWidth: '80%',
        overflow: 'auto',
      }}
    >
      <span style={{ fontSize: 11, color: isDark ? '#555' : '#999', marginRight: 4, whiteSpace: 'nowrap' }}>
        Walk-through
      </span>
      {path.map((nodeId, i) => {
        const node = nodeMap.get(nodeId);
        const isLast = i === path.length - 1;
        return (
          <span key={`${nodeId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && (
              <span style={{ color: isDark ? '#444' : '#bbb', fontSize: 11 }}>&#x203A;</span>
            )}
            <button
              onClick={() => onGoTo(i)}
              style={{
                background: isLast
                  ? (isDark ? '#1e2540' : '#d8e4f8')
                  : (isDark ? '#1a1a24' : '#ecedf2'),
                color: isLast
                  ? (isDark ? '#7aacff' : '#2563eb')
                  : (isDark ? '#888' : '#556'),
                border: 'none',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: isLast ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {node?.label ?? nodeId}
            </button>
          </span>
        );
      })}
      {onPresent && path.length >= 2 && (
        <button
          onClick={onPresent}
          style={{
            background: isDark ? '#1e2540' : '#e0e8ff',
            border: `1px solid ${isDark ? '#4466aa' : '#6688cc'}`,
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 10,
            fontWeight: 600,
            color: isDark ? '#7aacff' : '#3355aa',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: 4,
          }}
          title="Enter presentation mode"
        >
          &#x25B6; Present
        </button>
      )}
      <button
        onClick={onClear}
        style={{
          background: 'none',
          border: 'none',
          color: isDark ? '#555' : '#aaa',
          cursor: 'pointer',
          fontSize: 14,
          padding: '0 4px',
          marginLeft: 4,
        }}
        title="Clear walk-through"
      >
        &#x2715;
      </button>
    </div>
  );
}
