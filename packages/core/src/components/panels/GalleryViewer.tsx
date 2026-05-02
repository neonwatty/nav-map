import { useState } from 'react';
import { useNavMapContext } from '../../hooks/useNavMap';
import type { NavMapFlowStep } from '../../types';
import {
  GalleryViewerFilmstrip,
  GalleryViewerHeader,
  GalleryViewerMedia,
  GalleryViewerMetadata,
  GalleryViewerNavigation,
} from './GalleryViewerParts';
import { PanelEmptyState } from './PanelEmptyState';

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
        <GalleryViewerHeader
          nodeLabel={nodeLabel}
          flowName={flowName}
          isDark={isDark}
          onClose={onClose}
        />
        {current ? (
          <>
            <GalleryViewerMedia current={current} isDark={isDark} screenshotSrc={screenshotSrc} />
            <GalleryViewerMetadata current={current} isDark={isDark} />
            <GalleryViewerFilmstrip
              currentIndex={currentIndex}
              isDark={isDark}
              screenshotBasePath={screenshotBasePath}
              stepsWithScreenshots={stepsWithScreenshots}
              onSelect={setCurrentIndex}
            />
            <GalleryViewerNavigation
              currentIndex={currentIndex}
              isDark={isDark}
              totalCount={stepsWithScreenshots.length}
              onPrevious={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              onNext={() =>
                setCurrentIndex(Math.min(stepsWithScreenshots.length - 1, currentIndex + 1))
              }
            />
          </>
        ) : (
          <PanelEmptyState
            isDark={isDark}
            icon="▧"
            title="No screenshots captured"
            description="This flow has interaction steps, but none include screenshots yet. Re-record with screenshots enabled to build a visual gallery."
          />
        )}
      </div>
    </div>
  );
}
