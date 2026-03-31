import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsLayout } from '../../../../components/DocsLayout';
import { JsonLd } from '../../../../components/JsonLd';
import { getDocData } from '@/lib/docs';
import { renderSections } from '@/lib/doc-render';

const VIEW_SLUGS = ['hierarchy', 'flow', 'map', 'tree'];

export function generateStaticParams() {
  return VIEW_SLUGS.map(slug => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = getDocData(`views/${slug}`);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    alternates: { canonical: `https://navmap.neonwatty.com/docs/views/${slug}` },
  };
}

export default async function ViewDocPage({ params }: PageProps) {
  const { slug } = await params;
  const data = getDocData(`views/${slug}`);
  if (!data) notFound();

  return (
    <DocsLayout currentSlug={`views/${slug}`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: data.title,
          description: data.description,
          url: `https://navmap.neonwatty.com/docs/views/${slug}`,
          author: { '@type': 'Organization', name: 'neonwatty' },
        }}
      />
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1.2px', marginBottom: 8 }}>
        {data.title}
      </h1>
      <p
        style={{ fontSize: 16, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 32 }}
      >
        {data.description}
      </p>
      {renderSections(data.sections)}
    </DocsLayout>
  );
}
