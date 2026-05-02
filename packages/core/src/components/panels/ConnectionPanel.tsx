import { useMemo } from 'react';
import type { NavMapNode, NavMapEdge } from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { ConnectionListSection } from './ConnectionListSection';

interface ConnectionPanelProps {
  node: NavMapNode;
  edges: NavMapEdge[];
  nodes: NavMapNode[];
  onNavigate: (nodeId: string) => void;
  isNarrow?: boolean;
}

export function ConnectionPanel({
  node,
  edges,
  nodes,
  onNavigate,
  isNarrow = false,
}: ConnectionPanelProps) {
  const { isDark, getGroupColors, screenshotBasePath } = useNavMapContext();
  const colors = getGroupColors(node.group);

  const { incoming, outgoing } = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return {
      incoming: edges
        .filter(e => e.target === node.id)
        .map(e => ({ edge: e, node: nodeMap.get(e.source) }))
        .filter((e): e is { edge: NavMapEdge; node: NavMapNode } => !!e.node),
      outgoing: edges
        .filter(e => e.source === node.id)
        .map(e => ({ edge: e, node: nodeMap.get(e.target) }))
        .filter((e): e is { edge: NavMapEdge; node: NavMapNode } => !!e.node),
    };
  }, [node.id, edges, nodes]);

  const screenshotSrc = node.screenshot ? `${screenshotBasePath}/${node.screenshot}` : undefined;

  return (
    <div
      style={
        isNarrow
          ? {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '40vh',
              borderTop: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
              display: 'flex',
              flexDirection: 'row',
              background: isDark ? '#101018' : '#fff',
              overflow: 'auto',
              zIndex: 25,
            }
          : {
              width: 340,
              minWidth: 280,
              borderLeft: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
              display: 'flex',
              flexDirection: 'column',
              background: isDark ? '#101018' : '#fff',
              overflow: 'hidden',
            }
      }
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: isDark ? '#555' : '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Page Details
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{node.label}</div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "'SF Mono', Monaco, monospace",
            color: isDark ? '#6688bb' : '#2563eb',
            background: isDark ? '#12121f' : '#f0f2f8',
            padding: '4px 10px',
            borderRadius: 6,
            marginTop: 6,
            display: 'inline-block',
          }}
        >
          {node.route}
        </div>
      </div>

      {/* Screenshot preview */}
      <div
        style={{
          height: 200,
          background: isDark ? '#080810' : '#f0f0f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={node.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: isDark ? '#333' : '#aaa' }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>&#x1F512;</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{node.label}</div>
          </div>
        )}
      </div>

      {/* Connections */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px',
          borderTop: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
        }}
      >
        <ConnectionListSection
          title="→ Navigates to"
          connections={outgoing}
          isDark={isDark}
          onNavigate={onNavigate}
          spacing="normal"
        />

        <ConnectionListSection
          title="← Reached from"
          connections={incoming}
          isDark={isDark}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
