import type { CSSProperties } from 'react';
import type { NavMapFlowStep } from '../../types';

interface GalleryViewerHeaderProps {
  nodeLabel: string;
  flowName: string;
  isDark: boolean;
  onClose: () => void;
}

export function GalleryViewerHeader({
  nodeLabel,
  flowName,
  isDark,
  onClose,
}: GalleryViewerHeaderProps) {
  return (
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
  );
}

interface GalleryViewerMediaProps {
  current: NavMapFlowStep;
  isDark: boolean;
  screenshotSrc: string | undefined;
}

export function GalleryViewerMedia({ current, isDark, screenshotSrc }: GalleryViewerMediaProps) {
  return (
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
  );
}

interface GalleryViewerMetadataProps {
  current: NavMapFlowStep;
  isDark: boolean;
}

export function GalleryViewerMetadata({ current, isDark }: GalleryViewerMetadataProps) {
  return (
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
  );
}

interface GalleryViewerFilmstripProps {
  currentIndex: number;
  isDark: boolean;
  screenshotBasePath: string;
  stepsWithScreenshots: NavMapFlowStep[];
  onSelect: (index: number) => void;
}

export function GalleryViewerFilmstrip({
  currentIndex,
  isDark,
  screenshotBasePath,
  stepsWithScreenshots,
  onSelect,
}: GalleryViewerFilmstripProps) {
  return (
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
        const thumbSrc = step.screenshot ? `${screenshotBasePath}/${step.screenshot}` : undefined;
        const isActive = i === currentIndex;

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
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
  );
}

interface GalleryViewerNavigationProps {
  currentIndex: number;
  isDark: boolean;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function GalleryViewerNavigation({
  currentIndex,
  isDark,
  totalCount,
  onPrevious,
  onNext,
}: GalleryViewerNavigationProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalCount - 1;

  return (
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
      <button onClick={onPrevious} disabled={isFirst} style={navBtnStyle(isDark, isFirst)}>
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
        {currentIndex + 1} / {totalCount}
      </span>
      <button onClick={onNext} disabled={isLast} style={navBtnStyle(isDark, isLast)}>
        Next &#x2192;
      </button>
    </div>
  );
}

function navBtnStyle(isDark: boolean, disabled: boolean): CSSProperties {
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
