import { describe, expect, it } from 'vitest';
import type { NavMapGraph } from './types';
import {
  getWorkflowFilterOptions,
  matchWorkflowFilter,
  workflowFilterKey,
  workflowFilterLabel,
  workflowFiltersEqual,
} from './workflowFilters';

const graph: NavMapGraph = {
  version: '1.0',
  meta: {
    name: 'Test Atlas',
    generatedAt: '2026-06-15T00:00:00.000Z',
    generatedBy: 'manual',
    workflow: {
      personas: [
        { id: 'signed-out', label: 'Signed out' },
        { id: 'speaker', label: 'Speaker' },
      ],
      layout: { sectionOrder: ['public', 'speaker', 'boundary'] },
    },
  },
  groups: [{ id: 'main', label: 'Main' }],
  nodes: [
    {
      id: 'landing',
      route: '/',
      label: 'Landing',
      group: 'main',
      screenshot: 'screenshots/landing.png',
      metadata: {
        section: 'public',
        personas: ['signed-out'],
        authRequirement: 'public',
        health: { status: 'healthy' },
      },
    },
    {
      id: 'events',
      route: '/my/events',
      label: 'My Events',
      group: 'main',
      screenshot: 'screenshots/events.png',
      metadata: {
        section: 'speaker',
        personas: ['speaker'],
        authRequirement: 'speaker',
        inspect: { selector: 'main' },
        sourceHints: ['web/src/app/my/events/page.tsx'],
        health: { status: 'warning' },
      },
    },
    {
      id: 'admin',
      route: '/admin/dashboard',
      label: 'Admin Boundary',
      group: 'main',
      metadata: {
        section: 'boundary',
        personas: ['speaker'],
        authRequirement: 'admin',
        expectedRedirects: [{ when: 'speaker', to: '/my/events' }],
      },
    },
    {
      id: 'settings',
      route: '/settings',
      label: 'Settings',
      group: 'main',
      metadata: {
        section: 'speaker',
        authRequirement: 'speaker',
        inspect: {},
        health: { status: 'failing' },
      },
    },
    {
      id: 'preview',
      route: '/preview',
      label: 'Preview',
      group: 'main',
      metadata: {
        section: 'z-preview',
        authRequirement: 'speaker',
        health: { status: 'unknown' },
      },
    },
  ],
  edges: [
    {
      id: 'landing-events',
      source: 'landing',
      target: 'events',
      type: 'link',
      personas: ['speaker'],
    },
    {
      id: 'events-admin',
      source: 'events',
      target: 'admin',
      type: 'redirect',
      personas: ['speaker'],
    },
    { id: 'events-settings', source: 'events', target: 'settings', type: 'link' },
    { id: 'settings-preview', source: 'settings', target: 'preview', type: 'link' },
  ],
};

