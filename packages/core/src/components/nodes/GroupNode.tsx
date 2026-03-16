import { memo, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useNavMapContext } from '../../hooks/useNavMap';

export interface GroupNodeData {
  label: string;
  groupId: string;
  childCount: number;
  collapsed: boolean;
  onToggle?: (groupId: string, collapsed: boolean) => void;
  [key: string]: unknown;
}

function GroupNodeComponent({ data, width, height }: NodeProps) {
  const nodeData = data as unknown as GroupNodeData;
  const { isDark, getGroupColors } = useNavMapContext();
  const colors = getGroupColors(nodeData.groupId);
  const [isCollapsed, setIsCollapsed] = useState(nodeData.collapsed ?? false);

  const handleToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    nodeData.onToggle?.(nodeData.groupId, next);
  };

  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        borderRadius: 10,
        border: `2px solid ${colors.border}`,
        background: `${colors.bg}88`,
        overflow: 'visible',
      }}
    >
      {/* Header bar */}
      <div
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: colors.border,
          borderRadius: '8px 8px 0 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              transition: 'transform 0.15s',
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              display: 'inline-block',
              color: '#fff',
            }}
          >
            &#x25BC;
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.03em',
            }}
          >
            {nodeData.label}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.8)',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '1px 7px',
          }}
        >
          {nodeData.childCount}
        </span>
      </div>

      {/* Collapsed summary */}
      {isCollapsed && (
        <div
          style={{
            padding: '8px 12px',
            fontSize: 11,
            color: isDark ? '#888' : '#666',
            textAlign: 'center',
          }}
        >
          {nodeData.childCount} pages
        </div>
      )}
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
