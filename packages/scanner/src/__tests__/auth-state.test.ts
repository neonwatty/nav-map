import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthStateContract,
  findAuthState,
  redactAuthStateReceipt,
  resolveAuthStateStoragePath,
  verifyAuthState,
} from '../modes/auth-state.js';

const mocks = vi.hoisted(() => ({
  launchMock: vi.fn(),
  browserCloseMock: vi.fn(),
  contextCloseMock: vi.fn(),
  newContextMock: vi.fn(),
  newPageMock: vi.fn(),
  gotoMock: vi.fn(),
  pageUrlMock: vi.fn(),
  textVisibleMock: vi.fn(),
  selectorVisibleMock: vi.fn(),
  responseJsonMock: vi.fn(),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: mocks.launchMock,
  },
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gotoMock.mockResolvedValue({
      status: () => 200,
      json: mocks.responseJsonMock,
    });
    mocks.pageUrlMock.mockReturnValue('http://localhost:3000/my/events');
    mocks.textVisibleMock.mockResolvedValue(true);
    mocks.selectorVisibleMock.mockResolvedValue(true);
    mocks.responseJsonMock.mockResolvedValue({ ok: true });
    mocks.contextCloseMock.mockResolvedValue(undefined);
    mocks.browserCloseMock.mockResolvedValue(undefined);
    mocks.newPageMock.mockResolvedValue({
      goto: mocks.gotoMock,
      url: mocks.pageUrlMock,
      getByText: () => ({
        first: () => ({ isVisible: mocks.textVisibleMock }),
      }),
      locator: () => ({
        first: () => ({ isVisible: mocks.selectorVisibleMock }),
      }),
    });
    mocks.newContextMock.mockResolvedValue({
      newPage: mocks.newPageMock,
      close: mocks.contextCloseMock,
    });
    mocks.launchMock.mockResolvedValue({
      newContext: mocks.newContextMock,
      close: mocks.browserCloseMock,
    });
  });

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
    expect(serialized).toContain('plain safe text');
    expect(serialized).not.toContain('.nav-map/auth/deckchecker-speaker.storage.json');
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
        reasonCode: 'verified',
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
        reasonCode: 'verified',
      },
    });
    expect(contract.nextActions[0].command).toContain('nav-map context <manifest>');
    expect(JSON.stringify(contract)).not.toContain('storageStatePath');
    expect(JSON.stringify(contract)).not.toContain('.nav-map/auth');
  });

  it('returns safe receipts for missing auth config without launching a browser', async () => {
    await expect(
      verifyAuthState({
        manifest,
        stateId: 'missing',
        baseUrl: 'http://localhost:3000',
      })
    ).resolves.toMatchObject({
      authState: 'missing',
      verified: false,
      reasonCode: 'missing-auth-state',
    });

    await expect(
      verifyAuthState({
        manifest,
        stateId: 'signed-out',
        baseUrl: 'http://localhost:3000',
      })
    ).resolves.toMatchObject({
      authState: 'signed-out',
      verified: false,
      reasonCode: 'missing-auth-verify',
    });
    expect(mocks.launchMock).not.toHaveBeenCalled();
  });

  it('returns safe receipts for missing storage-state paths and files', async () => {
    const storageManifest = {
      authStates: [
        {
          id: 'missing-path',
          kind: 'storage-state',
          verify: { route: '/my/events', expectStatus: 200 },
        },
        {
          id: 'missing-file',
          kind: 'storage-state',
          storageStatePath: '.nav-map/auth/missing.storage.json',
          verify: { route: '/my/events', expectStatus: 200 },
        },
      ],
    } as const;

    await expect(
      verifyAuthState({
        manifest: storageManifest,
        stateId: 'missing-path',
        baseUrl: 'http://localhost:3000',
      })
    ).resolves.toMatchObject({
      authState: 'missing-path',
      verified: false,
      reasonCode: 'missing-storage-state-path',
    });

    await expect(
      verifyAuthState({
        manifest: storageManifest,
        stateId: 'missing-file',
        baseUrl: 'http://localhost:3000',
      })
    ).resolves.toMatchObject({
      authState: 'missing-file',
      verified: false,
      reasonCode: 'missing-storage-state-file',
    });
    expect(mocks.launchMock).not.toHaveBeenCalled();
  });

  it('differentiates expected and unexpected auth redirects without exposing storage paths', async () => {
    const anonymousManifest = {
      authStates: [
        {
          id: 'anonymous-check',
          kind: 'anonymous',
          verify: {
            route: '/my/events',
            expectRedirect: '/sign-in?next=/my/events',
            expectStatus: 200,
          },
        },
      ],
    } as const;
    mocks.pageUrlMock.mockReturnValue('http://localhost:3000/sign-in?next=%2Fmy%2Fevents');

    await expect(
      verifyAuthState({
        manifest: anonymousManifest,
        stateId: 'anonymous-check',
        baseUrl: 'http://localhost:3000',
      })
    ).resolves.toMatchObject({
      authState: 'anonymous-check',
      verified: true,
      route: '/my/events',
      finalUrl: 'http://localhost:3000/sign-in?next=%2Fmy%2Fevents',
      reasonCode: 'expected-redirect',
    });

    mocks.pageUrlMock.mockReturnValue('http://localhost:3000/sign-in');
    await expect(
      verifyAuthState({
        manifest: anonymousManifest,
        stateId: 'anonymous-check',
        baseUrl: 'http://localhost:3000',
      })
    ).resolves.toMatchObject({
      authState: 'anonymous-check',
      verified: false,
      reasonCode: 'unexpected-redirect',
    });
    expect(JSON.stringify(mocks.newContextMock.mock.calls)).not.toContain('.nav-map/auth');
  });
});
