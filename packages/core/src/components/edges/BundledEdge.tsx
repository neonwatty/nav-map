import { memo, useState } from 'react';
import { type EdgeProps } from '@xyflow/react';

interface BundledEdgeData {
  label?: string;
  edgeType?: string;
  bundledPath?: string;
  [key: string]: unknown;
}

function BundledEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const edgeData = data as BundledEdgeData | undefined;
  const bundledPath = edgeData?.bundledPath;

  const fallbackPath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const edgePath = bundledPath ?? fallbackPath;

  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  const isRedirect = edgeData?.edgeType === 'redirect';
  const isSharedNav = edgeData?.edgeType === 'shared-nav';

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={
          selected ? '#5b9bf5'
            : isRedirect ? '#f0a050'
            : isSharedNav ? '#444'
            : '#555'
        }
        strokeWidth={selected ? 2.5 : hovered ? 2 : isSharedNav ? 0.8 : 1.2}
        strokeDasharray={isRedirect ? '6 3' : isSharedNav ? '3 3' : undefined}
        opacity={isSharedNav && !hovered && !selected ? 0.3 : 0.6}
        style={{
          transition: 'stroke 0.15s, stroke-width 0.15s, opacity 0.15s',
          ...style,
        }}
      />
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      {hovered && edgeData?.label && (
        <foreignObject
          x={labelX - 70} y={labelY - 14} width={140} height={28}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div style={{ fontSize: 10, fontWeight: 500, color: '#fff', background: 'rgba(20,20,30,0.9)', padding: '3px 8px', borderRadius: 4, textAlign: 'center', whiteSpace: 'nowrap', width: 'fit-content', margin: '0 auto' }}>
            {edgeData.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export const BundledEdge = memo(BundledEdgeComponent);
