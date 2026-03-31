import Link from 'next/link';
import Image from 'next/image';
import type { GalleryEntry } from '../lib/gallery';
import styles from './GalleryCard.module.css';

interface GalleryCardProps {
  entry: GalleryEntry;
}

export default function GalleryCard({ entry }: GalleryCardProps) {
  return (
    <Link href={`/gallery/${entry.appSlug}`} className={styles.card}>
      <Image
        className={styles.preview}
        src={`/gallery/${entry.appSlug}/hierarchy.png`}
        alt={`${entry.appName} navigation architecture`}
        width={640}
        height={400}
      />
      <div className={styles.body}>
        <span className={styles.framework}>{entry.framework}</span>
        <h3 className={styles.name}>{entry.appName}</h3>
        <p className={styles.description}>{entry.description}</p>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statValue}>{entry.stats.routes}</span> routes
          </span>
          <span className={styles.stat}>
            <span className={styles.statValue}>{entry.stats.edges}</span> edges
          </span>
          <span className={styles.stat}>
            <span className={styles.statValue}>{entry.stats.groups}</span> groups
          </span>
        </div>
      </div>
    </Link>
  );
}
