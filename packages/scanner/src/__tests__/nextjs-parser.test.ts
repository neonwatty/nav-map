import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseNextjsLinks } from '../parsers/nextjs.js';

let projectDir: string;

beforeEach(() => {
  projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-next-parser-'));
});

afterEach(() => {
  fs.rmSync(projectDir, { recursive: true, force: true });
});

function writeSource(relativePath: string, content: string): string {
  const filePath = path.join(projectDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('parseNextjsLinks', () => {
  it('extracts Link hrefs, labels, source metadata, and component names', () => {
    const filePath = writeSource(
      'app/page.tsx',
      `
        import Link from 'next/link';

        const settingsHref = '/settings';

        export default function HomePage() {
          return (
            <main>
              <Link href="/about">About us</Link>
              <Link href={'/docs'}><span>Read docs</span></Link>
              <Link href={settingsHref}>Settings</Link>
              <Link href={\`/pricing\`}>Pricing</Link>
              <Link href={\`/users/\${'dynamic'}\`}>Dynamic</Link>
            </main>
          );
        }
      `
    );

    const links = parseNextjsLinks(filePath, projectDir);

    expect(links).toEqual([
      expect.objectContaining({
        targetRoute: '/about',
        label: 'About us',
        type: 'link',
        sourceFile: 'app/page.tsx',
        component: 'HomePage',
      }),
      expect.objectContaining({
        targetRoute: '/docs',
        label: 'Read docs',
        type: 'link',
        sourceFile: 'app/page.tsx',
        component: 'HomePage',
      }),
      expect.objectContaining({
        targetRoute: '/settings',
        label: 'Settings',
        type: 'link',
        sourceFile: 'app/page.tsx',
        component: 'HomePage',
      }),
      expect.objectContaining({
        targetRoute: '/pricing',
        label: 'Pricing',
        type: 'link',
        sourceFile: 'app/page.tsx',
        component: 'HomePage',
      }),
    ]);
    expect(links.map(link => link.targetRoute)).not.toContain('/users/dynamic');
    expect(links.every(link => link.sourceLine > 0)).toBe(true);
  });

  it('extracts router push/replace and redirect calls', () => {
    const filePath = writeSource(
      'app/dashboard/page.tsx',
      `
        import { redirect } from 'next/navigation';
        import { useRouter } from 'next/navigation';

        export const DashboardActions = () => {
          const router = useRouter();
          router.push('/dashboard/settings');
          router.replace('/dashboard/billing');
          router.push(dynamicTarget);
          redirect('/login');
          return null;
        };
      `
    );

    const links = parseNextjsLinks(filePath, projectDir);

    expect(links).toEqual([
      expect.objectContaining({
        targetRoute: '/dashboard/settings',
        type: 'router-push',
        sourceFile: 'app/dashboard/page.tsx',
        component: 'DashboardActions',
      }),
      expect.objectContaining({
        targetRoute: '/dashboard/billing',
        type: 'router-push',
        sourceFile: 'app/dashboard/page.tsx',
        component: 'DashboardActions',
      }),
      expect.objectContaining({
        targetRoute: '/login',
        type: 'redirect',
        sourceFile: 'app/dashboard/page.tsx',
        component: 'DashboardActions',
      }),
    ]);
  });

  it('returns an empty result for missing or malformed files', () => {
    expect(parseNextjsLinks(path.join(projectDir, 'missing.tsx'), projectDir)).toEqual([]);
  });
});
