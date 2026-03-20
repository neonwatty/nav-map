import { memo, useState } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useNavMapContext } from '../../hooks/useNavMap';

interface NavEdgeData {
  label?: string;
  edgeType?: string;
  elkPath?: string;
  bundledPath?: string;
  alwaysShowLabel?: boolean;
  [key: string]: unknown;
}

function NavEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const edgeData = data as NavEdgeData | undefined;
  const { edgeMode } = useNavMapContext();

  // Smooth step path: orthogonal routing with rounded corners
  const [smoothPath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  // Select edge path based on mode, with fallback to smooth
  const edgePath = (() => {
    if (edgeMode === 'routed' && edgeData?.elkPath) {
      // ELK section endpoints are at node borders; React Flow handles are at
      // node centers. Only fall back if nodes have been significantly dragged
      // (>200px displacement indicates manual repositioning, not coordinate offset).
      const elkPath = edgeData.elkPath;
      const firstM = elkPath.match(/^M\s+([\d.-]+)\s+([\d.-]+)/);
      const lastL = elkPath.match(/[ML]\s+([\d.-]+)\s+([\d.-]+)\s*$/);
      if (firstM && lastL) {
        const dx1 = Math.abs(sourceX - parseFloat(firstM[1]));
        const dy1 = Math.abs(sourceY - parseFloat(firstM[2]));
        const dx2 = Math.abs(targetX - parseFloat(lastL[1]));
        const dy2 = Math.abs(targetY - parseFloat(lastL[2]));
        if (dx1 > 200 || dy1 > 200 || dx2 > 200 || dy2 > 200) return smoothPath;
      }
      return elkPath;
    }
    if (edgeMode === 'bundled' && edgeData?.bundledPath) {
      return edgeData.bundledPath;
    }
    return smoothPath;
  })();

  const isRedirect = edgeData?.edgeType === 'redirect';
  const isSharedNav = edgeData?.edgeType === 'shared-nav';
  const showLabel = edgeData?.label && (edgeData.alwaysShowLabel || hovered || selected);

  return (
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#5b9bf5' : isRedirect ? '#f0a050' : isSharedNav ? '#444' : '#555',
          strokeWidth: selected ? 2.5 : hovered ? 2 : isSharedNav ? 1 : 1.5,
          strokeDasharray: isRedirect ? '6 3' : isSharedNav ? '3 3' : undefined,
          opacity: isSharedNav && !hovered && !selected ? 0.4 : undefined,
          transition: 'stroke 0.15s, stroke-width 0.15s, opacity 0.15s',
        }}
      />
      {/* Wider invisible path for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {hovered && !showLabel && edgeData?.edgeType && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 14}
          width={100}
          height={28}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              fontSize: 9,
              color: '#aaa',
              background: 'rgba(20, 20, 30, 0.85)',
              padding: '3px 6px',
              borderRadius: 3,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              width: 'fit-content',
              margin: '0 auto',
            }}
          >
            {edgeData.edgeType}
          </div>
        </foreignObject>
      )}
      {showLabel && (
        <foreignObject
          x={labelX - 70}
          y={labelY - 14}
          width={140}
          height={28}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#fff',
              background: 'rgba(20, 20, 30, 0.9)',
              padding: '3px 8px',
              borderRadius: 4,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              width: 'fit-content',
              margin: '0 auto',
            }}
          >
            {edgeData?.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export const NavEdge = memo(NavEdgeComponent);
