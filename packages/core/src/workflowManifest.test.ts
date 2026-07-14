import { describe, expect, it } from 'vitest';
import {
  routeToId,
  validateWorkflowManifest,
  workflowManifestToGraph,
  type WorkflowManifest,
} from './workflowManifest';

const prcardLikeManifest: WorkflowManifest = {
  version: 'workflow-atlas/1.0',
  name: 'PRcard Workflow Atlas',
  baseUrl: 'http://localhost:3000',
  description: 'High-level PRcard funnel and creator workflow.',
  generatedAt: '2026-06-13T00:00:00.000Z',
  layout: {
    defaultViewMode: 'flow',
    defaultTreeRootId: 'home',
    sectionOrder: ['public', 'auth', 'studio'],
  },
  personas: [
    { id: 'signed-out', label: 'Signed out visitor' },
    { id: 'signed-in', label: 'Signed in creator' },
    { id: 'github-connected', label: 'Creator with GitHub connected' },
  ],
  sections: [
    { id: 'public', label: 'Public Funnel', routePrefix: '/' },
    { id: 'auth', label: 'Auth', routePrefix: '/signin' },
    { id: 'studio', label: 'Creator Studio', routePrefix: '/creator' },
  ],
  nodes: [
    {
      id: 'home',
      route: '/home',
      label: 'Home',
      section: 'public',
      purpose: 'Introduce PRcard and send creators into setup.',
      personas: ['signed-out'],
      authRequirement: 'public',
      screenshot: 'screenshots/prcard/home.svg',
      health: 'healthy',
      inspect: { selector: 'main', notes: 'Primary public funnel surface.' },
    },
    {
      id: 'quick-setup',
      route: '/quick-setup',
      label: 'Quick Setup',
      section: 'studio',
      purpose: 'Create, review, and publish a generated PRcard.',
      personas: ['signed-in', 'github-connected'],
      authRequirement: 'signed-in',
      expectedRedirects: [{ when: 'signed-out', to: '/signup', reason: 'Requires session' }],
      health: { status: 'warning', message: 'Signed-out state redirects.' },
      tags: ['first-run'],
    },
    {
      id: 'creator',
      route: '/creator',
      label: 'Creator',
      section: 'studio',
      purpose: 'Edit and publish source-backed public snapshots.',
      personas: ['github-connected'],
      authRequirement: 'signed-in-with-github',
      expectedRedirects: [{ when: 'no persisted card', to: '/quick-setup' }],
    },
  ],
  edges: [
    {
      source: 'home',
      target: 'quick-setup',
      action: 'Start setup',
      personas: ['signed-out', 'signed-in'],
    },
    {
      source: 'quick-setup',
      target: 'creator',
      action: 'Publish draft',
      type: 'router-push',
      personas: ['github-connected'],
    },
  ],
  flows: [{ name: 'Creator activation', steps: ['home', 'quick-setup', 'creator'] }],
};

