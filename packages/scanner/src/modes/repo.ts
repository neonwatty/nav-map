import fs from 'node:fs';
import path from 'node:path';
import { buildStaticEdges } from './repo-edges.js';
import { buildNodesAndGroups } from './repo-nodes.js';
import { discoverRoutes, buildRouteLookup } from './repo-routes.js';
import { attachScreenshots } from './repo-screenshots.js';
import { discoverSourceFiles } from './repo-sources.js';
import type { NavMapGraph } from './repo-types.js';
import { detectSharedNav } from './shared-nav.js';

export interface ScanOptions {
  projectDir: string;
  name?: string;
  screenshots?: boolean;
  baseUrl?: string;
  screenshotDir?: string;
  detectSharedNav?: boolean;
}

export async function scanRepo(options: ScanOptions): Promise<NavMapGraph> {
  const {
    projectDir,
    name,
    screenshots = false,
    baseUrl,
    screenshotDir = 'nav-screenshots',
    detectSharedNav: doDetectSharedNav = true,
  } = options;

  // Discover routes
  console.log('Discovering routes...');
  const { framework, routeMap } = await discoverRoutes(projectDir);

  console.log(`  Found ${routeMap.size} routes`);

  // Parse links from all TSX/JSX files
  console.log('Parsing navigation links...');
  const allSourceFiles = await discoverSourceFiles(projectDir, framework);
  const routeLookup = buildRouteLookup(routeMap);
  const edges = buildStaticEdges(projectDir, routeMap, routeLookup, allSourceFiles);

  console.log(`  Found ${edges.length} edges`);

  // Auto-detect groups
  const { nodes, groups } = buildNodesAndGroups(routeMap);

  // Detect shared nav
  let sharedNav: NavMapGraph['sharedNav'];
  if (doDetectSharedNav) {
    console.log('Detecting shared navigation...');
    sharedNav = await detectSharedNav(projectDir, routeLookup);
  }

  // Screenshots
  if (screenshots && baseUrl) {
    console.log('Capturing screenshots...');
    await attachScreenshots(nodes, baseUrl, screenshotDir);
  }

  // Detect project name
  const projectName = name ?? detectProjectName(projectDir);

  const graph: NavMapGraph = {
    version: '1.0',
    meta: {
      name: projectName,
      baseUrl,
      generatedAt: new Date().toISOString(),
      generatedBy: 'repo-scan',
      framework,
    },
    nodes,
    edges,
    groups,
    sharedNav,
  };

  return graph;
}

function detectProjectName(projectDir: string): string {
  try {
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.name ?? path.basename(projectDir);
    }
  } catch {
    // Fall through to basename
  }
  return path.basename(projectDir);
}
