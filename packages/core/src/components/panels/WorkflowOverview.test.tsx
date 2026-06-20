import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NavMapGraph } from '../../types';
import type { WorkflowFilter } from '../../workflowFilters';
import { WorkflowOverview, buildWorkflowOverviewSummary } from './WorkflowOverview';

const workflowGraph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Workflow App',
    generatedAt: '2026-01-01',
    generatedBy: 'manual',
    workflow: {
      personas: [
        { id: 'signed-out', label: 'Signed Out' },
        { id: 'speaker', label: 'Speaker' },
      ],
      layout: { sectionOrder: ['public', 'auth', 'speaker'] },
    },
  },
  groups: [{ id: 'main', label: 'Main' }],
  nodes: [
    {
      id: 'home',
      route: '/',
      label: 'Home',
      group: 'main',
      screenshot: 'screenshots/home.png',
      metadata: {
        section: 'public',
        personas: ['signed-out'],
        authRequirement: 'public',
        health: { status: 'healthy' },
        inspect: { selector: 'main' },
      },
    },
    {
      id: 'signin',
      route: '/signin',
      label: 'Sign In',
      group: 'main',
      metadata: {
        section: 'auth',
        personas: ['signed-out'],
        authRequirement: 'signed-out',
        inspect: {},
        expectedRedirects: [{ to: '/dashboard', when: 'signed-in' }],
        health: { status: 'warning' },
      },
    },
    {
      id: 'dashboard',
      route: '/dashboard',
      label: 'Dashboard',
      group: 'main',
      screenshot: 'screenshots/dashboard.png',
      metadata: {
        section: 'speaker',
        personas: ['speaker'],
        authRequirement: 'speaker',
        sourceHints: ['crawl:dashboard'],
      },
    },
  ],
  edges: [
    {
      id: 'home-signin',
      source: 'home',
      target: 'signin',
      type: 'link',
      personas: ['signed-out'],
    },
    {
      id: 'signin-dashboard',
      source: 'signin',
      target: 'dashboard',
      type: 'redirect',
      personas: ['speaker'],
    },
  ],
  flows: [{ name: 'Speaker Login', steps: ['home', 'signin', 'dashboard'] }],
};

