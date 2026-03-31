import Link from 'next/link';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.links}>
        <div className={styles.group}>
          <h4>nav-map</h4>
          <Link href="/docs/getting-started">Getting Started</Link>
          <Link href="/docs/component-api">API Reference</Link>
          <Link href="/gallery">Gallery</Link>
        </div>
        <div className={styles.group}>
          <h4>Resources</h4>
          <a href="https://github.com/neonwatty/nav-map">GitHub</a>
          <a href="https://www.npmjs.com/package/@neonwatty/nav-map">npm</a>
          <a href="https://neonwatty.com">Blog</a>
        </div>
      </div>
      <p className={styles.copyright}>
        Built by <a href="https://neonwatty.com">neonwatty</a>. MIT License.
      </p>
    </footer>
  );
}
