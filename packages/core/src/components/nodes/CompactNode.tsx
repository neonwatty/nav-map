import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { RFNodeData } from '../../utils/graphHelpers';
import { useNavMapContext } from '../../hooks/useNavMap';

function CompactNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RFNodeData;
  const { isDark, getGroupColors } = useNavMapContext();
  const colors = getGroupColors(nodeData.group);

  return (
    <div
      style={{
        padding: '8px 16px',
        borderRadius: 6,
        border: `2px solid ${selected ? colors.border : isDark ? '#2a2a3a' : '#d0d0d8'}`,
        background: colors.bg,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: selected ? `0 0 12px ${colors.border}44` : 'none',
        minWidth: 100,
        textAlign: 'center' as const,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: colors.text,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {nodeData.label}
        {Boolean(nodeData.metadata?.authRequired) && (
          <span style={{ fontSize: 8 }} title="Auth required">&#x1F512;</span>
        )}
      </div>
      <div
        style={{
          fontSize: 9,
          color: colors.text,
          opacity: 0.7,
          fontFamily: "'SF Mono', Monaco, monospace",
          marginTop: 2,
        }}
      >
        {nodeData.route}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export const CompactNode = memo(CompactNodeComponent);
