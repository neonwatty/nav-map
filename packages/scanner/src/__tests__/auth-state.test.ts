import { describe, expect, it } from 'vitest';
import {
  buildAuthStateContract,
  findAuthState,
  redactAuthStateReceipt,
  resolveAuthStateStoragePath,
} from '../modes/auth-state.js';

const manifest = {
  version: 'workflow-atlas/1.0',
  name: 'Deckchecker Speaker',
  authStates: [
    { id: 'signed-out', kind: 'anonymous' },
    {
      id: 'speaker',
      kind: 'storage-state',
      storageStatePath: '.nav-map/auth/deckchecker-speaker.storage.json',
      verify: { route: '/my/events', expectStatus: 200, expectText: 'My Events' },
    },
    { id: 'broken', kind: 'storage-state' },
  ],
  nodes: [{ route: '/', label: 'Home' }],
} as const;

describe('auth-state helpers', () => {
  const privateKeyBlock = '-----BEGIN ' + 'PRIVATE KEY-----abc';

  it('finds auth states by id', () => {
    expect(findAuthState(manifest, 'speaker')?.kind).toBe('storage-state');
    expect(findAuthState(manifest, 'missing')).toBeNull();
  });

  it('resolves storage paths without reading file contents', () => {
    expect(resolveAuthStateStoragePath(manifest, 'speaker')).toContain(
      '.nav-map/auth/deckchecker-speaker.storage.json'
    );
  });

  it('errors clearly for missing or unusable storage states', () => {
    expect(() => resolveAuthStateStoragePath(manifest, 'signed-out')).toThrow(
      'does not use Playwright storage state'
    );
    expect(() => resolveAuthStateStoragePath(manifest, 'missing')).toThrow(
      'Unknown auth state: missing'
    );
    expect(() => resolveAuthStateStoragePath(manifest, 'broken')).toThrow(
      'has no storageStatePath'
    );
  });

  it('redacts sensitive receipt fields and values', () => {
    const receipt = redactAuthStateReceipt({
      authState: 'speaker',
      verified: true,
      route: '/my/events?debug=DATABASE_URL',
      finalUrl: 'http://localhost:3000/my/events?private_key=abc123',
      storageStatePath: '.nav-map/auth/deckchecker-speaker.storage.json',
      reason: 'private-key was present in redirect diagnostics',
      unsafeDebug: 'access_token=secret refresh_token=secret cookie=value',
      nested: {
        cookies: [{ name: 'session', value: 'secret' }],
        localStorage: [{ name: 'token', value: 'secret' }],
        password: 'secret',
        apiKey: 'secret',
        webhookSecret: 'secret',
        databaseUrl: 'postgres://user:pass@example/db',
        authorization: 'Bearer abc123',
        privateKey: privateKeyBlock,
      },
      notes: ['bearer xyz', 'plain safe text'],
    });

    const serialized = JSON.stringify(receipt);
    expect(serialized).toContain('speaker');
    expect(serialized).toContain('.nav-map/auth/deckchecker-speaker.storage.json');
    expect(serialized).toContain('plain safe text');
    expect(serialized).not.toMatch(
      /access_token|refresh_token|cookie=value|localStorage|session|password|apiKey|webhookSecret|DATABASE_URL|postgres:\/\/|Bearer abc123|privateKey|private_key=abc123|private-key|PRIVATE KEY|bearer xyz/i
    );
  });

  it('builds versioned auth-state contracts without storage-state paths', () => {
    const contract = buildAuthStateContract(
      {
        authState: 'speaker',
        verified: true,
        route: '/my/events',
        finalUrl: 'https://deckchecker.app/my/events',
        storageStatePath: '.nav-map/auth/deckchecker-speaker.storage.json',
      },
      'auth-state-verify'
    );

    expect(contract).toMatchObject({
      schemaVersion: 'nav-map-agent-contract/v1',
      kind: 'auth-state-verify',
      summary: {
        authState: 'speaker',
        verified: true,
        route: '/my/events',
      },
      data: {
        authState: 'speaker',
        verified: true,
        route: '/my/events',
        finalUrl: 'https://deckchecker.app/my/events',
      },
    });
    expect(contract.nextActions[0].command).toContain('nav-map context <manifest>');
    expect(JSON.stringify(contract)).not.toContain('storageStatePath');
    expect(JSON.stringify(contract)).not.toContain('.nav-map/auth');
  });
});
