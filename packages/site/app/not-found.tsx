import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.description}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div className={styles.links}>
        <Link href="/gallery" className={styles.link}>
          Gallery
        </Link>
        <Link href="/docs" className={styles.link}>
          Docs
        </Link>
        <Link href="/docs/getting-started" className={styles.link}>
          Getting Started
        </Link>
      </div>
    </div>
  );
}
