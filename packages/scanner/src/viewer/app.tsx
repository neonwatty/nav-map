/// <reference lib="dom" />

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NavMap, validateGraph, type NavMapGraph, type ViewMode } from '@neonwatty/nav-map';
import '@neonwatty/nav-map/styles.css';
import './app.css';

declare global {
  interface Window {
    __NAV_MAP_VIEWER__?: {
      dataUrl?: string;
      screenshotBasePath?: string;
    };
  }
}

function ViewerApp() {
  const [graph, setGraph] = useState<NavMapGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const config = window.__NAV_MAP_VIEWER__ ?? {};

  useEffect(() => {
    let cancelled = false;
    const dataUrl = config.dataUrl ?? '/data.json';

    fetch(dataUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Graph request failed with ${response.status}`);
        return response.json() as Promise<NavMapGraph>;
      })
      .then(nextGraph => {
        if (cancelled) return;
        const validation = validateGraph(nextGraph);
        if (!validation.valid) {
          const details = validation.errors
            .slice(0, 5)
            .map(item => `${item.field}: ${item.message}`)
            .join('; ');
          throw new Error(`Invalid graph data. ${details}`);
        }
        document.title = `${nextGraph.meta?.name ?? 'NavMap'} · NavMap`;
        setGraph(nextGraph);
      })
      .catch(reason => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unable to load graph data');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config.dataUrl]);

  if (error) {
    return (
      <main className="nav-map-viewer-status nav-map-viewer-error" role="alert">
        <strong>NavMap could not load this project.</strong>
        <span>{error}</span>
      </main>
    );
  }

  if (!graph) {
    return (
      <main className="nav-map-viewer-status" role="status">
        Loading NavMap…
      </main>
    );
  }

  return (
    <main className="nav-map-viewer-shell">
      <NavMap
        graph={graph}
        screenshotBasePath={config.screenshotBasePath ?? ''}
        defaultViewMode={resolveDefaultViewMode(graph)}
        defaultEdgeMode="smooth"
      />
    </main>
  );
}

function resolveDefaultViewMode(graph: NavMapGraph): ViewMode {
  const preferred = graph.meta.workflow?.layout?.defaultViewMode;
  if (
    preferred === 'hierarchy' ||
    preferred === 'map' ||
    preferred === 'flow' ||
    preferred === 'tree'
  ) {
    return preferred;
  }
  return 'hierarchy';
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('NavMap viewer root element is missing');

createRoot(rootElement).render(
  <StrictMode>
    <ViewerApp />
  </StrictMode>
);