describe('workflowManifestToGraph', () => {
  it('converts a project workflow manifest into a NavMap graph', () => {
    const graph = workflowManifestToGraph(prcardLikeManifest, {
      generatedAt: '2026-06-13T12:00:00.000Z',
    });

    expect(graph.meta).toMatchObject({
      name: 'PRcard Workflow Atlas',
      baseUrl: 'http://localhost:3000',
      generatedAt: '2026-06-13T12:00:00.000Z',
      generatedBy: 'manual',
      framework: 'generic',
    });
    expect(graph.meta.workflow?.personas).toHaveLength(3);
    expect(graph.meta.workflow?.layout).toEqual({
      defaultViewMode: 'flow',
      defaultTreeRootId: 'home',
      sectionOrder: ['public', 'auth', 'studio'],
    });
    expect(graph.groups.map(group => group.id)).toEqual(['public', 'auth', 'studio']);
    expect(graph.nodes.map(node => node.id)).toEqual(['home', 'quick-setup', 'creator']);
    expect(graph.nodes[0]).toMatchObject({
      screenshot: 'screenshots/prcard/home.svg',
      metadata: {
        purpose: 'Introduce PRcard and send creators into setup.',
        section: 'public',
        authRequirement: 'public',
        health: { status: 'healthy' },
      },
    });
    expect(graph.nodes[1].metadata?.expectedRedirects).toEqual([
      { when: 'signed-out', to: '/signup', reason: 'Requires session' },
    ]);
    expect(graph.nodes[1].metadata?.authRequired).toBe(true);
    expect(graph.edges[0]).toMatchObject({
      id: 'home-to-quick-setup-1',
      label: 'Start setup',
      action: 'Start setup',
      personas: ['signed-out', 'signed-in'],
      type: 'link',
    });
    expect(graph.flows).toEqual([
      { name: 'Creator activation', steps: ['home', 'quick-setup', 'creator'] },
    ]);
  });

  it('accepts screenshot overrides from capture output', () => {
    const graph = workflowManifestToGraph(prcardLikeManifest, {
      screenshotOverrides: { creator: 'screenshots/prcard/creator.png' },
    });

    expect(graph.nodes.find(node => node.id === 'creator')?.screenshot).toBe(
      'screenshots/prcard/creator.png'
    );
  });

  it('converts prototype surfaces into reusable workflow graph nodes', () => {
    const graph = workflowManifestToGraph({
      version: 'workflow-atlas/1.0',
      name: 'Prototype Surfaces',
      sections: [
        { id: 'live', label: 'Live App' },
        { id: 'prototype', label: 'Prototype' },
      ],
      nodes: [{ id: 'dashboard', route: '/dashboard', label: 'Dashboard', section: 'live' }],
      surfaces: [
        {
          id: 'dashboard-concept',
          label: 'Dashboard Concept',
          type: 'generated-image',
          section: 'prototype',
          purpose: 'Explore the empty-state layout before implementation.',
          screenshot: 'screenshots/prototypes/dashboard-concept.png',
          sourceHints: ['design/dashboard-empty-state.md'],
          metadata: { fidelity: 'concept' },
        },
        {
          id: 'dashboard-html-mockup',
          label: 'Dashboard HTML Mockup',
          type: 'html-mockup',
          section: 'prototype',
          screenshot: 'screenshots/prototypes/dashboard-html-mockup.png',
          metadata: {
            preview: {
              liveUrl: '/mockups/dashboard.html',
              liveMode: 'iframe',
              liveStatus: 'available',
              limitations: ['fixture data', 'no real auth'],
            },
          },
        },
      ],
      edges: [
        {
          source: 'dashboard-concept',
          target: 'dashboard',
          action: 'Implemented by',
          type: 'test-transition',
        },
      ],
      flows: [{ name: 'Prototype to implementation', steps: ['dashboard-concept', 'dashboard'] }],
    } as WorkflowManifest);

    expect(graph.nodes.map(node => node.id)).toEqual([
      'dashboard',
      'dashboard-concept',
      'dashboard-html-mockup',
    ]);
    expect(graph.groups.map(group => group.id)).toEqual(['live', 'prototype']);
    expect(graph.nodes[1]).toMatchObject({
      id: 'dashboard-concept',
      route: 'prototype://dashboard-concept',
      label: 'Dashboard Concept',
      group: 'prototype',
      screenshot: 'screenshots/prototypes/dashboard-concept.png',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'generated-image',
        purpose: 'Explore the empty-state layout before implementation.',
        section: 'prototype',
        sourceHints: ['design/dashboard-empty-state.md'],
        fidelity: 'concept',
      },
    });
    expect(graph.nodes[1].metadata?.artifactKind).toBe('prototype');
    expect(graph.nodes[2]).toMatchObject({
      id: 'dashboard-html-mockup',
      route: 'prototype://dashboard-html-mockup',
      metadata: {
        artifactKind: 'mockup',
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        preview: {
          liveUrl: '/mockups/dashboard.html',
          liveMode: 'iframe',
          liveStatus: 'available',
          limitations: ['fixture data', 'no real auth'],
        },
      },
    });
    expect(graph.nodes[0].metadata?.artifactKind).toBe('app');
    expect(graph.nodes[1].metadata?.artifactKind).toBe('prototype');
    expect(graph.edges[0]).toMatchObject({
      source: 'dashboard-concept',
      target: 'dashboard',
      label: 'Implemented by',
      type: 'test-transition',
    });
    expect(graph.flows).toEqual([
      { name: 'Prototype to implementation', steps: ['dashboard-concept', 'dashboard'] },
    ]);
  });

  it('preserves Deckchecker Speaker auth metadata, route variables, and node expectations', () => {
    const deckcheckerSpeakerManifest: WorkflowManifest = {
      version: 'workflow-atlas/1.0',
      name: 'Deckchecker Speaker Agent Pilot',
      baseUrl: 'http://localhost:3000',
      description: 'Speaker workflow used to prepare and verify a talk deck.',
      authStates: [
        {
          id: 'speaker-storage',
          label: 'Signed in speaker',
          kind: 'storage-state',
          storageStatePath: '.auth/deckchecker-speaker.json',
          capture: {
            mode: 'headed-oauth',
            startRoute: '/login',
            successRoute: '/speaker/decks',
            successSelector: '[data-testid="deck-list"]',
          },
          verify: {
            route: '/api/session',
            expectStatus: 200,
            expectJson: { role: 'speaker' },
          },
        },
        {
          id: 'anonymous',
          kind: 'anonymous',
          verify: {
            route: '/login',
            expectText: 'Sign in',
          },
        },
      ],
      routeVariables: {
        deckId: 'deck-speaker-pilot',
        talkSlug: 'future-of-navigation',
      },
      nodes: [
        {
          id: 'speaker-deck',
          route: '/speaker/decks/{deckId}',
          label: 'Speaker Deck',
          section: 'speaker',
          authRequirement: 'speaker-storage',
          expectations: {
            selectors: ['[data-testid="speaker-notes"]'],
            text: ['Ready for rehearsal'],
            status: 200,
            finalUrl: '/speaker/decks/deck-speaker-pilot',
          },
          sourceHints: ['app/speaker/decks/[deckId]/page.tsx'],
        },
      ],
    };

    const graph = workflowManifestToGraph(deckcheckerSpeakerManifest);

    expect(graph.meta.workflow?.authStates).toEqual(deckcheckerSpeakerManifest.authStates);
    expect(graph.meta.workflow?.routeVariables).toEqual(deckcheckerSpeakerManifest.routeVariables);
    expect(graph.nodes[0].metadata?.expectations).toEqual(
      deckcheckerSpeakerManifest.nodes[0].expectations
    );
    expect(graph.nodes[0].metadata?.sourceHints).toEqual(
      deckcheckerSpeakerManifest.nodes[0].sourceHints
    );
  });

  it('keeps structured node purpose when metadata contains a stale purpose', () => {
    const graph = workflowManifestToGraph({
      version: 'workflow-atlas/1.0',
      name: 'Purpose precedence',
      nodes: [
        {
          id: 'dashboard',
          route: '/dashboard',
          label: 'Dashboard',
          purpose: 'Structured purpose',
          metadata: { purpose: 'Stale metadata purpose' },
        },
      ],
    });

    expect(graph.nodes[0].metadata?.purpose).toBe('Structured purpose');
  });

  it('keeps first-class workflow fields when manifest metadata contains conflicting keys', () => {
    const authStates = [
      {
        id: 'speaker-storage',
        kind: 'storage-state' as const,
        storageStatePath: '.auth/deckchecker-speaker.json',
      },
    ];
    const routeVariables = { deckId: 'deck-speaker-pilot' };
    const graph = workflowManifestToGraph({
      version: 'workflow-atlas/1.0',
      name: 'Deckchecker Speaker Agent Pilot',
      description: 'Top-level speaker workflow description.',
      personas: [{ id: 'speaker', label: 'Speaker' }],
      authStates,
      routeVariables,
      metadata: {
        description: 'Metadata description should not win.',
        personas: [{ id: 'metadata-persona', label: 'Metadata Persona' }],
        authStates: [{ id: 'metadata-auth', kind: 'anonymous' }],
        routeVariables: { deckId: 'metadata-deck' },
      },
      nodes: [{ id: 'speaker-home', route: '/speaker', label: 'Speaker Home' }],
    });

    expect(graph.meta.workflow).toMatchObject({
      description: 'Top-level speaker workflow description.',
      personas: [{ id: 'speaker', label: 'Speaker' }],
      authStates,
      routeVariables,
    });
  });

  it('converts the golden agent fixture into app, mockup, and static prototype nodes', () => {
    const manifest: WorkflowManifest = {
      version: 'workflow-atlas/1.0',
      name: 'Golden Agent Workflow',
      baseUrl: 'http://127.0.0.1:9',
      nodes: [
        {
          id: 'home',
          route: '/',
          label: 'Home',
          section: 'app',
          authRequirement: 'public',
          screenshot: 'screenshots/golden-agent/home.svg',
        },
        {
          id: 'dashboard',
          route: '/dashboard',
          label: 'Dashboard Boundary',
          section: 'protected',
          authRequirement: 'signed-in',
          expectedRedirects: [
            {
              when: 'signed-out',
              to: '/login?next=%2Fdashboard',
              reason: 'Requires an authenticated reviewer session.',
            },
          ],
        },
      ],
      surfaces: [
        {
          id: 'checkout-html-mockup',
          label: 'Checkout HTML Mockup',
          type: 'html-mockup',
          section: 'prototype',
          screenshot: 'screenshots/golden-agent/checkout-mockup.svg',
          metadata: {
            preview: {
              liveUrl: '/mockups/golden-checkout.html',
              liveMode: 'iframe',
              liveStatus: 'available',
            },
          },
        },
        {
          id: 'checkout-static-prototype',
          label: 'Checkout Static Prototype',
          type: 'concept-screen',
          section: 'prototype',
          screenshot: 'screenshots/golden-agent/static-prototype.svg',
        },
      ],
      edges: [
        { source: 'home', target: 'dashboard', action: 'Open protected dashboard' },
        { source: 'checkout-static-prototype', target: 'checkout-html-mockup' },
        { source: 'checkout-html-mockup', target: 'dashboard' },
      ],
      flows: [
        { name: 'Signed-out boundary', steps: ['home', 'dashboard'] },
        {
          name: 'Prototype handoff',
          steps: ['checkout-static-prototype', 'checkout-html-mockup', 'dashboard'],
          partial: true,
        },
      ],
    };

    const validation = validateWorkflowManifest(manifest);
    expect(validation.valid).toBe(true);

    const graph = workflowManifestToGraph(manifest);
    const home = graph.nodes.find(node => node.id === 'home');
    const dashboard = graph.nodes.find(node => node.id === 'dashboard');
    const mockup = graph.nodes.find(node => node.id === 'checkout-html-mockup');
    const prototype = graph.nodes.find(node => node.id === 'checkout-static-prototype');

    expect(graph.meta.name).toBe('Golden Agent Workflow');
    expect(graph.meta.baseUrl).toBe('http://127.0.0.1:9');
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(3);
    expect(graph.flows).toHaveLength(2);
    expect(home).toMatchObject({
      route: '/',
      screenshot: 'screenshots/golden-agent/home.svg',
      metadata: { artifactKind: 'app', section: 'app' },
    });
    expect(dashboard?.metadata?.expectedRedirects).toEqual([
      expect.objectContaining({ when: 'signed-out', to: '/login?next=%2Fdashboard' }),
    ]);
    expect(mockup).toMatchObject({
      route: 'prototype://checkout-html-mockup',
      screenshot: 'screenshots/golden-agent/checkout-mockup.svg',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'html-mockup',
        artifactKind: 'mockup',
        preview: expect.objectContaining({
          liveUrl: '/mockups/golden-checkout.html',
          liveMode: 'iframe',
          liveStatus: 'available',
        }),
      },
    });
    expect(prototype).toMatchObject({
      route: 'prototype://checkout-static-prototype',
      screenshot: 'screenshots/golden-agent/static-prototype.svg',
      metadata: {
        kind: 'prototype-surface',
        surfaceType: 'concept-screen',
        artifactKind: 'prototype',
      },
    });
  });

  it('validates workflow layout hints', () => {
    const result = validateWorkflowManifest({
      version: 'workflow-atlas/1.0',
      name: 'Invalid Layout',
      layout: {
        defaultViewMode: 'grid',
        defaultTreeRootId: '',
        sectionOrder: ['public', 42],
      },
      nodes: [{ id: 'home', route: '/', label: 'Home' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'layout.defaultViewMode' }),
        expect.objectContaining({ field: 'layout.defaultTreeRootId' }),
        expect.objectContaining({ field: 'layout.sectionOrder' }),
      ])
    );
  });

  it('derives authRequired from auth state kind and preserves explicit boolean metadata', () => {
    const graph = workflowManifestToGraph({
      version: 'workflow-atlas/1.0',
      name: 'Deckchecker Speaker Agent Pilot',
      authStates: [
        { id: 'anonymous-speaker', kind: 'anonymous' },
        {
          id: 'speaker-storage',
          kind: 'storage-state',
          storageStatePath: '.auth/deckchecker-speaker.json',
        },
      ],
      nodes: [
        {
          id: 'signed-out-speaker',
          route: '/speaker/login',
          label: 'Speaker Login',
          authRequirement: 'signed-out',
        },
        {
          id: 'anonymous-speaker',
          route: '/speaker/public',
          label: 'Public Speaker Deck',
          authRequirement: 'anonymous-speaker',
        },
        {
          id: 'speaker-dashboard',
          route: '/speaker/decks',
          label: 'Speaker Dashboard',
          authRequirement: 'speaker-storage',
        },
        {
          id: 'forced-public',
          route: '/speaker/embed',
          label: 'Speaker Embed',
          authRequirement: 'speaker-storage',
          metadata: { authRequired: false },
        },
      ],
    });

    expect(graph.nodes.find(node => node.id === 'signed-out-speaker')?.metadata?.authRequired).toBe(
      false
    );
    expect(graph.nodes.find(node => node.id === 'anonymous-speaker')?.metadata?.authRequired).toBe(
      false
    );
    expect(graph.nodes.find(node => node.id === 'speaker-dashboard')?.metadata?.authRequired).toBe(
      true
    );
    expect(graph.nodes.find(node => node.id === 'forced-public')?.metadata?.authRequired).toBe(
      false
    );
  });

  it('reports duplicate generated node IDs and unknown edge endpoints', () => {
    const result = validateWorkflowManifest({
      version: 'workflow-atlas/1.0',
      name: 'Bad',
      nodes: [
        { route: '/creator', label: 'Creator A' },
        { route: '/creator', label: 'Creator B' },
      ],
      edges: [{ source: 'creator', target: 'missing' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'duplicate node id "creator"' }),
        expect.objectContaining({ message: 'target references unknown node "missing"' }),
      ])
    );
  });

  it('validates malformed auth states and route variables', () => {
    const result = validateWorkflowManifest({
      version: 'workflow-atlas/1.0',
      name: 'Bad Deckchecker Speaker manifest',
      authStates: [
        null,
        {
          id: '',
          kind: 'storage-state',
          verify: {
            route: 'api/session',
            expectStatus: '200',
            expectText: 42,
            expectSelector: 42,
            expectJson: 'speaker',
          },
          capture: {
            mode: 'popup',
            startRoute: '',
            successRoute: 'speaker/decks',
            successSelector: 42,
            successText: 42,
          },
        },
        { id: 'speaker-setup', kind: 'setup-command' },
        { id: 'speaker-invalid', kind: 'magic' },
      ],
      routeVariables: { deckId: 42 },
      nodes: [{ id: 'speaker-home', route: '/speaker', label: 'Speaker Home' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'authStates.0', message: 'authState must be an object' }),
        expect.objectContaining({
          field: 'authStates.1.id',
          message: 'id must be a non-empty string',
        }),
        expect.objectContaining({
          field: 'authStates.1.storageStatePath',
          message: 'storage-state auth states require storageStatePath',
        }),
        expect.objectContaining({
          field: 'authStates.1.verify.route',
          message: 'route must start with "/"',
        }),
        expect.objectContaining({
          field: 'authStates.1.verify.expectStatus',
          message: 'expectStatus must be a number',
        }),
        expect.objectContaining({
          field: 'authStates.1.verify.expectText',
          message: 'expectText must be a string',
        }),
        expect.objectContaining({
          field: 'authStates.1.verify.expectSelector',
          message: 'expectSelector must be a string',
        }),
        expect.objectContaining({
          field: 'authStates.1.verify.expectJson',
          message: 'expectJson must be an object',
        }),
        expect.objectContaining({
          field: 'authStates.1.capture.mode',
          message: 'mode must be headed-login or headed-oauth',
        }),
        expect.objectContaining({
          field: 'authStates.1.capture.startRoute',
          message: 'startRoute must be a non-empty route string',
        }),
        expect.objectContaining({
          field: 'authStates.1.capture.successRoute',
          message: 'successRoute must start with "/"',
        }),
        expect.objectContaining({
          field: 'authStates.1.capture.successSelector',
          message: 'successSelector must be a string',
        }),
        expect.objectContaining({
          field: 'authStates.1.capture.successText',
          message: 'successText must be a string',
        }),
        expect.objectContaining({
          field: 'authStates.2.setupCommand',
          message: 'setup-command auth states require setupCommand',
        }),
        expect.objectContaining({
          field: 'authStates.3.kind',
          message: 'kind must be anonymous, storage-state, or setup-command',
        }),
        expect.objectContaining({
          field: 'routeVariables.deckId',
          message: 'route variable values must be strings',
        }),
      ])
    );
  });

  it('reports duplicate auth state IDs', () => {
    const result = validateWorkflowManifest({
      version: 'workflow-atlas/1.0',
      name: 'Bad Deckchecker Speaker auth states',
      authStates: [
        {
          id: 'speaker-storage',
          kind: 'storage-state',
          storageStatePath: '.auth/deckchecker-speaker.json',
        },
        {
          id: 'speaker-storage',
          kind: 'setup-command',
          setupCommand: 'pnpm auth:setup:speaker',
        },
      ],
      nodes: [{ id: 'speaker-home', route: '/speaker', label: 'Speaker Home' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'authStates.1.id',
          message: 'duplicate authState id "speaker-storage"',
        }),
      ])
    );
  });

  it('validates malformed node expectations and source hints', () => {
    const result = validateWorkflowManifest({
      version: 'workflow-atlas/1.0',
      name: 'Bad Deckchecker Speaker node',
      nodes: [
        {
          id: 'speaker-home',
          route: '/speaker',
          label: 'Speaker Home',
          expectations: {
            selectors: ['main', 42],
            text: 'Ready',
            signedOutRedirect: 42,
            finalUrl: 42,
            status: '200',
          },
          sourceHints: ['app/speaker/page.tsx', 42],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'nodes.0.expectations.selectors',
          message: 'selectors must be an array of strings',
        }),
        expect.objectContaining({
          field: 'nodes.0.expectations.text',
          message: 'text must be an array of strings',
        }),
        expect.objectContaining({
          field: 'nodes.0.expectations.signedOutRedirect',
          message: 'signedOutRedirect must be a string',
        }),
        expect.objectContaining({
          field: 'nodes.0.expectations.finalUrl',
          message: 'finalUrl must be a string',
        }),
        expect.objectContaining({
          field: 'nodes.0.expectations.status',
          message: 'status must be a number',
        }),
        expect.objectContaining({
          field: 'nodes.0.sourceHints',
          message: 'sourceHints must be an array of strings',
        }),
      ])
    );
  });

  it('validates malformed prototype surfaces', () => {
    const result = validateWorkflowManifest({
      version: 'workflow-atlas/1.0',
      name: 'Bad prototype surfaces',
      nodes: [{ id: 'dashboard', route: '/dashboard', label: 'Dashboard' }],
      surfaces: [
        null,
        {
          id: 'dashboard',
          label: '',
          type: 'figma-frame',
          sourceHints: ['mockups/dashboard.html', 42],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'surfaces.0', message: 'surface must be an object' }),
        expect.objectContaining({
          field: 'surfaces.1.id',
          message: 'duplicate node id "dashboard"',
        }),
        expect.objectContaining({
          field: 'surfaces.1.label',
          message: 'label must be a non-empty string',
        }),
        expect.objectContaining({
          field: 'surfaces.1.type',
          message:
            'type must be screenshot, generated-image, html-mockup, video, keyframe, component, or concept-screen',
        }),
        expect.objectContaining({
          field: 'surfaces.1.sourceHints',
          message: 'sourceHints must be an array of strings',
        }),
      ])
    );
  });

  it('rejects legacy or invalid flow shapes with actionable errors', () => {
    const result = validateWorkflowManifest({
      version: 'workflow-atlas/1.0',
      name: 'Legacy flows',
      nodes: [{ id: 'home', route: '/', label: 'Home' }],
      flows: [{ id: 'primary', label: 'Primary', steps: ['home', 'missing'], partial: 'yes' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'flows.0.name',
          message: expect.stringContaining('Legacy "label" detected; rename it to "name"'),
        }),
        expect.objectContaining({
          field: 'flows.0.steps.1',
          message: 'step references unknown node "missing"',
        }),
        expect.objectContaining({
          field: 'flows.0.partial',
          message: 'partial must be a boolean when provided',
        }),
      ])
    );
  });

  it('creates stable route IDs for common app route shapes', () => {
    expect(routeToId('/')).toBe('index');
    expect(routeToId('/api/public/snapshot/[slug]')).toBe('api-public-snapshot-slug');
    expect(routeToId('/[...slug]')).toBe('slug');
  });
});
