import type { DocPage } from './types.js';

interface ViewDef {
  slug: string;
  title: string;
  description: string;
  overview: string;
  keywords: string[];
}

const VIEW_MODES: ViewDef[] = [
  {
    slug: 'views/hierarchy',
    title: 'Hierarchy View',
    description:
      'Group-based hierarchical layout showing pages organized by route prefix groups with expand/collapse.',
    overview:
      'Hierarchy view organizes your navigation map into collapsible groups based on route prefixes. ' +
      'Each group can be expanded to reveal individual page nodes or collapsed to show a summary count. ' +
      'This is the default view mode and is ideal for getting a high-level overview of your application ' +
      'structure. Groups automatically expand and collapse as you zoom in and out, thanks to semantic zoom. ' +
      'Double-click a collapsed group to expand it, or use the Expand All / Collapse All controls.',
    keywords: [
      'hierarchy view',
      'group layout',
      'collapsible groups',
      'route prefix',
      'default view',
    ],
  },
  {
    slug: 'views/flow',
    title: 'Flow View',
    description: 'Visualize user flows as step-by-step sequences through your application pages.',
    overview:
      'Flow view highlights a selected user flow, showing the sequence of pages a user visits in order. ' +
      'Select a flow from the toolbar dropdown to see its path highlighted on the graph. ' +
      'Press the play button to animate the flow, watching a dot travel along the route. ' +
      'Each step can include gallery screenshots captured during recording, which you can view ' +
      'by double-clicking a node that has gallery data. Flow view is powered by the flows array ' +
      'in your nav-map.json, populated by the record and record-flows CLI commands.',
    keywords: ['flow view', 'user flows', 'flow animation', 'step sequence', 'flow gallery'],
  },
  {
    slug: 'views/map',
    title: 'Map View',
    description: 'Full graph layout with ELK-powered automatic positioning of all nodes and edges.',
    overview:
      'Map view displays the complete navigation graph with automatic layout computed by the ELK algorithm. ' +
      'All page nodes and navigation edges are visible, with group containers drawn around related pages. ' +
      'You can drag nodes to customize the layout, toggle shared navigation edges, and enter focus mode ' +
      'to highlight only the connections of the selected node. The minimap in the corner helps you orient ' +
      'within large graphs. Map view supports three edge rendering modes: smooth (default curved edges), ' +
      'routed (orthogonal edges), and bundled (edges grouped by shared paths).',
    keywords: ['map view', 'graph layout', 'ELK algorithm', 'full graph', 'edge bundling'],
  },
  {
    slug: 'views/tree',
    title: 'Tree View',
    description: 'Radial tree layout rooted at a selected page, showing reachable pages as a tree.',
    overview:
      'Tree view renders a radial tree centered on a selected page node, showing all pages reachable ' +
      'from that node via navigation edges. Click any node to re-root the tree and explore a different ' +
      'part of your application. This view is useful for understanding the navigation depth and breadth ' +
      'from any given entry point. The layout is computed dynamically and animates smoothly when you ' +
      'change the root node.',
    keywords: ['tree view', 'radial tree', 'navigation depth', 'reachable pages', 'tree layout'],
  },
];

/** Generate doc pages for all 4 view modes. */
export function generateViewModePages(): DocPage[] {
  return VIEW_MODES.map(v => ({
    slug: v.slug,
    title: v.title,
    description: v.description,
    keywords: v.keywords,
    sections: [
      {
        heading: 'Overview',
        content: v.overview,
      },
    ],
  }));
}
