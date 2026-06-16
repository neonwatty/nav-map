import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadWorkflowManifest,
  renderWorkflowContext,
  renderWorkflowContextContract,
} from '../modes/context.js';

const manifest = {
  version: 'workflow-atlas/1.0',
  name: 'Deckchecker Speaker',
  authStates: [
    {
      id: 'speaker',
      label: 'Speaker',
      kind: 'storage-state',
      storageStatePath: '.nav-map/auth/deckchecker-speaker.storage.json',
    },
  ],
  nodes: [
    {
      id: 'speaker-events',
      route: '/my/events',
      label: 'My Events',
      section: 'speaker',
      purpose: 'Speaker event list.',
      screenshot: 'screenshots/deckchecker-speaker/my-events.png',
      personas: ['speaker'],
      authRequirement: 'speaker',
      expectedRedirects: [{ when: 'signed-out', to: '/sign-in?next=/my/events' }],
      expectations: { text: ['My Events'] },
      health: { status: 'healthy' },
      inspect: { selector: 'main' },
      sourceHints: ['web/src/app/(speaker)/my/events/page.tsx'],
    },
    {
      id: 'speaker-settings',
      route: '/my/settings',
      label: 'Speaker Settings',
      section: 'speaker',
      purpose: 'Speaker profile settings.',
      personas: ['speaker'],
      authRequirement: 'speaker',
      expectations: { text: ['Settings'] },
      health: { status: 'warning' },
      sourceHints: ['web/src/app/(speaker)/my/settings/page.tsx'],
    },
    {
      id: 'admin-events',
      route: '/admin/events',
      label: 'Admin Events',
      section: 'admin',
      purpose: 'Admin event list.',
      personas: ['admin'],
      authRequirement: 'admin',
      expectations: { text: ['Admin Events'] },
      sourceHints: ['web/src/app/admin/events/page.tsx'],
    },
  ],
  edges: [],
  flows: [
    { name: 'Speaker sign-in and event list', steps: ['speaker-events', 'speaker-settings'] },
    { name: 'Admin event list', steps: ['admin-events'] },
  ],
} as const;

