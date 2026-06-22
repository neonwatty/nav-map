'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  workflowManifestToGraph,
  type NavMapGraph,
  type WorkflowManifest,
} from '@neonwatty/nav-map';

const HELP_DISMISSED_KEY = 'nav-map:demo-help-dismissed';
type DemoDataset = 'prcard' | 'deckchecker-speaker' | 'bleep' | 'seatify-local';

const NavMap = dynamic(() => import('@neonwatty/nav-map').then(mod => ({ default: mod.NavMap })), {
  ssr: false,
  loading: () => <div style={{ color: '#888', padding: 40 }}>Loading nav map...</div>,
});

export function DemoPage() {
  const [graph, setGraph] = useState<NavMapGraph | null>(null);
  const [showInitialHelp, setShowInitialHelp] = useState(false);
  const [initialSelection] = useState(() => readInitialDatasetSelection());
  const [dataset, setDataset] = useState<DemoDataset>(initialSelection.dataset);
  const [datasetWarning, setDatasetWarning] = useState<string | null>(
    initialSelection.invalidDataset
      ? `Unknown dataset "${initialSelection.invalidDataset}". Showing PRcard workflow instead.`
      : null
  );

  useEffect(() => {
    setShowInitialHelp(window.localStorage.getItem(HELP_DISMISSED_KEY) !== 'true');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGraph(null);

    loadDemoGraph(dataset)
      .then(nextGraph => {
        if (!cancelled) {
          setGraph(nextGraph);
        }
      })
      .catch(error => {
        console.error('Failed to load demo graph:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [dataset]);

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
      <label
        style={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: '#c8c8d0',
          background: 'rgba(10, 10, 15, 0.88)',
          border: '1px solid rgba(120, 130, 155, 0.3)',
          borderRadius: 8,
          padding: '7px 9px',
          backdropFilter: 'blur(10px)',
        }}
      >
        Dataset
        <select
          value={dataset}
          onChange={event => {
            const nextDataset = event.target.value as DemoDataset;
            const url = new URL(window.location.href);
            url.searchParams.set('dataset', nextDataset);
            window.history.replaceState(null, '', url);
            setDatasetWarning(null);
            setDataset(nextDataset);
          }}
          style={{
            color: '#f0f2f8',
            background: '#151722',
            border: '1px solid #303448',
            borderRadius: 6,
            fontSize: 12,
            padding: '3px 8px',
          }}
        >
          <option value="prcard">PRcard workflow</option>
          <option value="deckchecker-speaker">Deckchecker speaker</option>
          <option value="bleep">Bleep app scan</option>
          <option value="seatify-local">Seatify local dogfood</option>
        </select>
      </label>
      {datasetWarning && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: 14,
            bottom: 14,
            zIndex: 20,
            maxWidth: 'min(420px, calc(100vw - 28px))',
            color: '#f8d58a',
            background: 'rgba(42, 31, 12, 0.92)',
            border: '1px solid rgba(248, 213, 138, 0.36)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
            lineHeight: 1.35,
            backdropFilter: 'blur(10px)',
          }}
        >
          {datasetWarning}
        </div>
      )}
      <NavMap
        key={dataset}
        graph={graph}
        screenshotBasePath=""
        defaultViewMode={defaultViewModeForGraph(graph)}
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

function readInitialDatasetSelection(): { dataset: DemoDataset; invalidDataset: string | null } {
  if (typeof window === 'undefined') return { dataset: 'prcard', invalidDataset: null };
  const dataset = new URLSearchParams(window.location.search).get('dataset');
  if (!dataset) return { dataset: 'prcard', invalidDataset: null };
  if (isDemoDataset(dataset)) return { dataset, invalidDataset: null };
  return { dataset: 'prcard', invalidDataset: dataset };
}

function isDemoDataset(value: string | null): value is DemoDataset {
  return (
    value === 'prcard' ||
    value === 'deckchecker-speaker' ||
    value === 'bleep' ||
    value === 'seatify-local'
  );
}

type DemoViewMode = 'hierarchy' | 'map' | 'flow' | 'tree';

function defaultViewModeForGraph(graph: NavMapGraph): DemoViewMode {
  const viewMode = graph.meta.workflow?.layout?.defaultViewMode;
  return isDemoViewMode(viewMode) ? viewMode : 'hierarchy';
}

function isDemoViewMode(value: unknown): value is DemoViewMode {
  return value === 'hierarchy' || value === 'map' || value === 'flow' || value === 'tree';
}

async function loadDemoGraph(dataset: DemoDataset): Promise<NavMapGraph> {
  if (dataset === 'seatify-local') {
    return fetchJson<NavMapGraph>('/seatify-local.nav-map.json');
  }

  if (dataset === 'bleep') {
    return fetchJson<NavMapGraph>('/bleep-app.nav-map.json');
  }

  if (dataset === 'deckchecker-speaker') {
    const generated = await fetch('/deckchecker-speaker.nav-map.json');
    if (generated.ok) return (await generated.json()) as NavMapGraph;

    const manifest = await fetchJson<WorkflowManifest>('/deckchecker-speaker.workflow.json');
    return workflowManifestToGraph(manifest);
  }

  const generated = await fetch('/prcard.nav-map.json');
  if (generated.ok) return (await generated.json()) as NavMapGraph;

  const manifest = await fetchJson<WorkflowManifest>('/prcard.workflow.json');
  return workflowManifestToGraph(manifest);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return (await response.json()) as T;
}
