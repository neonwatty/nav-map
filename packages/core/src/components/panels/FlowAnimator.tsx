import { useState, useEffect, useRef, useCallback } from 'react';
import type { Node } from '@xyflow/react';

interface FlowAnimatorProps {
  flowSteps: string[];
  nodes: Node[];
  isAnimating: boolean;
  onAnimationEnd: () => void;
  viewport?: { x: number; y: number; zoom: number };
}

const DOT_RADIUS = 8;
const TRAVEL_DURATION_MS = 800;
const PAUSE_DURATION_MS = 1000;
const PULSE_SCALE = 1.4;

export function FlowAnimator({
  flowSteps,
  nodes,
  isAnimating,
  onAnimationEnd,
  viewport,
}: FlowAnimatorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dotPosition, setDotPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animFrameRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const nodePositions = useRef(new Map<string, { x: number; y: number }>());
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      if (node.type === 'groupNode') continue;
      const w = node.measured?.width ?? 180;
      const h = node.measured?.height ?? 140;
      let px = node.position.x + w / 2;
      let py = node.position.y + h / 2;
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) { px += parent.position.x; py += parent.position.y; }
      }
      map.set(node.id, { x: px, y: py });
    }
    nodePositions.current = map;
  }, [nodes]);

  useEffect(() => {
    if (isAnimating) {
      setCurrentStepIndex(0);
      const firstPos = nodePositions.current.get(flowSteps[0]);
      if (firstPos) setDotPosition(firstPos);
    } else {
      setDotPosition(null);
      setCurrentStepIndex(0);
    }
  }, [isAnimating, flowSteps]);

  const animateToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= flowSteps.length) { onAnimationEnd(); return; }

    const fromPos = nodePositions.current.get(flowSteps[currentStepIndex]);
    const toPos = nodePositions.current.get(flowSteps[nextIndex]);
    if (!fromPos || !toPos) { onAnimationEnd(); return; }

    setIsPaused(true);
    timeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / TRAVEL_DURATION_MS, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setDotPosition({
          x: fromPos.x + (toPos.x - fromPos.x) * eased,
          y: fromPos.y + (toPos.y - fromPos.y) * eased,
        });
        if (t < 1) { animFrameRef.current = requestAnimationFrame(animate); }
        else { setCurrentStepIndex(nextIndex); }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }, PAUSE_DURATION_MS);
  }, [currentStepIndex, flowSteps, onAnimationEnd]);

  useEffect(() => {
    if (!isAnimating || !dotPosition) return;
    animateToNextStep();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentStepIndex, isAnimating]);

  if (!isAnimating || !dotPosition) return null;

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 25, overflow: 'visible' }}>
      <g transform={viewport ? `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})` : undefined}>
        <circle cx={dotPosition.x} cy={dotPosition.y} r={DOT_RADIUS * (isPaused ? PULSE_SCALE : 1)} fill="none" stroke="#3355aa" strokeWidth={2} opacity={isPaused ? 0.5 : 0} style={{ transition: 'r 0.3s ease, opacity 0.3s ease' }} />
        <circle cx={dotPosition.x} cy={dotPosition.y} r={DOT_RADIUS} fill="#3355aa" stroke="#fff" strokeWidth={2} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        <text x={dotPosition.x} y={dotPosition.y + 1} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={9} fontWeight={700}>
          {currentStepIndex + 1}
        </text>
      </g>
    </svg>
  );
}