describe('renderWorkflowContext', () => {
  const privateKeyBlock = '-----BEGIN ' + 'PRIVATE KEY-----context-----END ' + 'PRIVATE KEY-----';

  it('renders focused Markdown without leaking auth storage contents', () => {
    const output = renderWorkflowContext(manifest, {
      format: 'markdown',
      focus: ['speaker'],
      authState: 'speaker',
      lineBudget: 250,
    });

    expect(output).toContain('# Deckchecker Speaker Agent Context');
    expect(output).toContain('Auth state: `speaker`');
    expect(output).toContain('speaker-events');
    expect(output).toContain('/my/events');
    expect(output).toContain('Speaker sign-in and event list');
    expect(output).toContain('/sign-in?next=/my/events');
    expect(output).toContain('My Events');
    expect(output).toContain('web/src/app/(speaker)/my/events/page.tsx');
    expect(output).not.toContain('admin-events');
    expect(output).not.toContain('.nav-map/auth/deckchecker-speaker.storage.json');
    expect(output).not.toMatch(/cookie|localStorage|access_token|refresh_token/i);
    expect(output.split('\n').length).toBeLessThanOrEqual(250);
  });

  it('renders JSON context for tool consumption', () => {
    const output = renderWorkflowContext(manifest, {
      format: 'json',
      focus: ['speaker'],
      authState: 'speaker',
      lineBudget: 250,
    });

    const parsed = JSON.parse(output);
    expect(parsed.name).toBe('Deckchecker Speaker');
    expect(parsed.authState).toBe('speaker');
    expect(parsed.routes).toHaveLength(2);
    expect(parsed.routes[0].id).toBe('speaker-events');
    expect(parsed.flows).toHaveLength(1);
  });

  it('renders a versioned agent contract for workflow context', () => {
    const output = renderWorkflowContextContract(manifest, {
      format: 'json',
      focus: ['speaker'],
      authState: 'speaker',
      lineBudget: 250,
      manifestPath: 'deckchecker-speaker.workflow.json',
    });

    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({
      schemaVersion: 'nav-map-agent-contract/v1',
      kind: 'workflow-context',
      summary: {
        app: 'Deckchecker Speaker',
        authState: 'speaker',
        routeCount: 2,
        flowCount: 1,
      },
    });
    expect(parsed.data.routes[0].id).toBe('speaker-events');
    expect(parsed.nextActions[0].command).toContain(
      'nav-map probe deckchecker-speaker.workflow.json'
    );
    expect(JSON.stringify(parsed)).not.toContain('.nav-map/auth/deckchecker-speaker.storage.json');
  });

  it('filters by auth requirement without exposing auth storage paths', () => {
    const output = renderWorkflowContext(manifest, {
      format: 'json',
      focus: [],
      auth: ['speaker'],
      lineBudget: 250,
    });

    const parsed = JSON.parse(output);
    expect(parsed.routes.map((route: { id: string }) => route.id)).toEqual([
      'speaker-events',
      'speaker-settings',
    ]);
    expect(
      parsed.routes.every(
        (route: { authRequirement: string }) => route.authRequirement === 'speaker'
      )
    ).toBe(true);
    expect(JSON.stringify(parsed)).not.toContain('.nav-map/auth');
    expect(JSON.stringify(parsed)).not.toContain('deckchecker-speaker.storage.json');
  });

  it('filters by persona and screenshot evidence with route evidence metadata', () => {
    const output = renderWorkflowContext(manifest, {
      format: 'json',
      focus: [],
      persona: ['speaker'],
      evidence: ['screenshot'],
      lineBudget: 250,
    });

    const parsed = JSON.parse(output);
    expect(parsed.routes).toHaveLength(1);
    expect(parsed.routes[0]).toMatchObject({
      id: 'speaker-events',
      health: 'healthy',
      evidence: ['screenshot', 'inspect', 'source-hint', 'redirect'],
    });
  });

  it('includes only non-empty filters in contract summary', () => {
    const output = renderWorkflowContextContract(manifest, {
      format: 'json',
      focus: [],
      auth: ['speaker'],
      health: [],
      evidence: ['screenshot'],
      lineBudget: 250,
      manifestPath: 'deckchecker-speaker.workflow.json',
    });

    const parsed = JSON.parse(output);
    expect(parsed.summary.filters).toEqual({
      auth: ['speaker'],
      evidence: ['screenshot'],
    });
  });

  it('omits contract filter summary when no filters are active', () => {
    const output = renderWorkflowContextContract(manifest, {
      format: 'json',
      focus: [],
      lineBudget: 250,
      manifestPath: 'deckchecker-speaker.workflow.json',
    });

    const parsed = JSON.parse(output);
    expect(parsed.summary).not.toHaveProperty('filters');
  });

  it('filters focus by node id and caps Markdown lines', () => {
    const output = renderWorkflowContext(manifest, {
      format: 'markdown',
      focus: ['admin-events'],
      lineBudget: 8,
    });

    expect(output).toContain('admin-events');
    expect(output).not.toContain('speaker-events');
    expect(output.split('\n').length).toBeLessThanOrEqual(8);
  });

  it('redacts secret-shaped keys and values from rendered manifest fields', () => {
    const output = renderWorkflowContext(
      {
        name: 'Sensitive Context',
        nodes: [
          {
            id: 'sensitive-route',
            route: '/sensitive',
            label: 'Sensitive',
            section: 'speaker',
            purpose: 'Connects with Bearer sk_test_context and DATABASE_URL=postgres://context',
            expectations: {
              text: ['Renders after password context'],
              selectors: ['main'],
              privateKey: privateKeyBlock,
              webhookSecret: 'whsec_context',
              serviceApiKey: 'api_key_context',
              refreshToken: 'refresh_context',
              cookies: ['opaque-session-value'],
              localStorage: { session: 'opaque-local-storage-value' },
            },
            health: {
              status: 'warning',
              message: 'Uses token=leaked-value',
            },
            inspect: {
              selector: 'main',
              notes: 'Contains cookie=secret',
            },
            screenshot: '.nav-map/auth/sensitive.storage.json',
            sourceHints: ['WEBHOOK_SECRET=whsec_context'],
          },
        ],
        flows: [{ name: 'Token flow', steps: ['sensitive-route'] }],
      },
      {
        format: 'json',
        focus: ['speaker'],
        lineBudget: 250,
      }
    );

    expect(output).not.toMatch(
      /sk_test_context|postgres:\/\/context|BEGIN PRIVATE KEY|whsec_context|api_key_context|refresh_context|opaque-session-value|opaque-local-storage-value|leaked-value|cookie=secret|\.nav-map\/auth|sensitive\.storage\.json/i
    );
  });

  it('allows safe auth prose and URLs while redacting credential-shaped strings', () => {
    const output = renderWorkflowContext(
      {
        name: 'Safe Auth Language',
        nodes: [
          {
            id: 'safe-auth-language',
            route: '/signin?auth=missing-env',
            label: 'Token Settings',
            section: 'public',
            purpose: 'Review token settings and password reset page before reading cookie policy.',
            expectations: {
              text: ['Open token settings', 'Visit the password reset page'],
              finalUrl: '/signin?auth=missing-env',
              bearer: 'Bearer sk_live_context',
              database: 'DATABASE_URL=postgres://context',
              cookieHeader: 'Set-Cookie: session=opaque',
              idToken: 'id_token=opaque',
            },
            sourceHints: ['app/token-settings/page.tsx'],
          },
        ],
      },
      {
        format: 'json',
        focus: [],
        lineBudget: 250,
      }
    );

    expect(output).toContain('/signin?auth=missing-env');
    expect(output).toContain(
      'Review token settings and password reset page before reading cookie policy.'
    );
    expect(output).toContain('Open token settings');
    expect(output).toContain('Visit the password reset page');
    expect(output).toContain('app/token-settings/page.tsx');
    expect(output).not.toMatch(
      /sk_live_context|postgres:\/\/context|Set-Cookie: session=opaque|id_token=opaque/i
    );
  });

  it('rejects unknown health and evidence filter values', () => {
    expect(() =>
      renderWorkflowContext(manifest, {
        format: 'json',
        focus: [],
        health: ['green'],
        lineBudget: 250,
      })
    ).toThrow('--health must be one of: healthy, warning, failing, unchecked, unknown');

    expect(() =>
      renderWorkflowContext(manifest, {
        format: 'json',
        focus: [],
        evidence: ['video'],
        lineBudget: 250,
      })
    ).toThrow('--evidence must be one of: screenshot, inspect, source-hint, redirect');
  });

  it('focuses nodes and flows by generated node id when manifest node id is omitted', () => {
    const output = renderWorkflowContext(
      {
        name: 'Generated IDs',
        nodes: [
          {
            route: '/speaker/decks/[deckId]',
            label: 'Speaker Deck',
            section: 'speaker',
          },
          {
            id: 'admin-events',
            route: '/admin/events',
            label: 'Admin Events',
            section: 'admin',
          },
        ],
        flows: [
          {
            name: 'Mixed flow',
            steps: ['speaker-decks-deckid', 'admin-events'],
          },
        ],
      },
      {
        format: 'markdown',
        focus: ['speaker-decks-deckid'],
        lineBudget: 250,
      }
    );

    expect(output).toContain('speaker-decks-deckid');
    expect(output).toContain('/speaker/decks/[deckId]');
    expect(output).toContain('Mixed flow: speaker-decks-deckid');
    expect(output).not.toContain('admin-events');
  });

  it('filters rendered flow steps to focused node ids', () => {
    const output = renderWorkflowContext(
      {
        name: 'Focused Flows',
        nodes: [
          {
            id: 'speaker-events',
            route: '/my/events',
            label: 'My Events',
            section: 'speaker',
          },
          {
            id: 'admin-events',
            route: '/admin/events',
            label: 'Admin Events',
            section: 'admin',
          },
        ],
        flows: [
          {
            name: 'Mixed flow',
            steps: ['speaker-events', 'admin-events'],
          },
        ],
      },
      {
        format: 'json',
        focus: ['speaker'],
        lineBudget: 250,
      }
    );

    expect(JSON.parse(output).flows).toEqual([
      {
        name: 'Mixed flow',
        steps: ['speaker-events'],
      },
    ]);
  });

  it('validates loaded workflow manifests', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-context-'));
    const manifestPath = path.join(tempDir, 'invalid.workflow.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 'workflow-atlas/1.0',
        name: 'Invalid',
        nodes: [{ route: 'missing-leading-slash', label: 'Broken' }],
      })
    );

    expect(() => loadWorkflowManifest(manifestPath)).toThrow(
      /Invalid workflow manifest:\n {2}- nodes\.0\.route: route must start with "\/"/
    );
  });
});
