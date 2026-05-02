'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { NavMapGraph } from '@neonwatty/nav-map';

const HELP_DISMISSED_KEY = 'nav-map:demo-help-dismissed';

const NavMap = dynamic(() => import('@neonwatty/nav-map').then(mod => ({ default: mod.NavMap })), {
  ssr: false,
  loading: () => <div style={{ color: '#888', padding: 40 }}>Loading nav map...</div>,
});

export default function HomePage() {
  const [graph, setGraph] = useState<NavMapGraph | null>(null);
  const [showInitialHelp, setShowInitialHelp] = useState(false);

  useEffect(() => {
    setShowInitialHelp(window.localStorage.getItem(HELP_DISMISSED_KEY) !== 'true');
    fetch('/bleep-app.nav-map.json')
      .then(r => r.json())
      .then(setGraph);
  }, []);

  if (!graph) {
    return (
      <main
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#888',
        }}
      >
        Loading graph data...
      </main>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <NavMap
        graph={graph}
        screenshotBasePath=""
        defaultViewMode="hierarchy"
        defaultEdgeMode="smooth"
        defaultShowHelp={showInitialHelp}
        onHelpClose={() => {
          window.localStorage.setItem(HELP_DISMISSED_KEY, 'true');
          setShowInitialHelp(false);
        }}
        onValidationError={errors => {
          console.warn('NavMap validation:', errors);
        }}
      />
    </main>
  );
}
