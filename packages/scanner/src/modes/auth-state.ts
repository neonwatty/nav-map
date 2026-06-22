import fs from 'node:fs';
import path from 'node:path';
import type { Response } from 'playwright';
import { createAgentContract, type AgentContract } from './agent-contract.js';

export interface AuthStateReceipt {
  authState: string;
  verified: boolean;
  route?: string;
  finalUrl?: string;
  storageStatePath?: string;
  reasonCode?: AuthStateReasonCode;
  reason?: string;
  unsafeDebug?: string;
  [key: string]: unknown;
}

export type AuthStateReasonCode =
  | 'verified'
  | 'expected-redirect'
  | 'missing-auth-state'
  | 'missing-auth-verify'
  | 'missing-storage-state-path'
  | 'missing-storage-state-file'
  | 'verification-failed'
  | 'unexpected-redirect';

export interface AuthStateContractData {
  authState: string;
  verified: boolean;
  route?: string;
  finalUrl?: string;
  reasonCode?: AuthStateReasonCode;
  reason?: string;
}

export interface VerifyAuthStateOptions {
  manifest: AuthStateManifest;
  stateId: string;
  baseUrl: string;
}

export interface CaptureAuthStateOptions {
  manifest: AuthStateManifest;
  stateId: string;
  baseUrl: string;
  outputPath: string;
  headed: boolean;
}

export interface WorkflowAuthStateVerify {
  route: string;
  expectStatus?: number;
  expectFinalUrl?: string;
  expectRedirect?: string;
  expectText?: string;
  expectSelector?: string;
  expectJson?: Record<string, unknown>;
}

export interface WorkflowAuthStateCapture {
  mode: 'headed-login' | 'headed-oauth';
  startRoute: string;
  successRoute: string;
  successSelector?: string;
  successText?: string;
}

export interface WorkflowAuthState {
  id: string;
  label?: string;
  kind: 'anonymous' | 'storage-state' | 'setup-command';
  storageStatePath?: string;
  setupCommand?: string;
  capture?: WorkflowAuthStateCapture;
  verify?: WorkflowAuthStateVerify;
}

export type AuthStateManifest = {
  authStates?: readonly WorkflowAuthState[];
};

type PlaywrightModule = typeof import('playwright');

const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password|token|private[_-]?key|database[_-]?url|authorization|bearer[_-]?auth|webhook[_-]?secret|cookie|cookies|local[_-]?storage|storage[_-]?state[_-]?path)($|[_-])/i;
const SENSITIVE_VALUE_PATTERN =
  /cookie|localStorage|access_token|refresh_token|bearer\s+\S+|api[_-]?key\b|secret\b|database[_-]?url\b|postgres(?:ql)?:\/\/|password\b|token\b|private[_-]?key\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|whsec_/i;

export function findAuthState(
  manifest: AuthStateManifest,
  stateId: string
): WorkflowAuthState | null {
  return manifest.authStates?.find(state => state.id === stateId) ?? null;
}

export function resolveAuthStateStoragePath(manifest: AuthStateManifest, stateId: string): string {
  const state = findAuthState(manifest, stateId);
  if (!state) {
    throw new Error(`Unknown auth state: ${stateId}`);
  }
  if (state.kind === 'anonymous') {
    throw new Error(`Auth state "${stateId}" does not use Playwright storage state`);
  }
  if (!state.storageStatePath) {
    throw new Error(`Auth state "${stateId}" has no storageStatePath`);
  }

  return path.resolve(state.storageStatePath);
}

export function resolveOptionalAuthStateStoragePath(
  manifest: AuthStateManifest,
  stateId?: string
): string | undefined {
  if (!stateId) {
    return undefined;
  }

  const state = findAuthState(manifest, stateId);
  if (!state) {
    throw new Error(`Unknown auth state: ${stateId}`);
  }
  if (state.kind === 'anonymous') {
    return undefined;
  }
  if (state.kind !== 'storage-state') {
    throw new Error(`Auth state "${stateId}" does not provide Playwright storage state`);
  }
  if (!state.storageStatePath) {
    throw new Error(`Auth state "${stateId}" has no storageStatePath`);
  }

  return path.resolve(state.storageStatePath);
}

export function readAuthStateManifest(manifestPath: string): AuthStateManifest {
  const resolvedManifestPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedManifestPath)) {
    throw new Error(`Workflow manifest not found: ${resolvedManifestPath}`);
  }

  return JSON.parse(fs.readFileSync(resolvedManifestPath, 'utf-8')) as AuthStateManifest;
}

export function redactAuthStateReceipt(receipt: AuthStateReceipt): AuthStateReceipt {
  return redactReceiptValue(receipt) as AuthStateReceipt;
}

