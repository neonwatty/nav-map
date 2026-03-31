import Link from 'next/link';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        nav-map
      </Link>
      <nav className={styles.nav}>
        <Link href="/docs">Docs</Link>
        <Link href="/gallery">Gallery</Link>
        <a href="https://github.com/neonwatty/nav-map">GitHub</a>
        <a href="https://www.npmjs.com/package/@neonwatty/nav-map">npm</a>
      </nav>
    </header>
  );
}
