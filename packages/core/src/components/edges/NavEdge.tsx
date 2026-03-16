import { memo, useState } from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

interface NavEdgeData {
  label?: string;
  edgeType?: string;
  alwaysShowLabel?: boolean;
  points?: { x: number; y: number }[];
  [key: string]: unknown;
}

function buildOrthogonalPath(
  points: { x: number; y: number }[],
  radius = 8
): string {
  if (points.length < 2) return '';

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = Math.sign(curr.x - prev.x);
    const dy1 = Math.sign(curr.y - prev.y);
    const dx2 = Math.sign(next.x - curr.x);
    const dy2 = Math.sign(next.y - curr.y);

    const seg1 = Math.max(Math.abs(curr.x - prev.x), Math.abs(curr.y - prev.y));
    const seg2 = Math.max(Math.abs(next.x - curr.x), Math.abs(next.y - curr.y));
    const r = Math.min(radius, seg1 / 2, seg2 / 2);

    const arcStartX = curr.x - dx1 * r;
    const arcStartY = curr.y - dy1 * r;
    parts.push(`L ${arcStartX} ${arcStartY}`);

    const arcEndX = curr.x + dx2 * r;
    const arcEndY = curr.y + dy2 * r;
    parts.push(`Q ${curr.x} ${curr.y} ${arcEndX} ${arcEndY}`);
  }

  const last = points[points.length - 1];
  parts.push(`L ${last.x} ${last.y}`);

  return parts.join(' ');
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
  const orthogonalPoints = edgeData?.points;

  // Use orthogonal path if ELK provided bend points, otherwise fallback to bezier
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (orthogonalPoints && orthogonalPoints.length >= 2) {
    edgePath = buildOrthogonalPath(orthogonalPoints);
    const mid = orthogonalPoints[Math.floor(orthogonalPoints.length / 2)];
    labelX = mid.x;
    labelY = mid.y;
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    });
  }

  const isRedirect = edgeData?.edgeType === 'redirect';
  const isSharedNav = edgeData?.edgeType === 'shared-nav';
  const showLabel = edgeData?.label && (
    edgeData.alwaysShowLabel || hovered || selected
  );

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
