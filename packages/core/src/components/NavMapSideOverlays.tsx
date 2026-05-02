import type { Dispatch, SetStateAction } from 'react';
import type { NavMapGraph, NavMapNode } from '../types';
import type { NavMapAnalytics } from '../analytics/types';
import type { WalkthroughState } from '../hooks/useWalkthrough';
import { ConnectionPanel } from './panels/ConnectionPanel';
import { ContextMenu } from './panels/ContextMenu';
import { NavMapOverlays } from './panels/NavMapOverlays';

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  route: string;
  filePath?: string;
}

interface HoverPreview {
  screenshot?: string;
  label: string;
  position: { x: number; y: number } | null;
}

interface NavMapSideOverlaysProps {
  graph: NavMapGraph | null;
  selectedNode?: NavMapNode;
  isDark: boolean;
  isNarrow: boolean;
  contextMenu: ContextMenuState | null;
  showHelp: boolean;
  showSearch: boolean;
  showAnalytics: boolean;
  hoverPreview: HoverPreview | null;
  analyticsData: NavMapAnalytics | null;
  analyticsPeriod: NavMapAnalytics['period'];
  walkthrough: WalkthroughState;
  galleryNodeId: string | null;
  screenshotBasePath: string;
  onNavigate: (nodeId: string) => void;
  onCloseContextMenu: () => void;
  onCloseHelp: () => void;
  onCloseSearch: () => void;
  onCloseAnalytics: () => void;
  onSearchSelect: (nodeId: string) => void;
  onSearchQueryChange: Dispatch<SetStateAction<string>>;
  onPeriodChange: Dispatch<SetStateAction<NavMapAnalytics['period']>>;
  onCloseGallery: () => void;
}

export function NavMapSideOverlays({
  graph,
  selectedNode,
  isDark,
  isNarrow,
  contextMenu,
  showHelp,
  showSearch,
  showAnalytics,
  hoverPreview,
  analyticsData,
  analyticsPeriod,
  walkthrough,
  galleryNodeId,
  screenshotBasePath,
  onNavigate,
  onCloseContextMenu,
  onCloseHelp,
  onCloseSearch,
  onCloseAnalytics,
  onSearchSelect,
  onSearchQueryChange,
  onPeriodChange,
  onCloseGallery,
}: NavMapSideOverlaysProps) {
  return (
    <>
      {selectedNode && graph && (
        <ConnectionPanel
          node={selectedNode}
          edges={graph.edges}
          nodes={graph.nodes}
          onNavigate={onNavigate}
          isNarrow={isNarrow}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          route={contextMenu.route}
          filePath={contextMenu.filePath}
          baseUrl={graph?.meta.baseUrl}
          onClose={onCloseContextMenu}
        />
      )}

      <NavMapOverlays
        graph={graph}
        isDark={isDark}
        showHelp={showHelp}
        showSearch={showSearch}
        showAnalytics={showAnalytics}
        hoverPreview={hoverPreview}
        analyticsData={analyticsData}
        analyticsPeriod={analyticsPeriod}
        walkthrough={walkthrough}
        galleryNodeId={galleryNodeId}
        screenshotBasePath={screenshotBasePath}
        onCloseHelp={onCloseHelp}
        onCloseSearch={onCloseSearch}
        onCloseAnalytics={onCloseAnalytics}
        onSearchSelect={onSearchSelect}
        onSearchQueryChange={onSearchQueryChange}
        onPeriodChange={onPeriodChange}
        onCloseGallery={onCloseGallery}
      />
    </>
  );
}
