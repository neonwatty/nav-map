export interface NavMapNode {
  id: string;
  route: string;
  label: string;
  group: string;
  screenshot?: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
}

export interface NavMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'link' | 'redirect' | 'router-push' | 'shared-nav';
  sourceCode?: { file: string; line: number; component?: string };
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
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual' | 'e2e-record';
    framework?: 'nextjs-app' | 'nextjs-pages' | 'generic';
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
