// Components
export { NavMap } from './components/NavMap';
export type { NavMapProps } from './components/NavMap';
export { PageNode } from './components/nodes/PageNode';
export { CompactNode } from './components/nodes/CompactNode';
export { NavEdge } from './components/edges/NavEdge';
export { ConnectionPanel } from './components/panels/ConnectionPanel';
export { LegendPanel } from './components/panels/LegendPanel';
export { WalkthroughBar } from './components/panels/WalkthroughBar';
export { HelpOverlay } from './components/panels/HelpOverlay';
export { HoverPreview } from './components/panels/HoverPreview';
export { SearchPanel } from './components/panels/SearchPanel';
export { ViewModeSelector } from './components/panels/ViewModeSelector';
export { FlowSelector } from './components/panels/FlowSelector';
export { FlowAnimator } from './components/panels/FlowAnimator';
export { ExportButton } from './components/panels/ExportButton';
export { GroupNode } from './components/nodes/GroupNode';
export { PresentationBar } from './components/panels/PresentationBar';
export { AnalyticsOverlay } from './components/panels/AnalyticsOverlay';

// Analytics
export { PostHogAnalytics } from './analytics/posthog';
export { StaticAnalytics, RestAnalytics } from './analytics/generic';
export type { AnalyticsAdapter, NavMapAnalytics as AnalyticsData } from './analytics/types';

// Hooks
export { useNavMapContext, NavMapContext } from './hooks/useNavMap';
export type { NavMapContextValue } from './hooks/useNavMap';
export { useWalkthrough } from './hooks/useWalkthrough';
export type { WalkthroughState } from './hooks/useWalkthrough';
export { useSemanticZoom } from './hooks/useSemanticZoom';
export { useSearch } from './hooks/useSearch';

// Layout
export { computeElkLayout } from './layout/elkLayout';
export type { LayoutOptions, LayoutResult } from './layout/elkLayout';
export { detectGroups, assignGroups } from './layout/groupDetection';

// Utilities
export { getGroupColors, darkGroupColors, lightGroupColors } from './utils/colors';
export {
  buildGraphFromJson,
  buildCompoundNodes,
  toReactFlowNodes,
  toReactFlowEdges,
  getConnectedNodes,
} from './utils/graphHelpers';
export type { GroupNodeData } from './components/nodes/GroupNode';

// Types
export type {
  NavMapGraph,
  NavMapNode,
  NavMapEdge,
  NavMapGroup,
  NavMapSharedNav,
  NavMapAnalytics,
  GroupColors,
  GroupColorMap,
  NavMapFlow,
  NavMapFlowStep,
  NavMapFlowGallery,
  ViewMode,
  EdgeMode,
} from './types';