export function buildAuthStateContract(
  receipt: AuthStateReceipt,
  kind: 'auth-state-verify' | 'auth-state-capture'
): AgentContract<typeof kind, AuthStateContractData> {
  const data: AuthStateContractData = redactAuthStateReceipt({
    authState: receipt.authState,
    verified: receipt.verified,
    route: receipt.route,
    finalUrl: receipt.finalUrl,
    reasonCode: receipt.reasonCode,
    reason: receipt.reason,
  }) as AuthStateContractData;

  return createAgentContract({
    kind,
    summary: {
      authState: data.authState,
      verified: data.verified,
      route: data.route ?? null,
    },
    data,
    artifacts: [],
    nextActions: [
      {
        label: 'Render focused context',
        command: `nav-map context <manifest> --auth-state ${shellArg(data.authState)} --format json --contract`,
        reason: 'Load persona-scoped workflow context after auth verification.',
        safety: 'read-only',
      },
      {
        label: 'Probe protected routes',
        command: `nav-map probe <manifest> --base-url <base-url> --auth-state ${shellArg(data.authState)} --contract`,
        reason: 'Collect expected-vs-observed route evidence using this auth state.',
        safety: 'writes-local-files',
      },
    ],
  });
}

export async function verifyAuthState(options: VerifyAuthStateOptions): Promise<AuthStateReceipt> {
  const state = findAuthState(options.manifest, options.stateId);
  if (!state) {
    return redactAuthStateReceipt({
      authState: options.stateId,
      verified: false,
      reasonCode: 'missing-auth-state',
      reason: 'Auth state id was not found in the workflow manifest.',
    });
  }
  if (!state.verify) {
    return redactAuthStateReceipt({
      authState: state.id,
      verified: false,
      reasonCode: 'missing-auth-verify',
      reason: 'No verification route or expectations are configured for this auth state.',
    });
  }

  const storageStateCheck = resolveVerifyStorageState(options.manifest, state);
  if (storageStateCheck.receipt) {
    return redactAuthStateReceipt(storageStateCheck.receipt);
  }

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let finalUrl: string | undefined;

  try {
    context = await browser.newContext(
      storageStateCheck.storageState ? { storageState: storageStateCheck.storageState } : {}
    );
    const page = await context.newPage();
    const verifyUrl = new URL(state.verify.route, options.baseUrl).toString();
    const response = await page.goto(verifyUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    finalUrl = page.url();

    const statusOk =
      state.verify.expectStatus === undefined || response?.status() === state.verify.expectStatus;
    const finalUrlOk =
      !state.verify.expectFinalUrl || finalUrlMatches(finalUrl, state.verify.expectFinalUrl);
    const expectedRedirectOk =
      !state.verify.expectRedirect || finalUrlMatches(finalUrl, state.verify.expectRedirect);
    const textOk =
      !state.verify.expectText ||
      (await page
        .getByText(state.verify.expectText)
        .first()
        .isVisible()
        .catch(() => false));
    const selectorOk =
      !state.verify.expectSelector ||
      (await page
        .locator(state.verify.expectSelector)
        .first()
        .isVisible()
        .catch(() => false));
    const jsonOk =
      !state.verify.expectJson ||
      (await responseJsonMatches(response, state.verify.expectJson).catch(() => false));
    const verified = Boolean(
      statusOk && finalUrlOk && expectedRedirectOk && textOk && selectorOk && jsonOk
    );
    const reasonCode = authStateReasonCode({
      verified,
      route: state.verify.route,
      finalUrl,
      expectRedirect: state.verify.expectRedirect,
    });

    return redactAuthStateReceipt({
      authState: state.id,
      verified,
      route: state.verify.route,
      finalUrl,
      storageStatePath: storageStateCheck.storageState,
      reasonCode,
      reason: verified
        ? reasonForVerifiedAuthState(reasonCode)
        : verificationFailureReason({
            statusOk,
            finalUrlOk,
            expectedRedirectOk,
            textOk,
            selectorOk,
            jsonOk,
          }),
    });
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close();
  }
}

export async function captureAuthState(
  options: CaptureAuthStateOptions
): Promise<AuthStateReceipt> {
  const state = findAuthState(options.manifest, options.stateId);
  if (!state) {
    throw new Error(`Unknown auth state: ${options.stateId}`);
  }
  if (!state.capture) {
    throw new Error(`Auth state "${options.stateId}" has no capture configuration`);
  }

  const outputPath = path.resolve(options.outputPath);
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: !options.headed });
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let finalUrl: string | undefined;

  try {
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(new URL(state.capture.startRoute, options.baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForURL(url => url.pathname === state.capture?.successRoute, {
      timeout: 180_000,
    });
    if (state.capture.successSelector) {
      await page.locator(state.capture.successSelector).first().waitFor({ timeout: 30_000 });
    }
    if (state.capture.successText) {
      await page.getByText(state.capture.successText).first().waitFor({ timeout: 30_000 });
    }

    finalUrl = page.url();
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await context.storageState({ path: outputPath });

    return redactAuthStateReceipt({
      authState: state.id,
      verified: true,
      route: state.capture.successRoute,
      finalUrl,
      storageStatePath: outputPath,
    });
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close();
  }
}

async function loadPlaywright(): Promise<PlaywrightModule> {
  return import('playwright');
}

async function responseJsonMatches(
  response: Response | null,
  expected: Record<string, unknown>
): Promise<boolean> {
  if (!response) {
    return false;
  }
  const actual = (await response.json()) as unknown;
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    return false;
  }

  return Object.entries(expected).every(
    ([key, value]) => (actual as Record<string, unknown>)[key] === value
  );
}

