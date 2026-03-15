import path from 'node:path';
import { glob } from 'glob';
import { parseNextjsLinks } from '../parsers/nextjs.js';

interface RouteInfo {
  id: string;
  route: string;
}

const GROUP_COLORS = [
  '#5b9bf5', '#4eca6a', '#b07ce8', '#f0a050', '#6e8ca8',
  '#556878', '#e06070', '#50c8c8', '#c8a050', '#70a0e0',
];

export function detectGroupsFromRoutes(
  routes: RouteInfo[]
): { id: string; label: string; color?: string; routePrefix?: string }[] {
  const prefixMap = new Map<string, RouteInfo[]>();

  for (const r of routes) {
    const segments = r.route.split('/').filter(Boolean);
    const prefix = segments[0] ?? 'root';
    const existing = prefixMap.get(prefix) ?? [];
    existing.push(r);
    prefixMap.set(prefix, existing);
  }

  const groups: { id: string; label: string; color?: string; routePrefix?: string }[] = [];
  let colorIndex = 0;

  // Create groups for prefixes with ≥2 routes
  for (const [prefix, groupRoutes] of prefixMap) {
    if (prefix === 'root') continue;
    if (groupRoutes.length >= 2) {
      groups.push({
        id: prefix,
        label: prefix.charAt(0).toUpperCase() + prefix.slice(1),
        color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
        routePrefix: `/${prefix}`,
      });
      colorIndex++;
    }
  }

  // Ungrouped routes get a "marketing" or "root" group
  const grouped = new Set(groups.flatMap(g =>
    routes.filter(r => g.routePrefix && r.route.startsWith(g.routePrefix)).map(r => r.id)
  ));

  const ungrouped = routes.filter(r => !grouped.has(r.id));
  if (ungrouped.length > 0) {
    groups.unshift({
      id: 'marketing',
      label: 'Marketing',
      color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
      routePrefix: '/',
    });
  }

  return groups;
}

export async function detectSharedNav(
  projectDir: string,
  routeLookup: Map<string, string>
): Promise<{
  navbar: { pages: string[]; targets: string[] };
  footer: { pages: string[]; targets: string[] };
} | undefined> {
  // Find layout files — these apply shared nav to all their children
  const layoutFiles = await glob('app/**/layout.{tsx,jsx}', {
    cwd: projectDir,
    ignore: ['**/node_modules/**'],
  });

  // Find common nav components
  const navComponents = await glob(
    'components/**/{Navbar,Footer,Header,Nav,Navigation,TopNav,BottomNav,SiteHeader,SiteFooter}.{tsx,jsx}',
    { cwd: projectDir, ignore: ['**/node_modules/**'] }
  );

  const navTargets = new Set<string>();
  const footerTargets = new Set<string>();

  // Parse links from layout files
  for (const file of layoutFiles) {
    const fullPath = path.join(projectDir, file);
    const links = parseNextjsLinks(fullPath, projectDir);
    for (const link of links) {
      const targetId = routeLookup.get(link.targetRoute);
      if (targetId) navTargets.add(targetId);
    }
  }

  // Parse links from nav components
  for (const file of navComponents) {
    const fullPath = path.join(projectDir, file);
    const links = parseNextjsLinks(fullPath, projectDir);
    const isFooter = /footer/i.test(file);

    for (const link of links) {
      const targetId = routeLookup.get(link.targetRoute);
      if (targetId) {
        if (isFooter) {
          footerTargets.add(targetId);
        } else {
          navTargets.add(targetId);
        }
      }
    }
  }

  if (navTargets.size === 0 && footerTargets.size === 0) {
    return undefined;
  }

  // All pages that use the root layout get the shared nav
  const allPageIds = Array.from(routeLookup.values());

  return {
    navbar: {
      pages: allPageIds,
      targets: Array.from(navTargets),
    },
    footer: {
      pages: allPageIds,
      targets: Array.from(footerTargets),
    },
  };
}
