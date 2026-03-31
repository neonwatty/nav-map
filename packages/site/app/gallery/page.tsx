import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '../../components/JsonLd';
import GalleryCard from '../../components/GalleryCard';
import { getGalleryEntries } from '@/lib/gallery';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Gallery — Open Source App Architectures',
  description:
    'Explore interactive navigation maps of real open-source applications. See how production apps are structured.',
  alternates: { canonical: 'https://navmap.neonwatty.com/gallery' },
};

export default function GalleryIndexPage() {
  const entries = getGalleryEntries();

  return (
    <div className={styles.page}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Gallery — Open Source App Architectures',
          description: metadata.description,
          url: 'https://navmap.neonwatty.com/gallery',
        }}
      />

      <Link href="/" className={styles.backLink}>
        &larr; Home
      </Link>

      <header className={styles.header}>
        <div className={styles.label}>Gallery</div>
        <h1 className={styles.title}>Open Source App Architectures</h1>
        <p className={styles.subtitle}>
          Explore interactive navigation maps of real-world applications. Click any card to dive in.
        </p>
      </header>

      <div className={styles.grid}>
        {entries.map(entry => (
          <GalleryCard key={entry.appSlug} entry={entry} />
        ))}
      </div>
    </div>
  );
}
