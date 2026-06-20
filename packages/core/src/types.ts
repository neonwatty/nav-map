export type TestStatus = 'passed' | 'failed' | 'skipped';

export interface NavMapNode {
  id: string;
  route: string;
  label: string;
  group: string;
  screenshot?: string;
  filePath?: string;
  metadata?: NavMapWorkflowMetadata;
  coverage?: CoverageData;
}

export interface NavMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  action?: string;
  personas?: string[];
  type: 'link' | 'redirect' | 'router-push' | 'shared-nav' | 'test-transition';
  discovery?: 'static-link' | 'observed-interaction';
  sourceCode?: { file: string; line: number; component?: string };
  metadata?: Record<string, unknown>;
}

export interface NavMapGroup {
  id: string;
  label: string;
  color?: string;
  routePrefix?: string;
}

export interface NavMapSharedNav {
  navbar: { pages: string[]; targets: string[] };
  footer: { pages: string[]; targets: string[] };
}

export interface NavMapFlowStep {
  action: 'goto' | 'waitFor' | 'click' | 'fill' | 'end';
  title: string;
  screenshot?: string;
  timestamp?: number;
}

export interface NavMapFlowGallery {
  [nodeId: string]: NavMapFlowStep[];
}

export interface CoverageTestRef {
  id: string;
  name: string;
  specFile: string;
  status: TestStatus;
}

export interface CoverageData {
  status: 'covered' | 'failing' | 'uncovered';
  testCount: number;
  passCount: number;
  failCount: number;
  tests: CoverageTestRef[];
  lastRun: string;
}

export type NavMapHealthStatus = 'healthy' | 'warning' | 'failing' | 'unchecked' | 'unknown';

export type NavMapPrototypeSurfaceType =
  | 'screenshot'
  | 'generated-image'
  | 'html-mockup'
  | 'video'
  | 'keyframe'
  | 'component'
  | 'concept-screen';

export type NavMapArtifactKind = 'prototype' | 'mockup' | 'app';

export type NavMapPreviewMode = 'screenshots' | 'live';

export type NavMapLivePreviewStatus = 'available' | 'static' | 'blocked';

export type NavMapLiveReadinessStatus =
  | 'idle'
  | 'checking'
  | 'reachable'
  | 'offline'
  | 'static'
  | 'blocked'
  | 'unavailable';

export type NavMapLiveReadinessScope = 'current-flow' | 'graph';

export interface NavMapLiveReadiness {
  nodeId: string;
  status: NavMapLiveReadinessStatus;
  artifactKind: NavMapArtifactKind;
  liveUrl?: string;
  liveUrlSource?: 'manifest' | 'graph-base' | 'local-base-override' | 'local-node-override';
  message: string;
}

export type NavMapLiveReadinessByNode = Record<string, NavMapLiveReadiness>;

export interface NavMapLiveReadinessSummary {
  scope: NavMapLiveReadinessScope;
  total: number;
  checking: number;
  reachable: number;
  offline: number;
  static: number;
  blocked: number;
  unavailable: number;
}

export type NavMapLivePreviewBlockedReason =
  | 'missing-url'
  | 'not-embeddable'
  | 'auth-required'
  | 'offline'
  | 'unsupported';

export interface NavMapPreviewMetadata {
  liveUrl?: string;
  liveMode?: 'iframe' | 'browser' | 'external';
  liveStatus?: NavMapLivePreviewStatus;
  blockedReason?: NavMapLivePreviewBlockedReason;
  interactive?: boolean;
  limitations?: string[];
}

export interface NavMapExpectedRedirect {
  to: string;
  when?: string;
  reason?: string;
}

export interface NavMapInspectHint {
  url?: string;
  selector?: string;
  notes?: string;
}

export interface NavMapWorkflowHealth {
  status: NavMapHealthStatus;
  message?: string;
  checkedAt?: string;
}

export interface NavMapWorkflowNodeExpectations {
  selectors?: string[];
  text?: string[];
  signedOutRedirect?: string;
  finalUrl?: string;
  status?: number;
}

export interface NavMapWorkflowLayout {
  defaultViewMode?: ViewMode;
  defaultTreeRootId?: string;
  sectionOrder?: string[];
}

export interface NavMapWorkflowMetadata extends Record<string, unknown> {
  kind?: 'route' | 'prototype-surface';
  surfaceType?: NavMapPrototypeSurfaceType;
  artifactKind?: NavMapArtifactKind;
  preview?: NavMapPreviewMetadata;
  purpose?: string;
  section?: string;
  personas?: string[];
  authRequirement?: string;
  authRequired?: boolean;
  expectedRedirects?: NavMapExpectedRedirect[];
  health?: NavMapWorkflowHealth;
  inspect?: NavMapInspectHint;
  tags?: string[];
  expectations?: NavMapWorkflowNodeExpectations;
  sourceHints?: string[];
}

export interface NavMapFlow {
  name: string;
  steps: string[];
  gallery?: NavMapFlowGallery;
  partial?: boolean;
}

export type ViewMode = 'map' | 'flow' | 'tree' | 'hierarchy';

export type EdgeMode = 'smooth' | 'routed' | 'bundled';

export interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual' | 'e2e-record' | 'merged';
    framework?: 'nextjs-app' | 'nextjs-pages' | 'generic';
    workflow?: {
      description?: string;
      personas?: Array<{ id: string; label: string; description?: string }>;
      layout?: NavMapWorkflowLayout;
      [key: string]: unknown;
    };
    diagnostics?: {
      crawl?: {
        attemptedPages: number;
        successfulPages: number;
        failedPages: Array<{ url: string; reason: string }>;
        screenshotFailures: Array<{ url: string; path: string; reason: string }>;
        maxPagesReached: boolean;
      };
    };
  };
  nodes: NavMapNode[];
  edges: NavMapEdge[];
  groups: NavMapGroup[];
  sharedNav?: NavMapSharedNav;
  flows?: NavMapFlow[];
}

export interface NavMapAnalytics {
  period: { start: string; end: string };
  pageViews: Record<string, number>;
  transitions: Record<string, number>;
}

export interface GroupColors {
  bg: string;
  border: string;
  text: string;
}

export type GroupColorMap = Record<string, GroupColors>;

export interface NavMapTheme {
  groupColors?: GroupColorMap;
  dark?: {
    background?: string;
    text?: string;
  };
  light?: {
    background?: string;
    text?: string;
  };
}
