import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '../../../components/JsonLd';
import NavMapEmbed from '../../../components/NavMapEmbed';
import { getGalleryData, getAllGallerySlugs } from '../../../lib/gallery';
import styles from './page.module.css';

export function generateStaticParams() {
  return getAllGallerySlugs().map(slug => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = getGalleryData(slug);
  if (!data) return {};
  return {
    title: `${data.appName} Architecture — Navigation Map`,
    description: data.description,
    alternates: { canonical: `https://navmap.neonwatty.com/gallery/${slug}` },
    openGraph: {
      images: [`/gallery/${slug}/hierarchy.png`],
    },
  };
}

export default async function GalleryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = getGalleryData(slug);
  if (!data) notFound();

  return (
    <div className={styles.page}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${data.appName} Architecture — Navigation Map`,
          description: data.description,
          url: `https://navmap.neonwatty.com/gallery/${slug}`,
          image: `https://navmap.neonwatty.com/gallery/${slug}/hierarchy.png`,
        }}
      />

      <Link href="/gallery" className={styles.backLink}>
        &larr; Back to Gallery
      </Link>

      <header className={styles.header}>
        <span className={styles.framework}>{data.framework}</span>
        <h1 className={styles.title}>{data.appName} Architecture</h1>
        <p className={styles.description}>{data.description}</p>

        <div className={styles.meta}>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <span className={styles.statValue}>{data.stats.routes}</span> routes
            </span>
            <span className={styles.stat}>
              <span className={styles.statValue}>{data.stats.edges}</span> edges
            </span>
            <span className={styles.stat}>
              <span className={styles.statValue}>{data.stats.groups}</span> groups
            </span>
          </div>

          <div className={styles.links}>
            <a
              href={data.githubUrl}
              className={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {data.liveUrl && (
              <a
                href={data.liveUrl}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Live Site
              </a>
            )}
          </div>
        </div>
      </header>

      <section className={styles.vizSection}>
        <NavMapEmbed graph={data.graph} slug={slug} />
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Visualize your own app</h2>
        <p className={styles.ctaDescription}>
          Generate an interactive navigation map for your Next.js application in minutes.
        </p>
        <Link href="/docs/getting-started" className={styles.ctaLink}>
          Get Started
        </Link>
      </section>
    </div>
  );
}
