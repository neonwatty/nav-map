import type { ComponentProps, CSSProperties, Dispatch, RefObject, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { AnalyticsAdapter } from '../analytics/types';
import { NavMapContext, type NavMapContextValue } from '../hooks/useNavMap';
import type { WalkthroughState } from '../hooks/useWalkthrough';
import type { EdgeMode, NavMapGraph, NavMapTheme, ViewMode } from '../types';
import { NavMapCanvas } from './NavMapCanvas';
import { NavMapChrome } from './NavMapChrome';
import { NavMapPanels } from './NavMapPanels';
import { NavMapSideOverlays } from './NavMapSideOverlays';

type BaseNavMapContext = Omit<NavMapContextValue, 'focusedGroupId' | 'edgeMode' | 'showCoverage'>;
type CanvasProps = ComponentProps<typeof NavMapCanvas>;
type SideOverlayProps = ComponentProps<typeof NavMapSideOverlays>;

interface NavMapShellProps {
  ctx: BaseNavMapContext;
  graph: NavMapGraph | null;
  containerRef: RefObject<HTMLDivElement | null>;
  className?: string;
  style?: CSSProperties;
  theme?: NavMapTheme;
  hideToolbar: boolean;
  isNarrow: boolean;
  analyticsAdapter?: AnalyticsAdapter;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  selectedFlowIndex: number | null;
  setSelectedFlowIndex: Dispatch<SetStateAction<number | null>>;
  treeRootId: string | null;
  setTreeRootId: Dispatch<SetStateAction<string | null>>;
  focusedGroupId: string | null;
  setFocusedGroupId: Dispatch<SetStateAction<string | null>>;
  edgeMode: EdgeMode;
  setEdgeMode: Dispatch<SetStateAction<EdgeMode>>;
  showSharedNav: boolean;
  setShowSharedNav: Dispatch<SetStateAction<boolean>>;
  showRedirects: boolean;
  setShowRedirects: Dispatch<SetStateAction<boolean>>;
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  isAnimatingFlow: boolean;
  setIsAnimatingFlow: Dispatch<SetStateAction<boolean>>;
  showAnalytics: boolean;
  setShowAnalytics: Dispatch<SetStateAction<boolean>>;
  showRouteHealth: boolean;
  setShowRouteHealth: Dispatch<SetStateAction<boolean>>;
  showCoverage: boolean;
  setShowCoverage: Dispatch<SetStateAction<boolean>>;
  hasCoverageData: boolean;
  auditFocusLabel?: string | null;
  clearAuditFocus: () => void;
  walkthrough: WalkthroughState;
  layoutDone: boolean;
  nodes: Node[];
  styledNodes: Node[];
  styledEdges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  hierarchyExpandedGroups: Set<string>;
  setHierarchyExpandedGroups: Dispatch<SetStateAction<Set<string>>>;
  expandAllHierarchyGroups: () => void;
  collapseAllHierarchyGroups: () => void;
  selectedNode?: NavMapGraph['nodes'][number];
  contextMenu: SideOverlayProps['contextMenu'];
  effectiveShowHelp: boolean;
  effectiveShowSearch: boolean;
  hoverPreview: SideOverlayProps['hoverPreview'];
  analyticsData: SideOverlayProps['analyticsData'];
  analyticsPeriod: SideOverlayProps['analyticsPeriod'];
  galleryNodeId: string | null;
  screenshotBasePath: string;
  guardedSetShowHelp: Dispatch<SetStateAction<boolean>>;
  guardedSetShowSearch: Dispatch<SetStateAction<boolean>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setAnalyticsPeriod: SideOverlayProps['onPeriodChange'];
  closeContextMenu: () => void;
  closeGallery: () => void;
  navigateToNode: (nodeId: string) => void;
  navigateToNodeFromSearch: (nodeId: string) => void;
  handleAuditIssueFocus: ComponentProps<typeof NavMapPanels>['onIssueFocus'];
  fitView: (options?: { padding?: number; duration?: number }) => void;
  onNodesChange: CanvasProps['onNodesChange'];
  onEdgesChange: CanvasProps['onEdgesChange'];
  onSelectionChange: CanvasProps['onSelectionChange'];
  onNodeDragStart: CanvasProps['onNodeDragStart'];
  onNodeDragStop: CanvasProps['onNodeDragStop'];
  onNodeContextMenu: CanvasProps['onNodeContextMenu'];
  onNodeMouseEnter: CanvasProps['onNodeMouseEnter'];
  onNodeMouseLeave: CanvasProps['onNodeMouseLeave'];
  onNodeDoubleClick: CanvasProps['onNodeDoubleClick'];
}

export function NavMapShell(props: NavMapShellProps) {
  const {
    ctx,
    graph,
    containerRef,
    className,
    style,
    theme,
    focusedGroupId,
    edgeMode,
    showCoverage,
  } = props;

  return (
    <NavMapContext.Provider value={{ ...ctx, focusedGroupId, edgeMode, showCoverage }}>
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          background: ctx.isDark
            ? (theme?.dark?.background ?? '#0a0a0f')
            : (theme?.light?.background ?? '#f4f5f8'),
          color: ctx.isDark ? (theme?.dark?.text ?? '#c8c8d0') : (theme?.light?.text ?? '#333'),
          ...style,
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <NavMapChrome
            graph={graph}
            isDark={ctx.isDark}
            hideToolbar={props.hideToolbar}
            viewMode={props.viewMode}
            selectedFlowIndex={props.selectedFlowIndex}
            treeRootId={props.treeRootId}
            focusedGroupId={focusedGroupId}
            auditFocusLabel={props.auditFocusLabel}
            showSharedNav={props.showSharedNav}
            showRedirects={props.showRedirects}
            focusMode={props.focusMode}
            edgeMode={edgeMode}
            isAnimatingFlow={props.isAnimatingFlow}
            showAnalytics={props.showAnalytics}
            showRouteHealth={props.showRouteHealth}
            analyticsAdapter={props.analyticsAdapter}
            showCoverage={showCoverage}
            hasCoverageData={props.hasCoverageData}
            walkthrough={props.walkthrough}
            onViewModeChange={mode => {
              props.setViewMode(mode);
              if (mode !== 'flow') props.setSelectedFlowIndex(null);
              if (mode !== 'tree') props.setTreeRootId(null);
              if (mode === 'hierarchy' && graph) {
                props.setHierarchyExpandedGroups(new Set(graph.groups.map(group => group.id)));
              }
            }}
            onFlowSelect={index => {
              props.setSelectedFlowIndex(index);
              props.setFocusedGroupId(null);
              props.clearAuditFocus();
            }}
            onResetView={() => {
              props.setFocusedGroupId(null);
              props.fitView({ padding: 0.15, duration: 300 });
            }}
            onToggleSharedNav={() => props.setShowSharedNav(prev => !prev)}
            onToggleRedirects={() => props.setShowRedirects(prev => !prev)}
            onToggleFocusMode={() => props.setFocusMode(prev => !prev)}
            onEdgeModeChange={props.setEdgeMode}
            onAnimate={() => props.setIsAnimatingFlow(true)}
            onToggleAnalytics={() => props.setShowAnalytics(prev => !prev)}
            onToggleRouteHealth={() => props.setShowRouteHealth(prev => !prev)}
            onSearch={() => props.guardedSetShowSearch(true)}
            onHelp={() => props.guardedSetShowHelp(true)}
            onToggleCoverage={() => props.setShowCoverage(prev => !prev)}
            onClearFocus={() => props.setFocusedGroupId(null)}
            onClearAuditFocus={props.clearAuditFocus}
            onWalkthroughGoTo={index => {
              props.walkthrough.goTo(index);
              const nodeId = props.walkthrough.path[index];
              if (nodeId) props.navigateToNode(nodeId);
            }}
            onWalkthroughPresent={() => props.walkthrough.setMode('presentation')}
            onWalkthroughClear={() => {
              props.walkthrough.clear();
              ctx.setSelectedNodeId(null);
            }}
          />

          {props.layoutDone && (
            <NavMapCanvas
              nodes={props.styledNodes}
              edges={props.styledEdges}
              isDark={ctx.isDark}
              isNarrow={props.isNarrow}
              getGroupColors={ctx.getGroupColors}
              onNodesChange={props.onNodesChange}
              onEdgesChange={props.onEdgesChange}
              onSelectionChange={props.onSelectionChange}
              onNodeDragStart={props.onNodeDragStart}
              onNodeDragStop={props.onNodeDragStop}
              onNodeContextMenu={props.onNodeContextMenu}
              onNodeMouseEnter={props.onNodeMouseEnter}
              onNodeMouseLeave={props.onNodeMouseLeave}
              onNodeDoubleClick={props.onNodeDoubleClick}
            />
          )}
          <NavMapPanels
            graph={graph}
            isDark={ctx.isDark}
            showRouteHealth={props.showRouteHealth}
            viewMode={props.viewMode}
            hierarchyExpandedGroups={props.hierarchyExpandedGroups}
            isAnimatingFlow={props.isAnimatingFlow}
            selectedFlowIndex={props.selectedFlowIndex}
            layoutDone={props.layoutDone}
            nodes={props.nodes}
            viewport={props.viewport}
            onCloseRouteHealth={() => props.setShowRouteHealth(false)}
            onNavigate={props.navigateToNode}
            onIssueFocus={props.handleAuditIssueFocus}
            onExpandAllHierarchyGroups={props.expandAllHierarchyGroups}
            onCollapseAllHierarchyGroups={props.collapseAllHierarchyGroups}
            onAnimationEnd={() => props.setIsAnimatingFlow(false)}
            onStopAnimation={() => props.setIsAnimatingFlow(false)}
          />
        </div>

        <NavMapSideOverlays
          graph={graph}
          selectedNode={props.selectedNode}
          isDark={ctx.isDark}
          isNarrow={props.isNarrow}
          contextMenu={props.contextMenu}
          showHelp={props.effectiveShowHelp}
          showSearch={props.effectiveShowSearch}
          showAnalytics={props.showAnalytics}
          hoverPreview={props.hoverPreview}
          analyticsData={props.analyticsData}
          analyticsPeriod={props.analyticsPeriod}
          walkthrough={props.walkthrough}
          galleryNodeId={props.galleryNodeId}
          screenshotBasePath={props.screenshotBasePath}
          onNavigate={props.navigateToNode}
          onCloseContextMenu={props.closeContextMenu}
          onCloseHelp={() => props.guardedSetShowHelp(false)}
          onCloseSearch={() => props.guardedSetShowSearch(false)}
          onCloseAnalytics={() => props.setShowAnalytics(false)}
          onSearchSelect={nodeId => {
            props.setSearchQuery('');
            props.navigateToNodeFromSearch(nodeId);
          }}
          onSearchQueryChange={props.setSearchQuery}
          onPeriodChange={props.setAnalyticsPeriod}
          onCloseGallery={props.closeGallery}
        />
      </div>
    </NavMapContext.Provider>
  );
}