describe('workflowFilters', () => {
  it('builds stable filter options from workflow metadata', () => {
    const options = getWorkflowFilterOptions(graph);

    expect(options.map(option => workflowFilterKey(option.filter))).toEqual([
      'section:public',
      'section:speaker',
      'section:boundary',
      'section:z-preview',
      'persona:signed-out',
      'persona:speaker',
      'auth:speaker',
      'auth:admin',
      'auth:public',
      'health:failing',
      'health:warning',
      'health:healthy',
      'health:unknown',
      'evidence:screenshot',
      'evidence:inspect',
      'evidence:source-hint',
      'evidence:redirect',
    ]);
    expect(
      options.find(option => workflowFilterKey(option.filter) === 'section:speaker')?.count
    ).toBe(2);
    expect(
      options.find(option => workflowFilterKey(option.filter) === 'persona:speaker')?.count
    ).toBe(4);
    expect(
      options.find(option => workflowFilterKey(option.filter) === 'evidence:redirect')?.count
    ).toBe(2);
  });

  it('matches nodes and related edges for persona filters', () => {
    const match = matchWorkflowFilter(graph, { kind: 'persona', value: 'speaker' });

    expect(match?.label).toBe('Persona: Speaker');
    expect([...(match?.nodeIds ?? [])].sort()).toEqual(['admin', 'events']);
    expect([...(match?.edgeIds ?? [])].sort()).toEqual(['events-admin', 'landing-events']);
  });

  it('counts duplicate persona values on a node or edge once per graph item', () => {
    const graphWithDuplicates: NavMapGraph = {
      version: '1.0',
      meta: {
        name: 'Duplicate Personas',
        generatedAt: '2026-06-15T00:00:00.000Z',
        generatedBy: 'manual',
      },
      groups: [{ id: 'main', label: 'Main' }],
      nodes: [
        {
          id: 'source',
          route: '/source',
          label: 'Source',
          group: 'main',
          metadata: { personas: ['speaker', 'speaker'] },
        },
        {
          id: 'target',
          route: '/target',
          label: 'Target',
          group: 'main',
        },
      ],
      edges: [
        {
          id: 'source-target',
          source: 'source',
          target: 'target',
          type: 'link',
          personas: ['speaker', 'speaker'],
        },
      ],
    };

    const speakerOption = getWorkflowFilterOptions(graphWithDuplicates).find(
      option => workflowFilterKey(option.filter) === 'persona:speaker'
    );
    const speakerMatch = matchWorkflowFilter(graphWithDuplicates, {
      kind: 'persona',
      value: 'speaker',
    });

    expect(speakerOption?.count).toBe(2);
    expect([...(speakerMatch?.nodeIds ?? [])]).toEqual(['source']);
    expect([...(speakerMatch?.edgeIds ?? [])]).toEqual(['source-target']);
  });

  it('matches evidence filters from screenshots, inspect hints, source hints, and redirects', () => {
    expect(
      [
        ...(matchWorkflowFilter(graph, { kind: 'evidence', value: 'screenshot' })?.nodeIds ?? []),
      ].sort()
    ).toEqual(['events', 'landing']);
    expect(
      [
        ...(matchWorkflowFilter(graph, { kind: 'evidence', value: 'inspect' })?.nodeIds ?? []),
      ].sort()
    ).toEqual(['events', 'settings']);
    expect([
      ...(matchWorkflowFilter(graph, { kind: 'evidence', value: 'source-hint' })?.nodeIds ?? []),
    ]).toEqual(['events']);

    const redirectMatch = matchWorkflowFilter(graph, { kind: 'evidence', value: 'redirect' });
    expect([...(redirectMatch?.nodeIds ?? [])]).toEqual(['admin']);
    expect([...(redirectMatch?.edgeIds ?? [])]).toEqual(['events-admin']);
  });

  it('formats keys and labels and compares filters by kind and value', () => {
    expect(workflowFilterKey({ kind: 'auth', value: 'signed-in-with-github' })).toBe(
      'auth:signed-in-with-github'
    );
    expect(workflowFilterLabel({ kind: 'auth', value: 'signed-in-with-github' })).toBe(
      'Auth: Signed In With Github'
    );
    expect(
      workflowFiltersEqual(
        { kind: 'section', value: 'speaker' },
        { kind: 'section', value: 'speaker' }
      )
    ).toBe(true);
    expect(
      workflowFiltersEqual(
        { kind: 'section', value: 'speaker' },
        { kind: 'persona', value: 'speaker' }
      )
    ).toBe(false);
  });

  it('handles null graphs, null filters, and filters with no matches', () => {
    expect(getWorkflowFilterOptions(null)).toEqual([]);
    expect(matchWorkflowFilter(null, { kind: 'section', value: 'public' })).toBeNull();
    expect(matchWorkflowFilter(graph, null)).toBeNull();
    expect(matchWorkflowFilter(graph, { kind: 'section', value: 'missing' })).toBeNull();
  });
});
