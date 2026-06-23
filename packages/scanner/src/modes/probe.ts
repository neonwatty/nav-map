import fs from 'node:fs';
import path from 'node:path';
import { routeToId } from '@neonwatty/nav-map/workflow';
import { chromium } from 'playwright';
import {
  createAgentContract,
  type AgentContract,
  type AgentContractNextAction,
} from './agent-contract.js';
import {
  findAuthState,
  type AuthStateManifest,
  type AuthStateReasonCode,
  type WorkflowAuthState,
} from './auth-state.js';

export interface ProbeNodeExpectations {
  selectors?: string[];
  text?: string[];
  signedOutRedirect?: string;
  finalUrl?: string;
  status?: number;
}

export interface ProbeManifestNode {
  id?: string;
  route: string;
  label: string;
  expectations?: ProbeNodeExpectations;
}

export interface ProbeManifestFlow {
  name: string;
  steps: string[];
}

export interface ProbeManifest extends AuthStateManifest {
  version?: 'workflow-atlas/1.0';
  name: string;
  routeVariables?: Record<string, string>;
  nodes: ProbeManifestNode[];
  flows?: ProbeManifestFlow[];
}

export type ProbeStatus = 'pass' | 'warn' | 'fail' | 'unchecked';

export interface ProbeNodeObserved {
  status?: number;
  finalUrl: string;
  matchedText: string[];
  matchedSelectors: string[];
  consoleErrors: string[];
  failedRequests: string[];
}

export interface ProbeNodeResult {
  nodeId: string;
  route: string;
  concreteRoute: string;
  finalUrl: string;
  status: ProbeStatus;
  reason?: string;
  screenshot?: string;
  expected?: ProbeNodeExpectations;
  observed?: ProbeNodeObserved;
  checks?: ProbeCheckResult[];
  consoleErrors: string[];
  failedRequests: string[];
}

export interface ProbeCheckResult {
  name: string;
  status: ProbeStatus | 'skip';
  expected?: unknown;
  observed?: unknown;
  reason?: string;
}

export interface ProbeRun {
  app: string;
  command?: string;
  authState?: string;
  authStateKind?: WorkflowAuthState['kind'];
  authStateStatus?: ProbeAuthStateStatus;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  selection?: {
    flow?: string;
    nodeIds: string[];
    routeVariableKeys: string[];
  };
  screenshotSummary?: {
    screenshotDir: string;
    captured: number;
    capturedNodeIds: string[];
  };
  warnings?: string[];
  nextActions?: AgentContractNextAction[];
  results: ProbeNodeResult[];
}

export interface ProbeAuthStateStatus {
  authState: string;
  kind?: WorkflowAuthState['kind'];
  reasonCode?: AuthStateReasonCode;
  reason?: string;
}

export function resolveRouteTemplate(route: string, variables: Record<string, string>): string {
  return route.replace(/\[([^\]]+)\]/g, (_match, key: string) => {
    const value = variables[key];
    if (!value) {
      throw new Error(`Missing route variable: ${key}`);
    }
    return value;
  });
}

export function evaluateProbeNode(options: {
  nodeId: string;
  authStateKind?: WorkflowAuthState['kind'];
  expected?: ProbeNodeExpectations;
  observed: ProbeNodeObserved;
}): { status: ProbeStatus; reason?: string } {
  const expected = options.expected;
  if (!expected || !hasProbeExpectations(expected)) {
    return { status: 'unchecked' };
  }

  if (expected.signedOutRedirect) {
    if (expectsSignedOutRedirect(options.authStateKind)) {
      if (!finalUrlMatches(options.observed.finalUrl, expected.signedOutRedirect)) {
        return {
          status: 'fail',
          reason: `Expected signed-out redirect ending ${expected.signedOutRedirect}, observed ${options.observed.finalUrl}`,
        };
      }

      return evaluateProbeHealth(options.observed);
    }
  }

  if (expected.status !== undefined && options.observed.status !== expected.status) {
    return {
      status: 'fail',
      reason: `Expected status ${expected.status}, observed ${options.observed.status ?? 'none'}`,
    };
  }

  if (expected.finalUrl && !finalUrlMatches(options.observed.finalUrl, expected.finalUrl)) {
    return {
      status: 'fail',
      reason: `Expected final URL ending ${expected.finalUrl}, observed ${options.observed.finalUrl}`,
    };
  }

  for (const text of expected.text ?? []) {
    if (!options.observed.matchedText.includes(text)) {
      return { status: 'fail', reason: `Missing expected text: ${text}` };
    }
  }

  for (const selector of expected.selectors ?? []) {
    if (!options.observed.matchedSelectors.includes(selector)) {
      return { status: 'fail', reason: `Missing expected selector: ${selector}` };
    }
  }

  return evaluateProbeHealth(options.observed);
}

