export interface NavMapGraph {
  version: '1.0';
  meta: {
    name: string;
    baseUrl?: string;
    generatedAt: string;
    generatedBy: 'repo-scan' | 'url-crawl' | 'manual';
    framework?: 'nextjs-app' | 'nextjs-pages' | 'generic';
  };
  nodes: {
    id: string;
    route: string;
    label: string;
    group: string;
    screenshot?: string;
    filePath?: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'link' | 'redirect' | 'router-push' | 'shared-nav';
    sourceCode?: { file: string; line: number; component?: string };
  }[];
  groups: { id: string; label: string; color?: string; routePrefix?: string }[];
  sharedNav?: {
    navbar: { pages: string[]; targets: string[] };
    footer: { pages: string[]; targets: string[] };
  };
}

export type RepoFramework = 'nextjs-app' | 'nextjs-pages';

export interface RepoRoute {
  route: string;
  filePath: string;
  id: string;
  label: string;
}
