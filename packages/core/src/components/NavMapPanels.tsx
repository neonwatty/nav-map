import type { Node } from '@xyflow/react';
import type { NavMapGraph, ViewMode } from '../types';
import type { RouteHealthIssue } from '../utils/routeHealth';
import { FlowAnimationOverlay } from './panels/FlowAnimationOverlay';
import { CoverageSummary } from './panels/CoverageSummary';
import { LegendPanel } from './panels/LegendPanel';
import { HierarchyControls } from './panels/HierarchyControls';
import { RouteHealthPanel } from './panels/RouteHealthPanel';

interface NavMapPanelsProps {
  graph: NavMapGraph | null;
  isDark: boolean;
  showRouteHealth: boolean;
  viewMode: ViewMode;
  hierarchyExpandedGroups: Set<string>;
  isAnimatingFlow: boolean;
  selectedFlowIndex: number | null;
  layoutDone: boolean;
  nodes: Node[];
  viewport: { x: number; y: number; zoom: number };
  onCloseRouteHealth: () => void;
  onNavigate: (nodeId: string) => void;
  onIssueFocus: (issue: RouteHealthIssue) => void;
  onExpandAllHierarchyGroups: () => void;
  onCollapseAllHierarchyGroups: () => void;
  onAnimationEnd: () => void;
  onStopAnimation: () => void;
}

export function NavMapPanels({
  graph,
  isDark,
  showRouteHealth,
  viewMode,
  hierarchyExpandedGroups,
  isAnimatingFlow,
  selectedFlowIndex,
  layoutDone,
  nodes,
  viewport,
  onCloseRouteHealth,
  onNavigate,
  onIssueFocus,
  onExpandAllHierarchyGroups,
  onCollapseAllHierarchyGroups,
  onAnimationEnd,
  onStopAnimation,
}: NavMapPanelsProps) {
  return (
    <>
      {graph && <LegendPanel groups={graph.groups} />}
      <CoverageSummary />

      {graph && showRouteHealth && (
        <RouteHealthPanel
          graph={graph}
          isDark={isDark}
          onClose={onCloseRouteHealth}
          onNavigate={onNavigate}
          onIssueFocus={onIssueFocus}
        />
      )}

      {viewMode === 'hierarchy' && graph && (
        <HierarchyControls
          allGroupIds={graph.groups.map(group => group.id)}
          expandedGroups={hierarchyExpandedGroups}
          onExpandAll={onExpandAllHierarchyGroups}
          onCollapseAll={onCollapseAllHierarchyGroups}
        />
      )}

      <FlowAnimationOverlay
        isDark={isDark}
        isAnimatingFlow={isAnimatingFlow}
        selectedFlowIndex={selectedFlowIndex}
        graph={graph}
        layoutDone={layoutDone}
        nodes={nodes}
        viewport={viewport}
        onAnimationEnd={onAnimationEnd}
        onStop={onStopAnimation}
      />
    </>
  );
}
