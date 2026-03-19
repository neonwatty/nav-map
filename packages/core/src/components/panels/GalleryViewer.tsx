import { useState } from 'react';
import { useNavMapContext } from '../../hooks/useNavMap';
import type { NavMapFlowStep } from '../../types';

interface GalleryViewerProps {
  nodeLabel: string;
  steps: NavMapFlowStep[];
  flowName: string;
  onClose: () => void;
}

export function GalleryViewer({ nodeLabel, steps, flowName, onClose }: GalleryViewerProps) {
  const { isDark, screenshotBasePath } = useNavMapContext();
  const [currentIndex, setCurrentIndex] = useState(0);

  const stepsWithScreenshots = steps.filter(s => s.screenshot);
  if (stepsWithScreenshots.length === 0) return null;

  const current = stepsWithScreenshots[currentIndex];
  const screenshotSrc = current?.screenshot
    ? `${screenshotBasePath}/${current.screenshot}`
    : undefined;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(5, 5, 10, 0.9)' : 'rgba(200, 200, 210, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: isDark ? '#14141e' : '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: 900,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark ? '0 16px 60px rgba(0,0,0,0.6)' : '0 16px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: isDark ? '#e0e0e8' : '#222',
              }}
            >
              {nodeLabel}
            </div>
            <div
              style={{
                fontSize: 12,
                color: isDark ? '#666' : '#999',
                marginTop: 2,
              }}
            >
              Flow: {flowName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: isDark ? '#555' : '#aaa',
              cursor: 'pointer',
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Screenshot */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? '#0a0a0f' : '#f4f5f8',
            minHeight: 400,
          }}
        >
          {screenshotSrc ? (
            <img
              src={screenshotSrc}
              alt={current.title}
              style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
            />
          ) : (
            <div style={{ color: isDark ? '#444' : '#bbb', fontSize: 14 }}>No screenshot</div>
          )}
        </div>

        {/* Step info */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
            fontSize: 13,
            color: isDark ? '#888' : '#666',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: isDark ? '#5b9bf5' : '#3355aa',
              marginRight: 8,
            }}
          >
            {current.action}
          </span>
          {current.title}
        </div>

        {/* Filmstrip */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 20px',
            overflowX: 'auto',
            borderTop: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
            background: isDark ? '#101018' : '#f8f8fa',
          }}
        >
          {stepsWithScreenshots.map((step, i) => {
            const thumbSrc = step.screenshot
              ? `${screenshotBasePath}/${step.screenshot}`
              : undefined;
            const isActive = i === currentIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                style={{
                  flexShrink: 0,
                  width: 120,
                  height: 75,
                  border: `2px solid ${isActive ? '#5b9bf5' : isDark ? '#2a2a3a' : '#d0d0d8'}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: isDark ? '#1a1a28' : '#fff',
                  padding: 0,
                  position: 'relative',
                }}
              >
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={step.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: isDark ? '#444' : '#bbb',
                    }}
                  >
                    No image
                  </div>
                )}
                {/* Step number badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: isActive ? '#5b9bf5' : 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '10px 20px',
            borderTop: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
          }}
        >
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={navBtnStyle(isDark, currentIndex === 0)}
          >
            &#x2190; Prev
          </button>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? '#888' : '#666',
              minWidth: 60,
              textAlign: 'center',
            }}
          >
            {currentIndex + 1} / {stepsWithScreenshots.length}
          </span>
          <button
            onClick={() =>
              setCurrentIndex(Math.min(stepsWithScreenshots.length - 1, currentIndex + 1))
            }
            disabled={currentIndex === stepsWithScreenshots.length - 1}
            style={navBtnStyle(isDark, currentIndex === stepsWithScreenshots.length - 1)}
          >
            Next &#x2192;
          </button>
        </div>
      </div>
    </div>
  );
}

function navBtnStyle(isDark: boolean, disabled: boolean): React.CSSProperties {
  return {
    background: isDark ? '#1a1a28' : '#f0f2f8',
    border: `1px solid ${isDark ? '#2a2a3a' : '#d0d0d8'}`,
    borderRadius: 6,
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: disabled ? (isDark ? '#333' : '#ccc') : isDark ? '#c8c8d0' : '#333',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
