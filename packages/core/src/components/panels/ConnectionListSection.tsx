import type { NavMapEdge, NavMapNode } from '../../types';

type Connection = {
  edge: NavMapEdge;
  node: NavMapNode;
};

interface ConnectionListSectionProps {
  title: string;
  connections: Connection[];
  isDark: boolean;
  onNavigate: (nodeId: string) => void;
  spacing?: 'normal' | 'none';
}

export function ConnectionListSection({
  title,
  connections,
  isDark,
  onNavigate,
  spacing = 'none',
}: ConnectionListSectionProps) {
  if (connections.length === 0) return null;

  return (
    <>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isDark ? '#555' : '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: spacing === 'normal' ? 16 : undefined,
        }}
      >
        {connections.map(({ edge, node }) => (
          <ConnectionButton
            key={edge.id}
            edge={edge}
            node={node}
            isDark={isDark}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </>
  );
}

interface ConnectionButtonProps {
  edge: NavMapEdge;
  node: NavMapNode;
  isDark: boolean;
  onNavigate: (nodeId: string) => void;
}

function ConnectionButton({ edge, node, isDark, onNavigate }: ConnectionButtonProps) {
  return (
    <button
      onClick={() => onNavigate(node.id)}
      style={{
        background: isDark ? '#1a1a28' : '#f0f2f8',
        border: `1px solid ${isDark ? '#2a2a3a' : '#dde0ea'}`,
        borderRadius: 6,
        padding: '4px 10px',
        cursor: 'pointer',
        fontSize: 12,
        color: isDark ? '#c8c8d0' : '#445',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
      }}
    >
      <span style={{ fontWeight: 600 }}>{node.label}</span>
      {edge.label && (
        <span style={{ fontSize: 9, color: isDark ? '#666' : '#888' }}>{edge.label}</span>
      )}
    </button>
  );
}
