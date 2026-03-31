import Link from 'next/link';
import { getAllDocMeta } from '../app/lib/docs';
import styles from './DocsLayout.module.css';

interface DocsLayoutProps {
  children: React.ReactNode;
  currentSlug?: string;
}

interface NavGroup {
  label: string;
  items: { slug: string; title: string; href: string }[];
}

function buildNavGroups(allDocs: { slug: string; title: string }[]): NavGroup[] {
  const find = (slug: string) => allDocs.find(d => d.slug === slug);

  const groups: NavGroup[] = [
    {
      label: 'Getting Started',
      items: [find('getting-started')].filter(Boolean).map(d => ({
        slug: d!.slug,
        title: d!.title,
        href: `/docs/${d!.slug}`,
      })),
    },
    {
      label: 'Component',
      items: ['component-api', 'keyboard-shortcuts', 'analytics']
        .map(s => find(s))
        .filter(Boolean)
        .map(d => ({ slug: d!.slug, title: d!.title, href: `/docs/${d!.slug}` })),
    },
    {
      label: 'CLI Commands',
      items: allDocs
        .filter(d => d.slug.startsWith('cli/'))
        .map(d => ({ slug: d.slug, title: d.title, href: `/docs/${d.slug}` })),
    },
    {
      label: 'View Modes',
      items: allDocs
        .filter(d => d.slug.startsWith('views/'))
        .map(d => ({ slug: d.slug, title: d.title, href: `/docs/${d.slug}` })),
    },
  ];

  return groups;
}

export function DocsLayout({ children, currentSlug }: DocsLayoutProps) {
  const allDocs = getAllDocMeta();
  const navGroups = buildNavGroups(allDocs);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}>
          nav-map
        </Link>
        <Link href="/docs" className={styles.docsHome}>
          Docs
        </Link>
        <nav className={styles.nav}>
          {navGroups.map(group => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              <ul className={styles.groupList}>
                {group.items.map(item => (
                  <li key={item.slug}>
                    <Link
                      href={item.href}
                      className={`${styles.navLink} ${item.slug === currentSlug ? styles.active : ''}`}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
