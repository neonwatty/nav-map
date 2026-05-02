import type { Node } from '@xyflow/react';
import type { NavMapGraph } from '../../types';
import { FlowAnimator } from './FlowAnimator';

interface FlowAnimationOverlayProps {
  isDark: boolean;
  isAnimatingFlow: boolean;
  selectedFlowIndex: number | null;
  graph: NavMapGraph | null;
  layoutDone: boolean;
  nodes: Node[];
  viewport: { x: number; y: number; zoom: number };
  onAnimationEnd: () => void;
  onStop: () => void;
}

export function FlowAnimationOverlay({
  isDark,
  isAnimatingFlow,
  selectedFlowIndex,
  graph,
  layoutDone,
  nodes,
  viewport,
  onAnimationEnd,
  onStop,
}: FlowAnimationOverlayProps) {
  if (!isAnimatingFlow) return null;

  const accent = isDark ? '#7aacff' : '#3355aa';
  const flow = selectedFlowIndex !== null ? graph?.flows?.[selectedFlowIndex] : undefined;
  const canRenderAnimator = Boolean(flow && layoutDone);

  return (
    <>
      {canRenderAnimator && flow && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 25,
            overflow: 'hidden',
          }}
        >
          <FlowAnimator
            flowSteps={flow.steps}
            nodes={nodes}
            isAnimating={isAnimatingFlow}
            onAnimationEnd={onAnimationEnd}
            viewport={viewport}
          />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
          border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
          borderRadius: 8,
          padding: '8px 16px',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
        role="status"
        aria-live="polite"
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>
          {flow ? `Animating: ${flow.name}` : 'Preparing flow animation...'}
        </span>
        <button
          onClick={onStop}
          style={{
            background: 'none',
            border: `1px solid ${isDark ? '#333' : '#ccc'}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: isDark ? '#888' : '#666',
            cursor: 'pointer',
          }}
        >
          Stop
        </button>
      </div>
    </>
  );
}
