import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { RFNodeData } from '../../utils/graphHelpers';
import { useNavMapContext } from '../../hooks/useNavMap';

function PageNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RFNodeData;
  const flowStepNumber = (data as Record<string, unknown>).flowStepNumber as number | undefined;
  const { isDark, getGroupColors, screenshotBasePath } = useNavMapContext();
  const colors = getGroupColors(nodeData.group);
  const screenshotSrc = nodeData.screenshot
    ? `${screenshotBasePath}/${nodeData.screenshot}`
    : undefined;

  return (
    <div
      style={{
        width: 180,
        borderRadius: 8,
        position: 'relative' as const,
        border: `2px solid ${selected ? colors.border : isDark ? '#2a2a3a' : '#d0d0d8'}`,
        background: isDark ? '#14141e' : '#fff',
        overflow: 'visible',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: selected ? `0 0 12px ${colors.border}44` : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {flowStepNumber != null && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#3355aa',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
            border: '2px solid #fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          {flowStepNumber}
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: 100,
          background: isDark ? '#1a1a28' : '#f0f0f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={nodeData.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <span style={{ fontSize: 28, opacity: 0.2 }}>&#x2B21;</span>
        )}
      </div>

      <div
        style={{
          padding: '6px 10px',
          borderTop: `2px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isDark ? '#e0e0e8' : '#333',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {nodeData.label}
          {Boolean(nodeData.metadata?.authRequired) && (
            <span
              style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 3,
                background: isDark ? '#2a1a18' : '#fef0e0',
                color: isDark ? '#c87850' : '#a05020',
              }}
              title="Authentication required"
            >
              &#x1F512;
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 10,
            color: colors.text,
            fontFamily: "'SF Mono', Monaco, monospace",
            opacity: 0.8,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {nodeData.route}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export const PageNode = memo(PageNodeComponent);