function verificationFailureReason(results: {
  statusOk: boolean;
  finalUrlOk: boolean;
  expectedRedirectOk: boolean;
  textOk: boolean;
  selectorOk: boolean;
  jsonOk: boolean;
}): string {
  const failed = Object.entries(results)
    .filter(([, ok]) => !ok)
    .map(([name]) => name.replace(/Ok$/, ''));
  return `Verification expectation failed: ${failed.join(', ')}`;
}

function resolveVerifyStorageState(
  manifest: AuthStateManifest,
  state: WorkflowAuthState
): { storageState?: string; receipt?: AuthStateReceipt } {
  if (state.kind !== 'storage-state') {
    return {};
  }
  if (!state.storageStatePath) {
    return {
      receipt: {
        authState: state.id,
        verified: false,
        reasonCode: 'missing-storage-state-path',
        reason: 'Auth state is storage-state, but no storageStatePath is configured.',
      },
    };
  }

  const storageState = resolveAuthStateStoragePath(manifest, state.id);
  if (!fs.existsSync(storageState)) {
    return {
      receipt: {
        authState: state.id,
        verified: false,
        reasonCode: 'missing-storage-state-file',
        reason: 'Configured storage-state file is missing; recapture or choose another auth state.',
      },
    };
  }

  return { storageState };
}

function authStateReasonCode(options: {
  verified: boolean;
  route: string;
  finalUrl?: string;
  expectRedirect?: string;
}): AuthStateReasonCode | undefined {
  if (options.verified) {
    return options.expectRedirect ? 'expected-redirect' : 'verified';
  }
  if (options.expectRedirect || isUnexpectedRedirect(options.finalUrl, options.route)) {
    return 'unexpected-redirect';
  }
  return 'verification-failed';
}

function reasonForVerifiedAuthState(
  reasonCode: AuthStateReasonCode | undefined
): string | undefined {
  return reasonCode === 'expected-redirect'
    ? 'Observed the configured expected redirect.'
    : undefined;
}

function isUnexpectedRedirect(finalUrl: string | undefined, route: string): boolean {
  return Boolean(finalUrl && !finalUrlMatches(finalUrl, route));
}

function finalUrlMatches(actual: string | undefined, expected: string): boolean {
  if (!actual) {
    return false;
  }
  const actualCandidates = urlMatchCandidates(actual);
  const expectedCandidates = urlMatchCandidates(expected);

  for (const actualCandidate of actualCandidates) {
    for (const expectedCandidate of expectedCandidates) {
      if (actualCandidate === expectedCandidate || actualCandidate.endsWith(expectedCandidate)) {
        return true;
      }
    }
  }

  return false;
}

function urlMatchCandidates(value: string): Set<string> {
  const candidates = new Set<string>([value]);
  addDecodedCandidate(candidates, value);

  try {
    const url = new URL(value);
    const pathValue = `${url.pathname}${url.search}${url.hash}`;
    candidates.add(pathValue);
    addDecodedCandidate(candidates, pathValue);
  } catch {
    // Relative URLs are already represented by the original value.
  }

  return candidates;
}

function addDecodedCandidate(candidates: Set<string>, value: string): void {
  try {
    candidates.add(decodeURIComponent(value));
  } catch {
    // Keep the original candidate when decoding fails.
  }
}

function shellArg(value: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function redactReceiptValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return SENSITIVE_VALUE_PATTERN.test(value) ? '[redacted]' : value;
  }
  if (Array.isArray(value)) {
    return value.map(item => redactReceiptValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'unsafeDebug' && !isSensitiveKey(key))
        .map(([key, nestedValue]) => [key, redactReceiptValue(nestedValue)])
    );
  }
  return value;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return SENSITIVE_KEY_PATTERN.test(`_${normalized}_`);
}
