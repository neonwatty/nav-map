import type { NavMapGraph, NavMapFlowStep } from '../../types';
import type { NavMapAnalytics } from '../../analytics/types';
import type { WalkthroughState } from '../../hooks/useWalkthrough';
import { HelpOverlay } from './HelpOverlay';
import { SearchPanel } from './SearchPanel';
import { HoverPreview } from './HoverPreview';
import { AnalyticsOverlay } from './AnalyticsOverlay';
import { PresentationBar } from './PresentationBar';
import { GalleryViewer } from './GalleryViewer';

interface NavMapOverlaysProps {
  graph: NavMapGraph | null;
  isDark: boolean;
  showHelp: boolean;
  showSearch: boolean;
  showAnalytics: boolean;
  hoverPreview: {
    screenshot?: string;
    label: string;
    position: { x: number; y: number } | null;
  } | null;
  analyticsData: NavMapAnalytics | null;
  analyticsPeriod: { start: string; end: string };
  walkthrough: WalkthroughState;
  galleryNodeId: string | null;
  screenshotBasePath: string;
  onCloseHelp: () => void;
  onCloseSearch: () => void;
  onCloseAnalytics: () => void;
  onSearchSelect: (nodeId: string) => void;
  onSearchQueryChange?: (query: string) => void;
  onPeriodChange: (period: { start: string; end: string }) => void;
  onCloseGallery: () => void;
}

export function NavMapOverlays({
  graph,
  isDark,
  showHelp,
  showSearch,
  showAnalytics,
  hoverPreview,
  analyticsData,
  analyticsPeriod,
  walkthrough,
  galleryNodeId,
  screenshotBasePath,
  onCloseHelp,
  onCloseSearch,
  onCloseAnalytics,
  onSearchSelect,
  onSearchQueryChange,
  onPeriodChange,
  onCloseGallery,
}: NavMapOverlaysProps) {
  return (
    <>
      <HelpOverlay isOpen={showHelp} onClose={onCloseHelp} />

      {graph && (
        <SearchPanel
          nodes={graph.nodes}
          isOpen={showSearch}
          onClose={onCloseSearch}
          onSelect={onSearchSelect}
          isDark={isDark}
          onQueryChange={onSearchQueryChange}
        />
      )}

      {hoverPreview && (
        <HoverPreview
          screenshot={hoverPreview.screenshot}
          label={hoverPreview.label}
          position={hoverPreview.position}
        />
      )}

      {showAnalytics && (
        <AnalyticsOverlay
          analytics={analyticsData}
          isVisible={showAnalytics}
          onClose={onCloseAnalytics}
          period={analyticsPeriod}
          onPeriodChange={onPeriodChange}
        />
      )}

      {walkthrough.mode === 'presentation' && graph && (
        <PresentationBar
          currentNodeId={walkthrough.currentNodeId}
          nodes={graph.nodes}
          stepLabel={walkthrough.stepLabel}
          canGoBack={walkthrough.canGoBack}
          canGoForward={walkthrough.canGoForward}
          onBack={walkthrough.goBack}
          onForward={walkthrough.goForward}
          onExit={() => walkthrough.setMode('explore')}
          screenshotBasePath={screenshotBasePath}
        />
      )}

      {galleryNodeId &&
        (() => {
          const flow = graph?.flows?.find(
            (f: { gallery?: Record<string, NavMapFlowStep[]> }) =>
              f.gallery?.[galleryNodeId]?.length
          );
          if (!flow?.gallery?.[galleryNodeId]) return null;
          return (
            <GalleryViewer
              nodeLabel={graph?.nodes.find(n => n.id === galleryNodeId)?.label ?? galleryNodeId}
              steps={flow.gallery[galleryNodeId]}
              flowName={flow.name}
              onClose={onCloseGallery}
            />
          );
        })()}
    </>
  );
}
