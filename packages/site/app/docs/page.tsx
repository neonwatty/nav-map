import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsLayout } from '../../components/DocsLayout';
import { JsonLd } from '../../components/JsonLd';
import { getAllDocMeta } from '../lib/docs';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'nav-map documentation — guides, component API, CLI reference, and view mode details.',
  alternates: { canonical: 'https://navmap.neonwatty.com/docs' },
};

const GROUPS: { label: string; prefixes: string[] }[] = [
  { label: 'Getting Started', prefixes: ['getting-started'] },
  { label: 'Component', prefixes: ['component-api', 'keyboard-shortcuts', 'analytics'] },
  { label: 'CLI Commands', prefixes: ['cli/'] },
  { label: 'View Modes', prefixes: ['views/'] },
];

export default function DocsIndexPage() {
  const allDocs = getAllDocMeta();

  return (
    <DocsLayout>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'nav-map Documentation',
          description: metadata.description,
          url: 'https://navmap.neonwatty.com/docs',
        }}
      />
      <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 8 }}>
        Documentation
      </h1>
      <p
        style={{ fontSize: 16, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 48 }}
      >
        Guides, API reference, CLI commands, and view mode details for nav-map.
      </p>

      {GROUPS.map(group => {
        const items = allDocs.filter(d =>
          group.prefixes.some(p => (p.endsWith('/') ? d.slug.startsWith(p) : d.slug === p))
        );
        if (items.length === 0) return null;
        return (
          <section key={group.label} style={{ marginBottom: 40 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {group.label}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map(doc => (
                <Link
                  key={doc.slug}
                  href={`/docs/${doc.slug}`}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 400,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {doc.title}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </DocsLayout>
  );
}
