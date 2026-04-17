import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { RFNodeData } from '../../utils/graphHelpers';
import { useNavMapContext } from '../../hooks/useNavMap';

function CompactNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RFNodeData;
  const flowStepNumber = (data as Record<string, unknown>).flowStepNumber as number | undefined;
  const hasGallery = Boolean((data as Record<string, unknown>).hasGallery);
  const { isDark, getGroupColors, showCoverage } = useNavMapContext();
  const colors = getGroupColors(nodeData.group);

  const coverageStatus = showCoverage
    ? (nodeData.metadata?.coverage as { status?: string } | undefined)?.status
    : undefined;

  const coverageBorderColor =
    coverageStatus === 'covered'
      ? '#22c55e'
      : coverageStatus === 'failing'
        ? '#eab308'
        : coverageStatus === 'uncovered'
          ? '#ef4444'
          : undefined;

  return (
    <div
      style={{
        padding: '8px 16px',
        borderRadius: 6,
        position: 'relative' as const,
        border: `2px solid ${coverageBorderColor ?? (selected ? colors.border : isDark ? '#2a2a3a' : '#d0d0d8')}`,
        background: colors.bg,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: selected ? `0 0 12px ${colors.border}44` : 'none',
        minWidth: 100,
        textAlign: 'center' as const,
        overflow: 'visible',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {flowStepNumber != null && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#3355aa',
            color: '#fff',
            fontSize: 11,
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
          <span style={{ fontSize: 8 }} title="Auth required">
            &#x1F512;
          </span>
        )}
        {coverageStatus && (
          <span
            style={{
              fontSize: 8,
              padding: '1px 5px',
              borderRadius: 3,
              background:
                coverageStatus === 'covered'
                  ? isDark
                    ? '#0a2a10'
                    : '#dcfce7'
                  : coverageStatus === 'failing'
                    ? isDark
                      ? '#2a2a0a'
                      : '#fef9c3'
                    : isDark
                      ? '#2a0a0a'
                      : '#fee2e2',
              color:
                coverageStatus === 'covered'
                  ? '#22c55e'
                  : coverageStatus === 'failing'
                    ? '#eab308'
                    : '#ef4444',
            }}
            title={`Coverage: ${coverageStatus}`}
          >
            {coverageStatus === 'covered'
              ? '\u2713'
              : coverageStatus === 'failing'
                ? '!'
                : '\u2717'}
          </span>
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

      {hasGallery && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 4,
            fontSize: 10,
            color: isDark ? '#5b9bf5' : '#3355aa',
            opacity: 0.7,
          }}
          title="Double-click to view gallery"
        >
          &#x2922;
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export const CompactNode = memo(CompactNodeComponent);
