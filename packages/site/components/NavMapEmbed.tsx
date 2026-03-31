'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { NavMapGraph } from '@neonwatty/nav-map';
import styles from './NavMapEmbed.module.css';

const NavMap = dynamic(() => import('@neonwatty/nav-map').then(mod => ({ default: mod.NavMap })), {
  ssr: false,
  loading: () => <div className={styles.skeleton}>Loading visualization...</div>,
});

const MOBILE_BREAKPOINT = 768;

interface NavMapEmbedProps {
  graph: Record<string, unknown>;
  slug: string;
}

export default function NavMapEmbed({ graph, slug }: NavMapEmbedProps) {
  // null = not yet determined; true/false = resolved
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();

    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Show skeleton until client-side check completes
  if (isMobile === null) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton}>Loading visualization...</div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={styles.container}>
        <Image
          className={styles.fallbackImage}
          src={`/gallery/${slug}/hierarchy.png`}
          alt="Navigation architecture diagram"
          width={1200}
          height={750}
        />
        <div className={styles.mobileLabel}>Interactive visualization available on desktop</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.vizWrapper}>
        <NavMap
          graph={graph as unknown as NavMapGraph}
          screenshotBasePath=""
          defaultViewMode="hierarchy"
          defaultEdgeMode="smooth"
        />
      </div>
    </div>
  );
}
