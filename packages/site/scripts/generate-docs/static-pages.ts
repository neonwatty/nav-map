import type { DocPage } from './types.js';

/** Getting Started guide — install, generate, integrate. */
export function generateGettingStarted(): DocPage {
  return {
    slug: 'getting-started',
    title: 'Getting Started',
    description:
      'Install nav-map, generate a navigation graph from your project, and add the NavMap component to your React app.',
    keywords: [
      'getting started',
      'install nav-map',
      'quick start',
      'setup guide',
      'react navigation map',
    ],
    sections: [
      {
        heading: 'Install',
        content: 'Install the NavMap component library and the scanner CLI as a dev dependency.',
        codeExample: [
          'npm install @neonwatty/nav-map',
          'npm install -D @neonwatty/nav-map-scanner',
        ].join('\n'),
      },
      {
        heading: 'Generate Your Navigation Graph',
        content:
          'Use the scanner CLI to generate a `nav-map.json` file from your project. ' +
          'Choose the method that fits your setup: scan a local repo, crawl a live URL, or record user flows.',
        codeExample: [
          '# Scan a local Next.js project',
          'npx @neonwatty/nav-map-scanner scan ./my-app',
          '',
          '# Crawl a live site',
          'npx @neonwatty/nav-map-scanner crawl https://example.com',
          '',
          '# Record flows with Playwright',
          'npx @neonwatty/nav-map-scanner record',
        ].join('\n'),
      },
      {
        heading: 'Add the Component',
        content:
          'Import the NavMap component and pass your graph data. ' +
          'The component needs a sized container (set width and height).',
        codeExample: [
          "import { NavMap } from '@neonwatty/nav-map';",
          "import graphData from './nav-map.json';",
          '',
          'export default function NavigationPage() {',
          '  return (',
          '    <div style={{ width: "100vw", height: "100vh" }}>',
          '      <NavMap graph={graphData} />',
          '    </div>',
          '  );',
          '}',
        ].join('\n'),
      },
      {
        heading: 'Preview Locally',
        content: 'Use the built-in serve command to preview your nav map without writing any code.',
        codeExample: [
          'npx @neonwatty/nav-map-scanner serve nav-map.json',
          '# Opens http://localhost:3333',
        ].join('\n'),
      },
    ],
  };
}

/** Keyboard shortcuts reference — all 11 shortcuts from HelpOverlay. */
export function generateKeyboardShortcuts(): DocPage {
  const shortcuts = [
    { key: 'Down / Right', label: 'Navigate to an outgoing page' },
    { key: 'Up / Left', label: 'Navigate to an incoming page' },
    { key: 'Backspace', label: 'Go back in walkthrough path' },
    { key: 'Esc', label: 'Clear current selection' },
    { key: '/ or Cmd+K', label: 'Open search overlay' },
    { key: '0', label: 'Reset view (fit all nodes)' },
    { key: 'L', label: 'Cycle through view layouts' },
    { key: 'F', label: 'Toggle focus mode (dim unrelated nodes)' },
    { key: 'N', label: 'Toggle shared navigation edges' },
    { key: 'O', label: 'Open selected page in browser' },
    { key: '?', label: 'Show keyboard shortcuts help' },
  ];

  return {
    slug: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description:
      'Complete list of keyboard shortcuts for navigating and controlling the NavMap component.',
    keywords: ['keyboard shortcuts', 'hotkeys', 'nav-map controls', 'keyboard navigation'],
    sections: [
      {
        heading: 'All Shortcuts',
        content:
          'NavMap supports keyboard-driven navigation. These shortcuts work when the map has focus.',
        propsTable: shortcuts.map(s => ({
          name: s.key,
          type: 'shortcut',
          required: false,
          description: s.label,
        })),
      },
    ],
  };
}

/** Analytics integration — adapter interface, PostHog example, custom adapter. */
export function generateAnalytics(): DocPage {
  return {
    slug: 'analytics',
    title: 'Analytics Integration',
    description:
      'Overlay page view and transition analytics on your navigation map using the AnalyticsAdapter interface.',
    keywords: [
      'analytics',
      'page views',
      'PostHog analytics',
      'custom analytics',
      'AnalyticsAdapter',
    ],
    sections: [
      {
        heading: 'AnalyticsAdapter Interface',
        content:
          'Implement this interface to connect any analytics provider. ' +
          'Pass the adapter to the NavMap `analytics` prop to enable the analytics overlay.',
        codeExample: [
          'interface AnalyticsAdapter {',
          '  fetchPageViews(period: { start: string; end: string }): Promise<Record<string, number>>;',
          '  fetchTransitions(period: { start: string; end: string }): Promise<Record<string, number>>;',
          '}',
        ].join('\n'),
      },
      {
        heading: 'PostHog Example',
        content: 'The built-in PostHog adapter queries the PostHog HogQL API for page views.',
        codeExample: [
          "import { NavMap } from '@neonwatty/nav-map';",
          "import { PostHogAnalytics } from '@neonwatty/nav-map/analytics/posthog';",
          '',
          'const analytics = new PostHogAnalytics({',
          "  apiKey: 'phx_...',",
          "  projectId: '12345',",
          '});',
          '',
          '<NavMap graph={data} analytics={analytics} />',
        ].join('\n'),
      },
      {
        heading: 'Custom Adapter',
        content: 'Build your own adapter for Google Analytics, Plausible, or any data source.',
        codeExample: [
          "import type { AnalyticsAdapter } from '@neonwatty/nav-map';",
          '',
          'const myAdapter: AnalyticsAdapter = {',
          '  async fetchPageViews(period) {',
          '    const res = await fetch(`/api/analytics?start=${period.start}&end=${period.end}`);',
          '    return res.json();',
          '  },',
          '  async fetchTransitions(period) {',
          '    const res = await fetch(`/api/transitions?start=${period.start}&end=${period.end}`);',
          '    return res.json();',
          '  },',
          '};',
          '',
          '<NavMap graph={data} analytics={myAdapter} />',
        ].join('\n'),
      },
    ],
  };
}
