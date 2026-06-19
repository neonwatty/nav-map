import type { AnalyticsAdapter } from '../analytics/types';
import type { EdgeMode, NavMapGraph, NavMapPreviewMode, ViewMode } from '../types';
import type { WorkflowFilter } from '../workflowFilters';
import type { WalkthroughState } from '../hooks/useWalkthrough';
import { NavMapToolbar } from './panels/NavMapToolbar';
import { StatusBanners } from './panels/StatusBanners';
import { WalkthroughBar } from './panels/WalkthroughBar';
import { WorkflowOverview } from './panels/WorkflowOverview';

interface NavMapChromeProps {
  graph: NavMapGraph | null;
  isDark: boolean;
  hideToolbar: boolean;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  treeRootId: string | null;
  focusedGroupId: string | null;
  auditFocusLabel?: string | null;
  showSharedNav: boolean;
  showRedirects: boolean;
  focusMode: boolean;
  showSearch: boolean;
  edgeMode: EdgeMode;
  isAnimatingFlow: boolean;
  showAnalytics: boolean;
  showRouteHealth: boolean;
  analyticsAdapter?: AnalyticsAdapter;
  showCoverage: boolean;
  hasCoverageData: boolean;
  previewMode: NavMapPreviewMode;
  workflowFilter: WorkflowFilter | null;
  walkthrough: WalkthroughState;
  onViewModeChange: (mode: ViewMode) => void;
  onFlowSelect: (index: number | null) => void;
  onResetView: () => void;
  onToggleSharedNav: () => void;
  onToggleRedirects: () => void;
  onToggleFocusMode: () => void;
  onEdgeModeChange: (mode: EdgeMode) => void;
  onAnimate: () => void;
  onToggleAnalytics: () => void;
  onToggleRouteHealth: () => void;
  onSearch: () => void;
  onHelp: () => void;
  onToggleCoverage: () => void;
  onPreviewModeChange: (mode: NavMapPreviewMode) => void;
  onClearFocus: () => void;
  onClearAuditFocus: () => void;
  onClearSearch: () => void;
  onWorkflowFilterChange: (filter: WorkflowFilter | null) => void;
  onWalkthroughGoTo: (index: number) => void;
  onWalkthroughPresent: () => void;
  onWalkthroughClear: () => void;
}

export function NavMapChrome({
  graph,
  isDark,
  hideToolbar,
  viewMode,
  selectedFlowIndex,
  treeRootId,
  focusedGroupId,
  auditFocusLabel,
  showSharedNav,
  showRedirects,
  focusMode,
  showSearch,
  edgeMode,
  isAnimatingFlow,
  showAnalytics,
  showRouteHealth,
  analyticsAdapter,
  showCoverage,
  hasCoverageData,
  previewMode,
  workflowFilter,
  walkthrough,
  onViewModeChange,
  onFlowSelect,
  onResetView,
  onToggleSharedNav,
  onToggleRedirects,
  onToggleFocusMode,
  onEdgeModeChange,
  onAnimate,
  onToggleAnalytics,
  onToggleRouteHealth,
  onSearch,
  onHelp,
  onToggleCoverage,
  onPreviewModeChange,
  onClearFocus,
  onClearAuditFocus,
  onClearSearch,
  onWorkflowFilterChange,
  onWalkthroughGoTo,
  onWalkthroughPresent,
  onWalkthroughClear,
}: NavMapChromeProps) {
  return (
    <>
      {!hideToolbar && (
        <NavMapToolbar
          graph={graph}
          viewMode={viewMode}
          selectedFlowIndex={selectedFlowIndex}
          showSharedNav={showSharedNav}
          showRedirects={showRedirects}
          focusMode={focusMode}
          edgeMode={edgeMode}
          isAnimatingFlow={isAnimatingFlow}
          showAnalytics={showAnalytics}
          showRouteHealth={showRouteHealth}
          analyticsAdapter={analyticsAdapter}
          onViewModeChange={onViewModeChange}
          onFlowSelect={onFlowSelect}
          onResetView={onResetView}
          onToggleSharedNav={onToggleSharedNav}
          onToggleRedirects={onToggleRedirects}
          onToggleFocusMode={onToggleFocusMode}
          onEdgeModeChange={onEdgeModeChange}
          onAnimate={onAnimate}
          onToggleAnalytics={onToggleAnalytics}
          onToggleRouteHealth={onToggleRouteHealth}
          onSearch={onSearch}
          onHelp={onHelp}
          showCoverage={showCoverage}
          hasCoverageData={hasCoverageData}
          onToggleCoverage={onToggleCoverage}
          previewMode={previewMode}
          onPreviewModeChange={onPreviewModeChange}
        />
      )}

      <WorkflowOverview
        graph={graph}
        isDark={isDark}
        viewMode={viewMode}
        selectedFlowIndex={selectedFlowIndex}
        activeFilter={workflowFilter}
        onFilterChange={onWorkflowFilterChange}
      />

      <StatusBanners
        isDark={isDark}
        viewMode={viewMode}
        selectedFlowIndex={selectedFlowIndex}
        treeRootId={treeRootId}
        focusedGroupId={focusedGroupId}
        auditFocusLabel={auditFocusLabel}
        focusMode={focusMode}
        showCoverage={showCoverage}
        showSearch={showSearch}
        workflowFilter={workflowFilter}
        graph={graph}
        onClearFocus={onClearFocus}
        onClearAuditFocus={onClearAuditFocus}
        onClearSearch={onClearSearch}
        onClearWorkflowFilter={() => onWorkflowFilterChange(null)}
      />

      {graph && (
        <WalkthroughBar
          path={walkthrough.path}
          nodes={graph.nodes}
          onGoTo={onWalkthroughGoTo}
          onPresent={onWalkthroughPresent}
          onClear={onWalkthroughClear}
        />
      )}
    </>
  );
}