export async function runProbe(options: {
  manifest: ProbeManifest;
  baseUrl: string;
  authState?: string;
  flow?: string;
  nodes?: string[];
  manifestPath?: string;
  outputPath: string;
  screenshotsDir: string;
  contract?: boolean;
}): Promise<ProbeRun> {
  const startedAt = new Date().toISOString();
  const selectedNodes = selectProbeNodes(options.manifest, options);
  const authState = resolveProbeAuthState(options.manifest, options.authState);
  const selectedNodeIds = selectedNodes.map(node => node.id ?? routeToId(node.route));
  if (authState.blocker) {
    const results = buildAuthStateBlockedProbeResults(
      selectedNodes,
      options.manifest,
      authState.blocker
    );
    const run: ProbeRun = sanitizeProbeValue({
      app: options.manifest.name,
      command: buildProbeCommand(options),
      authState: options.authState,
      authStateKind: authState.kind,
      authStateStatus: authState.blocker,
      baseUrl: options.baseUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      selection: buildProbeSelection(options, selectedNodeIds, options.manifest),
      screenshotSummary: {
        screenshotDir: options.screenshotsDir,
        captured: 0,
        capturedNodeIds: [],
      },
      warnings: buildProbeWarnings(results),
      nextActions: buildProbeNextActions({
        manifestPath: options.manifestPath,
        baseUrl: options.baseUrl,
        authState: options.authState,
        outputPath: options.outputPath,
      }),
      results,
    }) as ProbeRun;

    writeProbeRun(run, options);
    return run;
  }
  const browser = await chromium.launch({ headless: true });
  const results: ProbeNodeResult[] = [];

  try {
    const context = await browser.newContext(
      authState.storageState ? { storageState: authState.storageState } : {}
    );
    try {
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on('console', message => {
        if (message.type() === 'error') {
          consoleErrors.push(sanitizeProbeString(message.text()));
        }
      });
      page.on('requestfailed', request => {
        failedRequests.push(
          sanitizeProbeString(
            `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim()
          )
        );
      });

      fs.mkdirSync(options.screenshotsDir, { recursive: true });
      for (const node of selectedNodes) {
        consoleErrors.length = 0;
        failedRequests.length = 0;
        const nodeId = node.id ?? routeToId(node.route);
        const concreteRoute = resolveRouteTemplate(
          node.route,
          options.manifest.routeVariables ?? {}
        );
        const targetUrl = new URL(concreteRoute, options.baseUrl).toString();
        const response = await page
          .goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          })
          .catch((error: unknown) => {
            const reason = sanitizeProbeString(
              `Navigation failed: ${error instanceof Error ? error.message : String(error)}`
            );
            const observed: ProbeNodeObserved = {
              finalUrl: sanitizeProbeString(page.url()),
              matchedText: [],
              matchedSelectors: [],
              consoleErrors: [...consoleErrors],
              failedRequests: [...failedRequests, reason],
            };
            results.push({
              nodeId,
              route: sanitizeProbeString(node.route),
              concreteRoute: sanitizeProbeString(concreteRoute),
              finalUrl: observed.finalUrl,
              status: 'fail',
              reason,
              expected: node.expectations
                ? (sanitizeProbeValue(node.expectations) as ProbeNodeExpectations)
                : undefined,
              observed,
              checks: [
                {
                  name: 'navigation',
                  status: 'fail',
                  expected: sanitizeProbeString(targetUrl),
                  observed: observed.finalUrl,
                  reason,
                },
              ],
              consoleErrors: observed.consoleErrors,
              failedRequests: observed.failedRequests,
            });
            return null;
          });
        if (!response) continue;
        await waitForProbeExpectations(page, node.expectations, authState.kind);
        const matchedText = await collectMatchedText(page, node.expectations?.text ?? []);
        const matchedSelectors = await collectMatchedSelectors(
          page,
          node.expectations?.selectors ?? []
        );
        const screenshot = path.join(options.screenshotsDir, `${nodeId}.png`);
        await page.screenshot({ path: screenshot, fullPage: false });

        const observed: ProbeNodeObserved = {
          status: response?.status(),
          finalUrl: sanitizeProbeString(page.url()),
          matchedText,
          matchedSelectors,
          consoleErrors: [...consoleErrors],
          failedRequests: [...failedRequests],
        };
        const evaluation = evaluateProbeNode({
          nodeId,
          authStateKind: authState.kind,
          expected: node.expectations,
          observed,
        });

        results.push({
          nodeId,
          route: sanitizeProbeString(node.route),
          concreteRoute: sanitizeProbeString(concreteRoute),
          finalUrl: observed.finalUrl,
          status: evaluation.status,
          reason: evaluation.reason ? sanitizeProbeString(evaluation.reason) : undefined,
          screenshot,
          expected: node.expectations
            ? (sanitizeProbeValue(node.expectations) as ProbeNodeExpectations)
            : undefined,
          observed,
          checks: buildProbeChecks(node.expectations, observed, authState.kind),
          consoleErrors: observed.consoleErrors,
          failedRequests: observed.failedRequests,
        });
      }
    } finally {
      await Promise.resolve(context.close()).catch(() => undefined);
    }
  } finally {
    await browser.close();
  }

  const run: ProbeRun = sanitizeProbeValue({
    app: options.manifest.name,
    command: buildProbeCommand(options),
    authState: options.authState,
    authStateKind: authState.kind,
    baseUrl: options.baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    selection: {
      flow: options.flow,
      nodeIds: selectedNodeIds,
      routeVariableKeys: Object.keys(options.manifest.routeVariables ?? {}),
    },
    screenshotSummary: {
      screenshotDir: options.screenshotsDir,
      captured: results.filter(result => result.screenshot).length,
      capturedNodeIds: results.filter(result => result.screenshot).map(result => result.nodeId),
    },
    warnings: buildProbeWarnings(results),
    nextActions: buildProbeNextActions({
      manifestPath: options.manifestPath,
      baseUrl: options.baseUrl,
      authState: options.authState,
      outputPath: options.outputPath,
    }),
    results,
  }) as ProbeRun;

  writeProbeRun(run, options);
  return run;
}

function writeProbeRun(run: ProbeRun, options: { outputPath: string; contract?: boolean }): void {
  fs.mkdirSync(path.dirname(path.resolve(options.outputPath)), { recursive: true });
  fs.writeFileSync(
    options.outputPath,
    JSON.stringify(options.contract ? buildProbeRunContract(run, options.outputPath) : run, null, 2)
  );
}

export function buildProbeRunContract(
  run: ProbeRun,
  outputPath?: string
): AgentContract<'probe-run', ProbeRun> {
  const counts = countProbeStatuses(run.results);
  return createAgentContract({
    kind: 'probe-run',
    generatedAt: run.finishedAt,
    summary: {
      app: run.app,
      authState: run.authState ?? null,
      authStateKind: run.authStateKind ?? null,
      baseUrl: run.baseUrl,
      total: run.results.length,
      ...counts,
    },
    data: run,
    artifacts: [
      ...(outputPath
        ? [{ kind: 'probe-receipt', path: outputPath, description: 'Probe run JSON receipt' }]
        : []),
      ...run.results
        .filter(result => result.screenshot)
        .map(result => ({
          kind: 'screenshot',
          path: result.screenshot,
          description: `Screenshot for ${result.nodeId}`,
        })),
    ],
    nextActions:
      run.nextActions ??
      buildProbeNextActions({
        baseUrl: run.baseUrl,
        authState: run.authState,
        outputPath,
      }),
  });
}

type ProbePage =
  Awaited<
    ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>
  > extends infer Context
    ? Context extends { newPage: () => Promise<infer Page> }
      ? Page
      : never
    : never;

function selectProbeNodes(
  manifest: ProbeManifest,
  options: { flow?: string; nodes?: string[] }
): ProbeManifestNode[] {
  const nodeIdMap = new Map(manifest.nodes.map(node => [node.id ?? routeToId(node.route), node]));
  const selectedIds = explicitProbeNodeIds(manifest, options);

  return selectedIds.map(id => {
    const node = nodeIdMap.get(id);
    if (!node) {
      throw new Error(`Unknown probe node: ${id}`);
    }
    return node;
  });
}

function explicitProbeNodeIds(
  manifest: ProbeManifest,
  options: { flow?: string; nodes?: string[] }
): string[] {
  if (options.nodes?.length) {
    return options.nodes;
  }

  if (options.flow) {
    const flow = manifest.flows?.find(item => item.name === options.flow);
    if (!flow) {
      throw new Error(`Unknown workflow flow: ${options.flow}`);
    }
    return flow.steps;
  }

  return manifest.nodes.map(node => node.id ?? routeToId(node.route));
}

interface ResolvedProbeAuthState {
  kind?: WorkflowAuthState['kind'];
  storageState?: string;
  blocker?: ProbeAuthStateStatus;
}

function resolveProbeAuthState(
  manifest: ProbeManifest,
  authStateId?: string
): ResolvedProbeAuthState {
  if (!authStateId) {
    return { kind: 'anonymous' };
  }

  const state = findAuthState(manifest, authStateId);
  if (!state) {
    return {
      blocker: {
        authState: authStateId,
        reasonCode: 'missing-auth-state',
        reason: 'Auth state id was not found in the workflow manifest.',
      },
    };
  }
  if (state.kind !== 'storage-state') {
    return { kind: state.kind };
  }
  if (!state.storageStatePath) {
    return {
      kind: state.kind,
      blocker: {
        authState: authStateId,
        kind: state.kind,
        reasonCode: 'missing-storage-state-path',
        reason: 'Auth state is storage-state, but no storageStatePath is configured.',
      },
    };
  }

  const storageState = path.resolve(state.storageStatePath);
  if (!fs.existsSync(storageState)) {
    return {
      kind: state.kind,
      blocker: {
        authState: authStateId,
        kind: state.kind,
        reasonCode: 'missing-storage-state-file',
        reason: 'Configured storage-state file is missing; recapture or choose another auth state.',
      },
    };
  }

  return { kind: state.kind, storageState };
}

function buildProbeSelection(
  options: { flow?: string },
  selectedNodeIds: string[],
  manifest: ProbeManifest
): ProbeRun['selection'] {
  return {
    flow: options.flow,
    nodeIds: selectedNodeIds,
    routeVariableKeys: Object.keys(manifest.routeVariables ?? {}),
  };
}

function buildAuthStateBlockedProbeResults(
  selectedNodes: ProbeManifestNode[],
  manifest: ProbeManifest,
  blocker: ProbeAuthStateStatus
): ProbeNodeResult[] {
  return selectedNodes.map(node => {
    const nodeId = node.id ?? routeToId(node.route);
    const concreteRoute = resolveRouteTemplate(node.route, manifest.routeVariables ?? {});
    return {
      nodeId,
      route: sanitizeProbeString(node.route),
      concreteRoute: sanitizeProbeString(concreteRoute),
      finalUrl: '',
      status: 'fail',
      reason: `Auth state blocker: ${blocker.reason}`,
      expected: node.expectations
        ? (sanitizeProbeValue(node.expectations) as ProbeNodeExpectations)
        : undefined,
      observed: {
        finalUrl: '',
        matchedText: [],
        matchedSelectors: [],
        consoleErrors: [],
        failedRequests: [],
      },
      checks: [
        {
          name: 'authState',
          status: 'fail',
          expected: blocker.authState,
          reason: blocker.reason,
        },
      ],
      consoleErrors: [],
      failedRequests: [],
    };
  });
}

async function collectMatchedText(
  page: ProbePage,
  expectedText: readonly string[]
): Promise<string[]> {
  if (expectedText.length === 0) {
    return [];
  }

  const bodyText = await page
    .locator('body')
    .innerText({ timeout: 1_000 })
    .catch(() => '');
  const normalizedBodyText = normalizeProbeText(bodyText);

  return expectedText.filter(text => normalizedBodyText.includes(normalizeProbeText(text)));
}

async function collectMatchedSelectors(
  page: ProbePage,
  expectedSelectors: readonly string[]
): Promise<string[]> {
  const matched: string[] = [];
  for (const selector of expectedSelectors) {
    if (
      await page
        .locator(selector)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      matched.push(selector);
    }
  }
  return matched;
}

function finalUrlMatches(actual: string, expected: string): boolean {
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

function hasProbeExpectations(expected: ProbeNodeExpectations): boolean {
  return Boolean(
    expected.status !== undefined ||
    expected.finalUrl ||
    expected.signedOutRedirect ||
    expected.text?.length ||
    expected.selectors?.length
  );
}

function expectsSignedOutRedirect(authStateKind?: WorkflowAuthState['kind']): boolean {
  return authStateKind === undefined || authStateKind === 'anonymous';
}

function evaluateProbeHealth(observed: ProbeNodeObserved): {
  status: ProbeStatus;
  reason?: string;
} {
  if (observed.consoleErrors.length > 0) {
    return { status: 'warn', reason: 'Console errors observed' };
  }

  if (observed.failedRequests.length > 0) {
    return { status: 'warn', reason: 'Failed network requests observed' };
  }

  return { status: 'pass' };
}

function buildProbeChecks(
  expected: ProbeNodeExpectations | undefined,
  observed: ProbeNodeObserved,
  authStateKind?: WorkflowAuthState['kind']
): ProbeCheckResult[] {
  if (!expected || !hasProbeExpectations(expected)) {
    return [{ name: 'expectations', status: 'unchecked', reason: 'No expectations declared' }];
  }

  const checks: ProbeCheckResult[] = [];
  const signedOutRedirectApplies = Boolean(
    expected.signedOutRedirect && expectsSignedOutRedirect(authStateKind)
  );

  if (expected.signedOutRedirect) {
    checks.push({
      name: 'signedOutRedirect',
      status: signedOutRedirectApplies
        ? finalUrlMatches(observed.finalUrl, expected.signedOutRedirect)
          ? 'pass'
          : 'fail'
        : 'skip',
      expected: expected.signedOutRedirect,
      observed: observed.finalUrl,
      reason: signedOutRedirectApplies
        ? undefined
        : 'Signed-out redirect expectation only applies to anonymous probes',
    });
  }

  if (signedOutRedirectApplies) {
    checks.push(...healthChecks(observed));
    return checks;
  }

  if (expected.status !== undefined) {
    checks.push({
      name: 'status',
      status: observed.status === expected.status ? 'pass' : 'fail',
      expected: expected.status,
      observed: observed.status,
    });
  }
  if (expected.finalUrl) {
    checks.push({
      name: 'finalUrl',
      status: finalUrlMatches(observed.finalUrl, expected.finalUrl) ? 'pass' : 'fail',
      expected: expected.finalUrl,
      observed: observed.finalUrl,
    });
  }
  for (const text of expected.text ?? []) {
    checks.push({
      name: 'text',
      status: observed.matchedText.includes(text) ? 'pass' : 'fail',
      expected: text,
      observed: observed.matchedText,
    });
  }
  for (const selector of expected.selectors ?? []) {
    checks.push({
      name: 'selector',
      status: observed.matchedSelectors.includes(selector) ? 'pass' : 'fail',
      expected: selector,
      observed: observed.matchedSelectors,
    });
  }

  checks.push(...healthChecks(observed));
  return checks;
}

function healthChecks(observed: ProbeNodeObserved): ProbeCheckResult[] {
  return [
    {
      name: 'consoleErrors',
      status: observed.consoleErrors.length > 0 ? 'warn' : 'pass',
      observed: observed.consoleErrors.length,
    },
    {
      name: 'failedRequests',
      status: observed.failedRequests.length > 0 ? 'warn' : 'pass',
      observed: observed.failedRequests.length,
    },
  ];
}

function countProbeStatuses(results: ProbeNodeResult[]): Record<ProbeStatus, number> {
  return {
    pass: results.filter(result => result.status === 'pass').length,
    warn: results.filter(result => result.status === 'warn').length,
    fail: results.filter(result => result.status === 'fail').length,
    unchecked: results.filter(result => result.status === 'unchecked').length,
  };
}

function buildProbeCommand(options: {
  manifestPath?: string;
  baseUrl: string;
  authState?: string;
  flow?: string;
  nodes?: string[];
  outputPath: string;
  screenshotsDir: string;
  contract?: boolean;
}): string {
  return [
    'nav-map probe',
    shellArg(options.manifestPath ?? '<manifest>'),
    `--base-url ${shellArg(options.baseUrl)}`,
    options.authState ? `--auth-state ${shellArg(options.authState)}` : '',
    options.flow ? `--flow ${shellArg(options.flow)}` : '',
    options.nodes?.length ? `--nodes ${shellArg(options.nodes.join(','))}` : '',
    `--out ${shellArg(options.outputPath)}`,
    `--screenshots-dir ${shellArg(options.screenshotsDir)}`,
    options.contract ? '--contract' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildProbeWarnings(results: ProbeNodeResult[]): string[] {
  const warnings: string[] = [];
  const failed = results.filter(result => result.status === 'fail').length;
  const warned = results.filter(result => result.status === 'warn').length;
  const unchecked = results.filter(result => result.status === 'unchecked').length;
  if (failed > 0) warnings.push(`${failed} route probe(s) failed expectations.`);
  if (warned > 0) warnings.push(`${warned} route probe(s) passed with warnings.`);
  if (unchecked > 0) warnings.push(`${unchecked} route probe(s) had no expectations.`);
  return warnings;
}

function buildProbeNextActions(options: {
  manifestPath?: string;
  baseUrl: string;
  authState?: string;
  outputPath?: string;
}): AgentContractNextAction[] {
  const manifestArg = options.manifestPath ? shellArg(options.manifestPath) : '<manifest>';
  return [
    {
      label: 'Render probe diff JSON',
      command: `nav-map diff ${manifestArg} --probe ${shellArg(options.outputPath ?? '<probe-run>')} --format json`,
      reason: 'Compare probe observations in a compact agent-readable diff contract.',
      safety: 'writes-local-files',
    },
    {
      label: 'Inspect failing or warning routes',
      command: `nav-map context ${manifestArg}${options.authState ? ` --auth-state ${shellArg(options.authState)}` : ''} --format json --contract`,
      reason: 'Load manifest context before proposing route or expectation updates.',
      safety: 'read-only',
    },
    {
      label: 'Refresh route screenshots after fixes',
      command: `nav-map workflow ${manifestArg} --base-url ${shellArg(options.baseUrl)}${options.authState ? ` --auth-state ${shellArg(options.authState)}` : ''} --screenshot-dir public/screenshots/workflow -o public/nav-map.json`,
      reason: 'Regenerate visual evidence after app or expectation changes are verified.',
      safety: 'writes-local-files',
    },
  ];
}

async function waitForProbeExpectations(
  page: ProbePage,
  expected?: ProbeNodeExpectations,
  authStateKind?: WorkflowAuthState['kind']
): Promise<void> {
  if (!expected || !hasProbeExpectations(expected)) {
    return;
  }

  if (expected.signedOutRedirect && expectsSignedOutRedirect(authStateKind)) {
    return;
  }

  const waits: Promise<unknown>[] = [];
  for (const text of expected.text ?? []) {
    waits.push(
      page
        .getByText(text)
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .catch(() => undefined)
    );
  }

  for (const selector of expected.selectors ?? []) {
    waits.push(
      page
        .locator(selector)
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .catch(() => undefined)
    );
  }

  if (waits.length > 0) {
    await Promise.all(waits);
  }
}

function normalizeProbeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
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
  if (/^<[^>]+>$/.test(value)) {
    return value;
  }
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function sanitizeProbeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeProbeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeProbeValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeProbeValue(nestedValue)])
    );
  }
  return value;
}

function sanitizeProbeString(value: string): string {
  return value
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[redacted]'
    )
    .replace(
      /\b(access_token|refresh_token|id_token|token|api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*([^&\s]+)/gi,
      '$1=[redacted]'
    )
    .replace(
      /"(access_token|refresh_token|id_token|token|api[_-]?key|secret|password|private[_-]?key)"\s*:\s*"[^"]*"/gi,
      '"$1":"[redacted]"'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\bAuthorization:\s*Basic\s+[A-Za-z0-9._~+/=-]+/gi, 'Authorization: Basic [redacted]')
    .replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, '$1[redacted]')
    .replace(/\b(cookie|set-cookie):\s*[^\n\r]+/gi, '$1: [redacted]')
    .replace(/\bwhsec_[A-Za-z0-9_=-]+/gi, 'whsec_[redacted]');
}
