import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { parseNextjsLinks } from '../parsers/nextjs.js';
import { captureScreenshots } from '../screenshots/capture.js';
import { detectGroupsFromRoutes, detectSharedNav } from './shared-nav.js';

interface NavMapGraph {
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

export interface ScanOptions {
  projectDir: string;
  name?: string;
  screenshots?: boolean;
  baseUrl?: string;
  screenshotDir?: string;
  detectSharedNav?: boolean;
}

function filePathToRoute(filePath: string, appDir: string): string {
  let route = path.relative(appDir, path.dirname(filePath));
  // Remove route group markers like (auth)
  route = route.replace(/\([^)]+\)\/?/g, '');
  // Clean up
  route = '/' + route.replace(/\\/g, '/');
  if (route === '/.') route = '/';
  // Remove trailing slash (except root)
  if (route.length > 1 && route.endsWith('/')) {
    route = route.slice(0, -1);
  }
  return route;
}

function routeToId(route: string): string {
  if (route === '/') return 'home';
  return route
    .slice(1)
    .replace(/\//g, '-')
    .replace(/\[(\w+)\]/g, '$1')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '');
}

function routeToLabel(route: string): string {
  if (route === '/') return 'Home';
  const lastSegment = route.split('/').filter(Boolean).pop() ?? '';
  return lastSegment
    .replace(/\[(\w+)\]/g, '$1')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
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

  // Detect framework
  const appDir = path.join(projectDir, 'app');
  const pagesDir = path.join(projectDir, 'pages');
  const hasAppDir = fs.existsSync(appDir);
  const hasPagesDir = fs.existsSync(pagesDir);

  if (!hasAppDir && !hasPagesDir) {
    throw new Error('No app/ or pages/ directory found. Is this a Next.js project?');
  }

  const framework = hasAppDir ? 'nextjs-app' : 'nextjs-pages';

  // Discover routes
  console.log('Discovering routes...');
  const pageFiles = await glob(
    hasAppDir ? 'app/**/page.{tsx,jsx,ts,js}' : 'pages/**/*.{tsx,jsx,ts,js}',
    { cwd: projectDir, ignore: ['**/node_modules/**', '**/_*.{tsx,jsx,ts,js}'] }
  );

  const routeMap = new Map<
    string,
    { route: string; filePath: string; id: string; label: string }
  >();

  for (const file of pageFiles) {
    const fullPath = path.join(projectDir, file);
    const scanDir = hasAppDir ? appDir : pagesDir;
    const route = hasAppDir
      ? filePathToRoute(fullPath, scanDir)
      : filePathToRoute(fullPath, scanDir)
          .replace(/\/index$/, '/')
          .replace(/\/$/, '') || '/';

    const id = routeToId(route);
    const label = routeToLabel(route);

    routeMap.set(id, { route, filePath: file, id, label });
  }

  console.log(`  Found ${routeMap.size} routes`);

  // Parse links from all TSX/JSX files
  console.log('Parsing navigation links...');
  const allSourceFiles = await glob(hasAppDir ? 'app/**/*.{tsx,jsx}' : 'pages/**/*.{tsx,jsx}', {
    cwd: projectDir,
    ignore: ['**/node_modules/**'],
  });

  // Also scan components directory for links
  const componentFiles = await glob('components/**/*.{tsx,jsx}', {
    cwd: projectDir,
    ignore: ['**/node_modules/**'],
  });
  allSourceFiles.push(...componentFiles);

  const edges: NavMapGraph['edges'] = [];
  const edgeSet = new Set<string>();

  // Build a route-to-id lookup
  const routeLookup = new Map<string, string>();
  for (const [id, info] of routeMap) {
    routeLookup.set(info.route, id);
  }

  for (const file of allSourceFiles) {
    const fullPath = path.join(projectDir, file);
    const links = parseNextjsLinks(fullPath, projectDir);

    // Determine which "page" this source file belongs to
    let sourcePageId: string | undefined;
    for (const [id, info] of routeMap) {
      if (file === info.filePath || file.startsWith(path.dirname(info.filePath) + '/')) {
        sourcePageId = id;
        break;
      }
    }

    for (const link of links) {
      // Try to find the target route in our routes
      const targetId = routeLookup.get(link.targetRoute);
      if (!targetId || !sourcePageId) continue;
      if (sourcePageId === targetId) continue;

      const edgeKey = `${sourcePageId}->${targetId}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      edges.push({
        id: `e-${sourcePageId}-${targetId}`,
        source: sourcePageId,
        target: targetId,
        label: link.label,
        type: link.type,
        sourceCode: {
          file: link.sourceFile,
          line: link.sourceLine,
          component: link.component,
        },
      });
    }
  }

  console.log(`  Found ${edges.length} edges`);

  // Auto-detect groups
  const routes = Array.from(routeMap.values());
  const groups = detectGroupsFromRoutes(routes.map(r => ({ id: r.id, route: r.route })));

  // Assign groups to nodes
  const nodes: NavMapGraph['nodes'] = routes.map(r => {
    const group =
      groups.find(
        g => g.routePrefix && g.routePrefix !== '/' && r.route.startsWith(g.routePrefix)
      ) ??
      groups.find(g => g.id === 'root') ??
      groups[0];

    return {
      id: r.id,
      route: r.route,
      label: r.label,
      group: group?.id ?? 'other',
      filePath: r.filePath,
    };
  });

  // Detect shared nav
  let sharedNav: NavMapGraph['sharedNav'];
  if (doDetectSharedNav) {
    console.log('Detecting shared navigation...');
    sharedNav = await detectSharedNav(projectDir, routeLookup);
  }

  // Screenshots
  if (screenshots && baseUrl) {
    console.log('Capturing screenshots...');
    const screenshotPaths = await captureScreenshots(
      nodes.map(n => ({ route: n.route, id: n.id })),
      baseUrl,
      path.resolve(screenshotDir)
    );

    for (const node of nodes) {
      const screenshotPath = screenshotPaths.get(node.id);
      if (screenshotPath) {
        node.screenshot = path.relative(process.cwd(), screenshotPath);
      }
    }
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
  } catch {}
  return path.basename(projectDir);
}
