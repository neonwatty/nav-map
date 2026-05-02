import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import type { RepoFramework, RepoRoute } from './repo-types.js';

function filePathToRoute(filePath: string, appDir: string): string {
  let route = path.relative(appDir, path.dirname(filePath));
  route = route.replace(/\([^)]+\)\/?/g, '');
  route = '/' + route.replace(/\\/g, '/');
  if (route === '/.') route = '/';
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

export function detectRepoFramework(projectDir: string): {
  framework: RepoFramework;
  appDir: string;
  pagesDir: string;
  hasAppDir: boolean;
} {
  const appDir = path.join(projectDir, 'app');
  const pagesDir = path.join(projectDir, 'pages');
  const hasAppDir = fs.existsSync(appDir);
  const hasPagesDir = fs.existsSync(pagesDir);

  if (!hasAppDir && !hasPagesDir) {
    throw new Error('No app/ or pages/ directory found. Is this a Next.js project?');
  }

  return {
    framework: hasAppDir ? 'nextjs-app' : 'nextjs-pages',
    appDir,
    pagesDir,
    hasAppDir,
  };
}

export async function discoverRoutes(projectDir: string): Promise<{
  framework: RepoFramework;
  routeMap: Map<string, RepoRoute>;
}> {
  const { framework, appDir, pagesDir, hasAppDir } = detectRepoFramework(projectDir);
  const pageFiles = await glob(
    hasAppDir ? 'app/**/page.{tsx,jsx,ts,js}' : 'pages/**/*.{tsx,jsx,ts,js}',
    { cwd: projectDir, ignore: ['**/node_modules/**', '**/_*.{tsx,jsx,ts,js}'] }
  );

  const routeMap = new Map<string, RepoRoute>();

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

  return { framework, routeMap };
}

export function buildRouteLookup(routeMap: Map<string, RepoRoute>): Map<string, string> {
  const routeLookup = new Map<string, string>();
  for (const [id, info] of routeMap) {
    routeLookup.set(info.route, id);
  }
  return routeLookup;
}