describe('WorkflowOverview', () => {
  it('summarizes workflow sections, personas, auth, redirects, health, and evidence', () => {
    render(
      <WorkflowOverview
        graph={workflowGraph}
        isDark
        viewMode="flow"
        selectedFlowIndex={0}
        activeFilter={null}
        onFilterChange={() => {}}
      />
    );

    const overview = screen.getByTestId('workflow-overview');
    expect(within(overview).getByText('Workflow App')).toBeTruthy();
    expect(within(overview).getByText('Speaker Login')).toBeTruthy();
    expect(within(overview).getAllByText('Public', { exact: false }).length).toBeGreaterThan(0);
    expect(within(overview).getAllByText('Signed Out', { exact: false }).length).toBeGreaterThan(0);
    expect(within(overview).getAllByText('Speaker', { exact: false }).length).toBeGreaterThan(0);
    expect(within(overview).getAllByText('Warning', { exact: false }).length).toBeGreaterThan(0);

    const summary = buildWorkflowOverviewSummary(workflowGraph, 0);
    expect(summary.sectionItems.map(item => item.id)).toEqual(['public', 'auth', 'speaker']);
    expect(summary.personaItems.find(item => item.id === 'signed-out')?.count).toBe(3);
    expect(summary.authItems).toHaveLength(3);
    expect(summary.redirectCount).toBe(2);
    expect(summary.screenshotCount).toBe(2);
    expect(summary.inspectHintCount).toBe(1);
    expect(summary.sourceHintCount).toBe(1);
    expect(summary.healthCounts.healthy).toBe(1);
    expect(summary.healthCounts.warning).toBe(1);
  });

  it('does not render for graphs without workflow or evidence signals', () => {
    const plainGraph: NavMapGraph = {
      version: '1.0',
      meta: { name: 'Plain App', generatedAt: '2026-01-01', generatedBy: 'manual' },
      groups: [{ id: 'main', label: 'Main' }],
      nodes: [{ id: 'home', route: '/', label: 'Home', group: 'main' }],
      edges: [],
    };

    const { container } = render(
      <WorkflowOverview
        graph={plainGraph}
        isDark={false}
        viewMode="map"
        selectedFlowIndex={null}
        activeFilter={null}
        onFilterChange={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('labels evidence-only raw scans as scans instead of empty workflow atlases', () => {
    const rawScanGraph: NavMapGraph = {
      version: '1.0',
      meta: { name: 'Raw Scan', generatedAt: '2026-01-01', generatedBy: 'url-crawl' },
      groups: [{ id: 'main', label: 'Main' }],
      nodes: [
        {
          id: 'home',
          route: '/',
          label: 'Home',
          group: 'main',
          screenshot: 'screenshots/home.png',
          metadata: { health: { status: 'healthy' } },
        },
        {
          id: 'settings',
          route: '/settings',
          label: 'Settings',
          group: 'main',
          metadata: { inspect: { selector: 'main' } },
        },
      ],
      edges: [{ id: 'redirect', source: 'home', target: 'settings', type: 'redirect' }],
    };

    render(
      <WorkflowOverview
        graph={rawScanGraph}
        isDark={false}
        viewMode="map"
        selectedFlowIndex={null}
        activeFilter={null}
        onFilterChange={() => {}}
      />
    );

    const overview = screen.getByTestId('workflow-overview');
    expect(within(overview).getByText('Scan')).toBeTruthy();
    expect(within(overview).getByText('Routes')).toBeTruthy();
    expect(within(overview).getByText('Screens')).toBeTruthy();
    expect(within(overview).getByText('Hints')).toBeTruthy();
    expect(within(overview).queryByText('Sections')).toBeNull();
    expect(within(overview).queryByText('Personas')).toBeNull();
    expect(within(overview).queryByText('Auth')).toBeNull();

    const summary = buildWorkflowOverviewSummary(rawScanGraph, null);
    expect(summary.overviewKind).toBe('scan');
    expect(summary.routeCount).toBe(2);
    expect(summary.redirectCount).toBe(1);
    expect(summary.sectionItems).toHaveLength(0);
    expect(summary.personaItems).toHaveLength(0);
    expect(summary.authItems).toHaveLength(0);
  });

  it('renders chips as toggle buttons and clears the active chip when clicked again', () => {
    const onFilterChange = vi.fn();
    const activeFilter: WorkflowFilter = { kind: 'auth', value: 'speaker' };

    render(
      <WorkflowOverview
        graph={workflowGraph}
        isDark={false}
        viewMode="map"
        selectedFlowIndex={null}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Filter workflow by section: Public' }));
    expect(onFilterChange).toHaveBeenCalledWith({ kind: 'section', value: 'public' });

    const activeAuthChip = screen.getByRole('button', {
      name: 'Clear workflow filter Auth: Speaker',
    });
    expect(activeAuthChip.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(activeAuthChip);
    expect(onFilterChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('button', { name: 'Sections' })).toBeNull();
  });

  it('uses workflow filter option counts for evidence chips', () => {
    render(
      <WorkflowOverview
        graph={workflowGraph}
        isDark={false}
        viewMode="map"
        selectedFlowIndex={null}
        activeFilter={null}
        onFilterChange={() => {}}
      />
    );

    const inspectChip = screen.getByRole('button', {
      name: 'Filter workflow by evidence: Inspect',
    });
    expect(within(inspectChip).getByText('2')).toBeTruthy();
  });

  it('keeps overflow count pills non-interactive', () => {
    const manySectionsGraph: NavMapGraph = {
      ...workflowGraph,
      meta: {
        ...workflowGraph.meta,
        workflow: {
          ...workflowGraph.meta.workflow,
          layout: { sectionOrder: ['one', 'two', 'three', 'four', 'five', 'six'] },
        },
      },
      nodes: ['one', 'two', 'three', 'four', 'five', 'six'].map(section => ({
        id: section,
        route: `/${section}`,
        label: section,
        group: 'main',
        metadata: { section },
      })),
      edges: [],
    };

    render(
      <WorkflowOverview
        graph={manySectionsGraph}
        isDark={false}
        viewMode="map"
        selectedFlowIndex={null}
        activeFilter={null}
        onFilterChange={() => {}}
      />
    );

    expect(screen.getByText('+1').style.cursor).not.toBe('pointer');
  });
});
