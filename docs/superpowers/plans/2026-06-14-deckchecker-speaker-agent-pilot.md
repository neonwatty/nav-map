# Deckchecker Speaker Agent Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CLI-first agent context, auth-state, probe, and diff capabilities, then validate them against Deckchecker's speaker workflow.

**Architecture:** Extend the workflow manifest as the single reusable contract, then add scanner CLI modes that read manifests and produce safe artifacts: Markdown context, Playwright auth-state verification/capture receipts, probe JSON, and diff Markdown. Keep Deckchecker-specific knowledge in a fixture manifest and generated artifacts, not nav-map core logic.

**Tech Stack:** TypeScript, pnpm monorepo, Commander CLI, Playwright, Vitest, Next.js demo fixture.

---

## File Structure

- Modify: `packages/core/src/workflowManifest.ts`
  - Add manifest types for `authStates`, executable route variables, node expectations, and boundary expectations.
- Modify: `packages/core/src/workflow.ts`
  - Export the new workflow/auth/probe types from the Node-safe subpath.
- Modify: `packages/core/src/workflowManifest.test.ts`
  - Validate auth state and node expectation conversion.
- Create: `packages/scanner/src/modes/context.ts`
  - Convert a workflow manifest or graph into agent-consumable Markdown/JSON.
- Create: `packages/scanner/src/commands/context.ts`
  - Register `nav-map context`.
- Create: `packages/scanner/src/modes/auth-state.ts`
  - Verify and capture Playwright storage state without printing secret contents.
- Create: `packages/scanner/src/commands/auth-state.ts`
  - Register `nav-map auth-state capture` and `nav-map auth-state verify`.
- Create: `packages/scanner/src/modes/probe.ts`
  - Visit manifest nodes with Playwright, resolve route variables, capture screenshots, and write probe receipts.
- Create: `packages/scanner/src/commands/probe.ts`
  - Register `nav-map probe`.
- Create: `packages/scanner/src/modes/diff.ts`
  - Compare manifest expectations to probe receipts.
- Create: `packages/scanner/src/commands/diff.ts`
  - Register `nav-map diff`.
- Modify: `packages/scanner/src/program.ts`
  - Register the new commands.
- Modify: `packages/scanner/src/__tests__/commands.test.ts`
  - Assert command registration and options.
- Create: `packages/scanner/src/__tests__/context.test.ts`
  - Test Markdown/JSON context grounding.
- Create: `packages/scanner/src/__tests__/auth-state.test.ts`
  - Test storage-state path validation and redacted verification receipts.
- Create: `packages/scanner/src/__tests__/probe.test.ts`
  - Test probe result construction with mocked Playwright primitives.
- Create: `packages/scanner/src/__tests__/diff.test.ts`
  - Test pass/warn/fail diff logic.
- Create: `packages/demo/public/deckchecker-speaker.workflow.json`
  - Deckchecker speaker fixture manifest.
- Create: `packages/demo/public/deckchecker-speaker.nav-map.json`
  - Generated graph fixture from the manifest.
- Modify: `packages/demo/app/page.tsx`
  - Add Deckchecker speaker to the dataset selector.
- Modify: `README.md`
  - Document the agent CLI workflow.

## Task 1: Extend Workflow Manifest Contract

**Files:**
- Modify: `packages/core/src/workflowManifest.ts`
- Modify: `packages/core/src/workflow.ts`
- Modify: `packages/core/src/workflowManifest.test.ts`

- [ ] **Step 1: Add failing tests for auth states and route variables**

Append this test block to `packages/core/src/workflowManifest.test.ts`:

```ts
describe('workflow manifest agent extensions', () => {
  it('preserves auth states, route variables, and expectations in graph workflow metadata', () => {
    const manifest: WorkflowManifest = {
      version: 'workflow-atlas/1.0',
      name: 'Deckchecker Speaker',
      baseUrl: 'http://localhost:3000',
      authStates: [
        { id: 'signed-out', label: 'Signed out', kind: 'anonymous' },
        {
          id: 'speaker',
          label: 'Speaker',
          kind: 'storage-state',
          storageStatePath: '.nav-map/auth/deckchecker-speaker.storage.json',
          verify: {
            route: '/my/events',
            expectStatus: 200,
            expectText: 'My Events',
          },
        },
      ],
      routeVariables: {
        eventId: 'e1000000-0000-4000-8000-000000000001',
      },
      nodes: [
        {
          id: 'speaker-events',
          route: '/my/events',
          label: 'My Events',
          section: 'speaker',
          purpose: 'Speaker event list.',
          personas: ['speaker'],
          authRequirement: 'speaker',
          expectations: {
            signedOutRedirect: '/sign-in?next=/my/events',
            selectors: ['main'],
            text: ['My Events'],
          },
        },
      ],
    };

    const graph = workflowManifestToGraph(manifest, {
      generatedAt: '2026-06-14T00:00:00.000Z',
    });

    expect(graph.meta.workflow?.authStates).toEqual(manifest.authStates);
    expect(graph.meta.workflow?.routeVariables).toEqual(manifest.routeVariables);
    expect(graph.nodes[0].metadata?.expectations).toEqual({
      signedOutRedirect: '/sign-in?next=/my/events',
      selectors: ['main'],
      text: ['My Events'],
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- workflowManifest
```

Expected: fail with TypeScript errors for missing `authStates`, `routeVariables`, and `expectations` types.

- [ ] **Step 3: Add manifest extension types**

Add these interfaces to `packages/core/src/workflowManifest.ts`:

```ts
export type WorkflowAuthStateKind = 'anonymous' | 'storage-state' | 'setup-command';

export interface WorkflowAuthStateVerify {
  route: string;
  expectStatus?: number;
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
  kind: WorkflowAuthStateKind;
  storageStatePath?: string;
  setupCommand?: string;
  capture?: WorkflowAuthStateCapture;
  verify?: WorkflowAuthStateVerify;
}

export interface WorkflowNodeExpectations {
  selectors?: string[];
  text?: string[];
  signedOutRedirect?: string;
  finalUrl?: string;
  status?: number;
}

export type WorkflowRouteVariables = Record<string, string>;
```

Update `WorkflowManifest`:

```ts
authStates?: WorkflowAuthState[];
routeVariables?: WorkflowRouteVariables;
```

Update `WorkflowManifestNode`:

```ts
expectations?: WorkflowNodeExpectations;
sourceHints?: string[];
```

- [ ] **Step 4: Preserve extensions in graph metadata**

Inside `workflowManifestToGraph`, add `expectations` and `sourceHints` to each node metadata object:

```ts
...(node.expectations ? { expectations: node.expectations } : {}),
...(node.sourceHints ? { sourceHints: node.sourceHints } : {}),
```

Add workflow-level metadata:

```ts
...(manifest.authStates ? { authStates: manifest.authStates } : {}),
...(manifest.routeVariables ? { routeVariables: manifest.routeVariables } : {}),
```

- [ ] **Step 5: Export extension types**

Add these exports to `packages/core/src/workflow.ts`:

```ts
export type {
  WorkflowAuthState,
  WorkflowAuthStateCapture,
  WorkflowAuthStateKind,
  WorkflowAuthStateVerify,
  WorkflowNodeExpectations,
  WorkflowRouteVariables,
} from './workflowManifest';
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map test -- workflowManifest
```

Expected: pass.

## Task 2: Add Context Export CLI

**Files:**
- Create: `packages/scanner/src/modes/context.ts`
- Create: `packages/scanner/src/commands/context.ts`
- Modify: `packages/scanner/src/program.ts`
- Modify: `packages/scanner/src/__tests__/commands.test.ts`
- Create: `packages/scanner/src/__tests__/context.test.ts`

- [ ] **Step 1: Add failing context tests**

Create `packages/scanner/src/__tests__/context.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderWorkflowContext } from '../modes/context.js';

const manifest = {
  version: 'workflow-atlas/1.0',
  name: 'Deckchecker Speaker',
  authStates: [{ id: 'speaker', label: 'Speaker', kind: 'storage-state' }],
  nodes: [
    {
      id: 'speaker-events',
      route: '/my/events',
      label: 'My Events',
      section: 'speaker',
      purpose: 'Speaker event list.',
      personas: ['speaker'],
      authRequirement: 'speaker',
      expectedRedirects: [{ when: 'signed-out', to: '/sign-in?next=/my/events' }],
      expectations: { text: ['My Events'] },
      sourceHints: ['web/src/app/(speaker)/my/events/page.tsx'],
    },
  ],
  edges: [],
  flows: [{ name: 'Speaker sign-in and event list', steps: ['speaker-events'] }],
} as const;

describe('renderWorkflowContext', () => {
  it('renders focused Markdown without leaking storage state contents', () => {
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
    expect(output).toContain('web/src/app/(speaker)/my/events/page.tsx');
    expect(output).not.toMatch(/cookie|localStorage|access_token|refresh_token/i);
    expect(output.split('\\n').length).toBeLessThanOrEqual(250);
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
    expect(parsed.routes).toHaveLength(1);
    expect(parsed.flows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run failing context tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- context
```

Expected: fail because `../modes/context.js` does not exist.

- [ ] **Step 3: Implement context renderer**

Create `packages/scanner/src/modes/context.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { WorkflowManifest } from '@neonwatty/nav-map/workflow';

export type ContextFormat = 'markdown' | 'json';

export interface ContextOptions {
  format: ContextFormat;
  focus: string[];
  authState?: string;
  lineBudget: number;
}

export function loadWorkflowManifest(filePath: string): WorkflowManifest {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8')) as WorkflowManifest;
}

export function renderWorkflowContext(
  manifest: WorkflowManifest,
  options: ContextOptions
): string {
  const focusedNodes = manifest.nodes.filter(node => {
    if (options.focus.length === 0) return true;
    return options.focus.includes(node.section ?? '') || options.focus.includes(node.id ?? '');
  });
  const focusedIds = new Set(focusedNodes.map(node => node.id ?? node.route));
  const focusedFlows = (manifest.flows ?? []).filter(flow =>
    flow.steps.some(step => focusedIds.has(step))
  );
  const payload = {
    name: manifest.name,
    authState: options.authState,
    routes: focusedNodes.map(node => ({
      id: node.id,
      route: node.route,
      label: node.label,
      section: node.section,
      purpose: node.purpose,
      authRequirement: node.authRequirement,
      personas: node.personas ?? [],
      expectedRedirects: node.expectedRedirects ?? [],
      expectations: node.expectations,
      sourceHints: node.sourceHints ?? [],
    })),
    flows: focusedFlows,
  };

  if (options.format === 'json') return JSON.stringify(payload, null, 2);

  const lines = [
    `# ${manifest.name} Agent Context`,
    '',
    options.authState ? `Auth state: \\`${options.authState}\\`` : 'Auth state: not specified',
    '',
    '## Routes',
    ...payload.routes.flatMap(route => [
      '',
      `### ${route.id ?? route.route}`,
      `- Route: \\`${route.route}\\``,
      `- Label: ${route.label}`,
      `- Section: ${route.section ?? 'uncategorized'}`,
      `- Purpose: ${route.purpose ?? 'No purpose recorded'}`,
      `- Auth: ${route.authRequirement ?? 'unspecified'}`,
      `- Personas: ${route.personas.join(', ') || 'none'}`,
      ...(route.expectedRedirects.length
        ? [`- Redirects: ${route.expectedRedirects.map(r => `${r.when ? `${r.when} -> ` : ''}${r.to}`).join('; ')}`]
        : []),
      ...(route.expectations?.text?.length
        ? [`- Expected text: ${route.expectations.text.join('; ')}`]
        : []),
      ...(route.sourceHints.length ? [`- Source hints: ${route.sourceHints.join(', ')}`] : []),
    ]),
    '',
    '## Flows',
    ...payload.flows.map(flow => `- ${flow.name}: ${flow.steps.join(' -> ')}`),
  ];

  return lines.slice(0, options.lineBudget).join('\\n');
}

export function writeContextOutput(output: string, outputPath?: string): void {
  if (!outputPath) {
    process.stdout.write(output);
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, output);
}
```

- [ ] **Step 4: Add context command**

Create `packages/scanner/src/commands/context.ts`:

```ts
import { Command } from 'commander';
import {
  loadWorkflowManifest,
  renderWorkflowContext,
  writeContextOutput,
  type ContextFormat,
} from '../modes/context.js';

export function createContextCommand(): Command {
  return new Command('context')
    .description('Render agent-consumable context from a workflow manifest')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .option('--auth-state <state>', 'Auth state to focus context around')
    .option('--focus <items>', 'Comma-separated node ids or sections', '')
    .option('--format <format>', 'Output format: markdown or json', 'markdown')
    .option('--line-budget <n>', 'Maximum Markdown lines', '250')
    .option('-o, --out <path>', 'Output file path')
    .action((manifestPath, opts) => {
      const format = String(opts.format) as ContextFormat;
      if (format !== 'markdown' && format !== 'json') {
        console.error('Context failed: --format must be markdown or json');
        process.exit(1);
      }
      const manifest = loadWorkflowManifest(manifestPath);
      const output = renderWorkflowContext(manifest, {
        format,
        focus: String(opts.focus)
          .split(',')
          .map((item: string) => item.trim())
          .filter(Boolean),
        authState: opts.authState,
        lineBudget: Number.parseInt(String(opts.lineBudget), 10),
      });
      writeContextOutput(output, opts.out);
      if (opts.out) console.log(`Wrote ${opts.out}`);
    });
}
```

- [ ] **Step 5: Register context command**

Modify `packages/scanner/src/program.ts`:

```ts
import { createContextCommand } from './commands/context.js';
```

Add:

```ts
program.addCommand(createContextCommand());
```

- [ ] **Step 6: Update command tests**

In `packages/scanner/src/__tests__/commands.test.ts`, import `createContextCommand` and add `context` to the expected command list. Add:

```ts
it('registers context command options', () => {
  const command = createContextCommand();

  expect(command.name()).toBe('context');
  expect(command.description()).toBe('Render agent-consumable context from a workflow manifest');
  expect(command.registeredArguments.map(argument => argument.name())).toEqual(['manifest']);
  expect(optionFlags(command)).toEqual([
    '--auth-state <state>',
    '--focus <items>',
    '--format <format>',
    '--line-budget <n>',
    '-o, --out <path>',
  ]);
});
```

- [ ] **Step 7: Run tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- context commands
```

Expected: pass.

## Task 3: Add Auth-State Verify And Capture CLI

**Files:**
- Create: `packages/scanner/src/modes/auth-state.ts`
- Create: `packages/scanner/src/commands/auth-state.ts`
- Modify: `packages/scanner/src/program.ts`
- Modify: `packages/scanner/src/__tests__/commands.test.ts`
- Create: `packages/scanner/src/__tests__/auth-state.test.ts`

- [ ] **Step 1: Add failing auth-state tests**

Create `packages/scanner/src/__tests__/auth-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
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
  ],
  nodes: [{ route: '/', label: 'Home' }],
} as const;

describe('auth-state helpers', () => {
  it('finds auth states by id', () => {
    expect(findAuthState(manifest, 'speaker')?.kind).toBe('storage-state');
    expect(findAuthState(manifest, 'missing')).toBeNull();
  });

  it('resolves storage paths without reading file contents', () => {
    expect(resolveAuthStateStoragePath(manifest, 'speaker')).toContain(
      '.nav-map/auth/deckchecker-speaker.storage.json'
    );
  });

  it('redacts sensitive receipt fields', () => {
    const receipt = redactAuthStateReceipt({
      authState: 'speaker',
      verified: true,
      route: '/my/events',
      storageStatePath: '.nav-map/auth/deckchecker-speaker.storage.json',
      unsafeDebug: 'access_token=secret refresh_token=secret cookie=value',
    });

    expect(JSON.stringify(receipt)).toContain('speaker');
    expect(JSON.stringify(receipt)).not.toMatch(/access_token|refresh_token|cookie=value/i);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- auth-state
```

Expected: fail because `../modes/auth-state.js` does not exist.

- [ ] **Step 3: Implement auth-state helpers and Playwright operations**

Create `packages/scanner/src/modes/auth-state.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import type { WorkflowAuthState, WorkflowManifest } from '@neonwatty/nav-map/workflow';

export interface AuthStateReceipt {
  authState: string;
  verified: boolean;
  route?: string;
  finalUrl?: string;
  storageStatePath?: string;
  reason?: string;
  unsafeDebug?: string;
}

export function findAuthState(
  manifest: Pick<WorkflowManifest, 'authStates'>,
  stateId: string
): WorkflowAuthState | null {
  return manifest.authStates?.find(state => state.id === stateId) ?? null;
}

export function resolveAuthStateStoragePath(
  manifest: Pick<WorkflowManifest, 'authStates'>,
  stateId: string
): string {
  const state = findAuthState(manifest, stateId);
  if (!state) throw new Error(`Unknown auth state: ${stateId}`);
  if (state.kind === 'anonymous') return '';
  if (!state.storageStatePath) throw new Error(`Auth state "${stateId}" has no storageStatePath`);
  return path.resolve(state.storageStatePath);
}

export function redactAuthStateReceipt(receipt: AuthStateReceipt): AuthStateReceipt {
  return {
    authState: receipt.authState,
    verified: receipt.verified,
    route: receipt.route,
    finalUrl: receipt.finalUrl,
    storageStatePath: receipt.storageStatePath,
    reason: receipt.reason,
  };
}

export async function verifyAuthState(options: {
  manifest: WorkflowManifest;
  stateId: string;
  baseUrl: string;
}): Promise<AuthStateReceipt> {
  const state = findAuthState(options.manifest, options.stateId);
  if (!state) throw new Error(`Unknown auth state: ${options.stateId}`);
  if (!state.verify) {
    return redactAuthStateReceipt({ authState: state.id, verified: true, reason: 'No verification configured' });
  }

  const storageState =
    state.kind === 'storage-state' && state.storageStatePath
      ? path.resolve(state.storageStatePath)
      : undefined;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(storageState ? { storageState } : {});
    const page = await context.newPage();
    const url = new URL(state.verify.route, options.baseUrl).toString();
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    const textOk = state.verify.expectText ? await page.getByText(state.verify.expectText).first().isVisible().catch(() => false) : true;
    const selectorOk = state.verify.expectSelector ? await page.locator(state.verify.expectSelector).first().isVisible().catch(() => false) : true;
    const statusOk = state.verify.expectStatus ? response?.status() === state.verify.expectStatus : true;
    await context.close();
    return redactAuthStateReceipt({
      authState: state.id,
      verified: Boolean(textOk && selectorOk && statusOk),
      route: state.verify.route,
      finalUrl: page.url(),
      storageStatePath: state.storageStatePath,
      reason: textOk && selectorOk && statusOk ? undefined : 'Verification expectation failed',
    });
  } finally {
    await browser.close();
  }
}

export async function captureAuthState(options: {
  manifest: WorkflowManifest;
  stateId: string;
  baseUrl: string;
  outputPath: string;
  headed: boolean;
}): Promise<AuthStateReceipt> {
  const state = findAuthState(options.manifest, options.stateId);
  if (!state) throw new Error(`Unknown auth state: ${options.stateId}`);
  if (!state.capture) throw new Error(`Auth state "${options.stateId}" has no capture configuration`);
  const browser = await chromium.launch({ headless: !options.headed });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(new URL(state.capture.startRoute, options.baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForURL(url => url.pathname === state.capture!.successRoute, { timeout: 180_000 });
    if (state.capture.successSelector) {
      await page.locator(state.capture.successSelector).first().waitFor({ timeout: 30_000 });
    }
    if (state.capture.successText) {
      await page.getByText(state.capture.successText).first().waitFor({ timeout: 30_000 });
    }
    fs.mkdirSync(path.dirname(path.resolve(options.outputPath)), { recursive: true });
    await context.storageState({ path: options.outputPath });
    await context.close();
    return redactAuthStateReceipt({
      authState: state.id,
      verified: true,
      route: state.capture.successRoute,
      finalUrl: page.url(),
      storageStatePath: options.outputPath,
    });
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 4: Add auth-state command group**

Create `packages/scanner/src/commands/auth-state.ts`:

```ts
import { Command } from 'commander';
import { loadWorkflowManifest } from '../modes/context.js';
import { captureAuthState, verifyAuthState } from '../modes/auth-state.js';

export function createAuthStateCommand(): Command {
  const command = new Command('auth-state').description('Capture or verify workflow auth states');

  command
    .command('verify')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--state <state>', 'Auth state id')
    .requiredOption('--base-url <url>', 'Base URL to verify against')
    .action(async (manifestPath, opts) => {
      const receipt = await verifyAuthState({
        manifest: loadWorkflowManifest(manifestPath),
        stateId: opts.state,
        baseUrl: opts.baseUrl,
      });
      console.log(JSON.stringify(receipt, null, 2));
      if (!receipt.verified) process.exit(1);
    });

  command
    .command('capture')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--state <state>', 'Auth state id')
    .requiredOption('--base-url <url>', 'Base URL to capture against')
    .requiredOption('--out <path>', 'Storage state output path')
    .option('--headed', 'Run browser headed for manual login')
    .action(async (manifestPath, opts) => {
      const receipt = await captureAuthState({
        manifest: loadWorkflowManifest(manifestPath),
        stateId: opts.state,
        baseUrl: opts.baseUrl,
        outputPath: opts.out,
        headed: Boolean(opts.headed),
      });
      console.log(JSON.stringify(receipt, null, 2));
    });

  return command;
}
```

- [ ] **Step 5: Register auth-state command and update command tests**

Modify `packages/scanner/src/program.ts`:

```ts
import { createAuthStateCommand } from './commands/auth-state.js';
program.addCommand(createAuthStateCommand());
```

Add a command registration test:

```ts
it('registers auth-state command group', () => {
  const command = createAuthStateCommand();
  expect(command.name()).toBe('auth-state');
  expect(command.commands.map(child => child.name())).toEqual(['verify', 'capture']);
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- auth-state commands
```

Expected: pass.

## Task 4: Add Probe Runner CLI

**Files:**
- Create: `packages/scanner/src/modes/probe.ts`
- Create: `packages/scanner/src/commands/probe.ts`
- Modify: `packages/scanner/src/program.ts`
- Modify: `packages/scanner/src/__tests__/commands.test.ts`
- Create: `packages/scanner/src/__tests__/probe.test.ts`

- [ ] **Step 1: Add failing probe unit tests**

Create `packages/scanner/src/__tests__/probe.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluateProbeNode, resolveRouteTemplate } from '../modes/probe.js';

describe('probe helpers', () => {
  it('resolves route templates from manifest variables', () => {
    expect(
      resolveRouteTemplate('/my/events/[eventId]/upload', {
        eventId: 'e1000000-0000-4000-8000-000000000001',
      })
    ).toBe('/my/events/e1000000-0000-4000-8000-000000000001/upload');
  });

  it('marks route observations as pass when expectations match', () => {
    expect(
      evaluateProbeNode({
        nodeId: 'speaker-events',
        expected: { status: 200, text: ['My Events'], finalUrl: '/my/events' },
        observed: {
          status: 200,
          finalUrl: 'http://localhost:3000/my/events',
          matchedText: ['My Events'],
          matchedSelectors: [],
          consoleErrors: [],
          failedRequests: [],
        },
      }).status
    ).toBe('pass');
  });

  it('marks route observations as fail when expected text is missing', () => {
    const result = evaluateProbeNode({
      nodeId: 'speaker-events',
      expected: { text: ['My Events'] },
      observed: {
        finalUrl: 'http://localhost:3000/my/events',
        matchedText: [],
        matchedSelectors: [],
        consoleErrors: [],
        failedRequests: [],
      },
    });

    expect(result.status).toBe('fail');
    expect(result.reason).toContain('Missing expected text');
  });
});
```

- [ ] **Step 2: Run failing probe tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- probe
```

Expected: fail because `../modes/probe.js` does not exist.

- [ ] **Step 3: Implement probe helpers and runner**

Create `packages/scanner/src/modes/probe.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import type { WorkflowManifest, WorkflowNodeExpectations } from '@neonwatty/nav-map/workflow';
import { findAuthState } from './auth-state.js';

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
  consoleErrors: string[];
  failedRequests: string[];
}

export interface ProbeRun {
  app: string;
  authState?: string;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  results: ProbeNodeResult[];
}

export function resolveRouteTemplate(route: string, variables: Record<string, string>): string {
  return route.replace(/\\[([^\\]]+)\\]/g, (_, key: string) => {
    if (!variables[key]) throw new Error(`Missing route variable: ${key}`);
    return variables[key];
  });
}

export function evaluateProbeNode(options: {
  nodeId: string;
  expected?: WorkflowNodeExpectations;
  observed: ProbeNodeObserved;
}): { status: ProbeStatus; reason?: string } {
  const expected = options.expected;
  if (!expected) return { status: 'unchecked' };

  if (expected.status && options.observed.status !== expected.status) {
    return { status: 'fail', reason: `Expected status ${expected.status}, observed ${options.observed.status}` };
  }
  if (expected.finalUrl && !options.observed.finalUrl.endsWith(expected.finalUrl)) {
    return { status: 'fail', reason: `Expected final URL ending ${expected.finalUrl}, observed ${options.observed.finalUrl}` };
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
  if (options.observed.consoleErrors.length > 0) {
    return { status: 'warn', reason: 'Console errors observed' };
  }
  if (options.observed.failedRequests.length > 0) {
    return { status: 'warn', reason: 'Failed network requests observed' };
  }
  return { status: 'pass' };
}

export async function runProbe(options: {
  manifest: WorkflowManifest;
  baseUrl: string;
  authState?: string;
  flow?: string;
  nodes?: string[];
  outputPath: string;
  screenshotsDir: string;
}): Promise<ProbeRun> {
  const startedAt = new Date().toISOString();
  const variables = options.manifest.routeVariables ?? {};
  const flow = options.flow ? options.manifest.flows?.find(item => item.name === options.flow) : undefined;
  const selectedIds = new Set(options.nodes ?? flow?.steps ?? options.manifest.nodes.map(node => node.id ?? node.route));
  const selectedNodes = options.manifest.nodes.filter(node => selectedIds.has(node.id ?? node.route));
  const state = options.authState ? findAuthState(options.manifest, options.authState) : null;
  const storageState = state?.kind === 'storage-state' && state.storageStatePath ? path.resolve(state.storageStatePath) : undefined;
  const browser = await chromium.launch({ headless: true });
  const results: ProbeNodeResult[] = [];

  try {
    const context = await browser.newContext(storageState ? { storageState } : {});
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim());
    });

    fs.mkdirSync(options.screenshotsDir, { recursive: true });
    for (const node of selectedNodes) {
      consoleErrors.length = 0;
      failedRequests.length = 0;
      const nodeId = node.id ?? node.route;
      const concreteRoute = resolveRouteTemplate(node.route, variables);
      const response = await page.goto(new URL(concreteRoute, options.baseUrl).toString(), {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      const matchedText: string[] = [];
      for (const text of node.expectations?.text ?? []) {
        if (await page.getByText(text).first().isVisible().catch(() => false)) matchedText.push(text);
      }
      const matchedSelectors: string[] = [];
      for (const selector of node.expectations?.selectors ?? []) {
        if (await page.locator(selector).first().isVisible().catch(() => false)) matchedSelectors.push(selector);
      }
      const screenshot = path.join(options.screenshotsDir, `${nodeId}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      const observed = {
        status: response?.status(),
        finalUrl: page.url(),
        matchedText,
        matchedSelectors,
        consoleErrors: [...consoleErrors],
        failedRequests: [...failedRequests],
      };
      const evaluation = evaluateProbeNode({ nodeId, expected: node.expectations, observed });
      results.push({
        nodeId,
        route: node.route,
        concreteRoute,
        finalUrl: observed.finalUrl,
        status: evaluation.status,
        reason: evaluation.reason,
        screenshot,
        consoleErrors: observed.consoleErrors,
        failedRequests: observed.failedRequests,
      });
    }
    await context.close();
  } finally {
    await browser.close();
  }

  const run = {
    app: options.manifest.name,
    authState: options.authState,
    baseUrl: options.baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  };
  fs.mkdirSync(path.dirname(path.resolve(options.outputPath)), { recursive: true });
  fs.writeFileSync(options.outputPath, JSON.stringify(run, null, 2));
  return run;
}
```

- [ ] **Step 4: Add probe command**

Create `packages/scanner/src/commands/probe.ts`:

```ts
import { Command } from 'commander';
import { loadWorkflowManifest } from '../modes/context.js';
import { runProbe } from '../modes/probe.js';

export function createProbeCommand(): Command {
  return new Command('probe')
    .description('Probe workflow routes and write safe verification receipts')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--base-url <url>', 'Base URL to probe')
    .option('--auth-state <state>', 'Auth state id')
    .option('--flow <name>', 'Flow name to probe')
    .option('--nodes <ids>', 'Comma-separated node ids to probe')
    .option('--out <path>', 'Probe output JSON path', '.nav-map/probe-runs/latest.json')
    .option('--screenshots-dir <dir>', 'Screenshot output directory', '.nav-map/probe-runs/screenshots')
    .action(async (manifestPath, opts) => {
      const run = await runProbe({
        manifest: loadWorkflowManifest(manifestPath),
        baseUrl: opts.baseUrl,
        authState: opts.authState,
        flow: opts.flow,
        nodes: opts.nodes
          ? String(opts.nodes).split(',').map((item: string) => item.trim()).filter(Boolean)
          : undefined,
        outputPath: opts.out,
        screenshotsDir: opts.screenshotsDir,
      });
      const failed = run.results.filter(result => result.status === 'fail').length;
      const warned = run.results.filter(result => result.status === 'warn').length;
      console.log(`Wrote ${opts.out}`);
      console.log(`Results: ${run.results.length} routes, ${failed} failed, ${warned} warned`);
      if (failed > 0) process.exit(1);
    });
}
```

- [ ] **Step 5: Register probe command and update command tests**

Modify `packages/scanner/src/program.ts`:

```ts
import { createProbeCommand } from './commands/probe.js';
program.addCommand(createProbeCommand());
```

Add command registration test:

```ts
it('registers probe command options', () => {
  const command = createProbeCommand();
  expect(command.name()).toBe('probe');
  expect(optionFlags(command)).toEqual([
    '--base-url <url>',
    '--auth-state <state>',
    '--flow <name>',
    '--nodes <ids>',
    '--out <path>',
    '--screenshots-dir <dir>',
  ]);
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- probe commands
```

Expected: pass.

## Task 5: Add Diff CLI

**Files:**
- Create: `packages/scanner/src/modes/diff.ts`
- Create: `packages/scanner/src/commands/diff.ts`
- Modify: `packages/scanner/src/program.ts`
- Modify: `packages/scanner/src/__tests__/commands.test.ts`
- Create: `packages/scanner/src/__tests__/diff.test.ts`

- [ ] **Step 1: Add failing diff tests**

Create `packages/scanner/src/__tests__/diff.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderProbeDiff } from '../modes/diff.js';

describe('renderProbeDiff', () => {
  it('renders pass, warn, and fail findings with screenshot links', () => {
    const markdown = renderProbeDiff({
      app: 'Deckchecker Speaker',
      authState: 'speaker',
      baseUrl: 'http://localhost:3000',
      startedAt: '2026-06-14T00:00:00.000Z',
      finishedAt: '2026-06-14T00:01:00.000Z',
      results: [
        {
          nodeId: 'speaker-events',
          route: '/my/events',
          concreteRoute: '/my/events',
          finalUrl: 'http://localhost:3000/my/events',
          status: 'pass',
          screenshot: '.nav-map/probe-runs/screenshots/speaker-events.png',
          consoleErrors: [],
          failedRequests: [],
        },
        {
          nodeId: 'speaker-upload',
          route: '/my/events/[eventId]/upload',
          concreteRoute: '/my/events/e1/upload',
          finalUrl: 'http://localhost:3000/my/events/e1/upload',
          status: 'fail',
          reason: 'Missing expected text: Upload',
          screenshot: '.nav-map/probe-runs/screenshots/speaker-upload.png',
          consoleErrors: [],
          failedRequests: [],
        },
      ],
    });

    expect(markdown).toContain('# Deckchecker Speaker Probe Diff');
    expect(markdown).toContain('| speaker-events | pass |');
    expect(markdown).toContain('| speaker-upload | fail |');
    expect(markdown).toContain('Missing expected text: Upload');
    expect(markdown).toContain('.nav-map/probe-runs/screenshots/speaker-upload.png');
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- diff
```

Expected: fail because `../modes/diff.js` does not exist.

- [ ] **Step 3: Implement diff renderer**

Create `packages/scanner/src/modes/diff.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { ProbeRun } from './probe.js';

export function loadProbeRun(filePath: string): ProbeRun {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8')) as ProbeRun;
}

export function renderProbeDiff(run: ProbeRun): string {
  const rows = run.results.map(result =>
    [
      result.nodeId,
      result.status,
      `\\`${result.concreteRoute}\\``,
      `\\`${result.finalUrl}\\``,
      result.reason ?? '',
      result.screenshot ?? '',
    ].join(' | ')
  );
  return [
    `# ${run.app} Probe Diff`,
    '',
    `- Auth state: ${run.authState ?? 'none'}`,
    `- Base URL: ${run.baseUrl}`,
    `- Started: ${run.startedAt}`,
    `- Finished: ${run.finishedAt}`,
    '',
    '| Node | Status | Route | Final URL | Reason | Screenshot |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(row => `| ${row} |`),
    '',
  ].join('\\n');
}

export function writeProbeDiff(markdown: string, outputPath: string): void {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, markdown);
}
```

- [ ] **Step 4: Add diff command**

Create `packages/scanner/src/commands/diff.ts`:

```ts
import { Command } from 'commander';
import { loadProbeRun, renderProbeDiff, writeProbeDiff } from '../modes/diff.js';

export function createDiffCommand(): Command {
  return new Command('diff')
    .description('Render expected-vs-observed probe findings')
    .argument('<manifest>', 'Path to workflow manifest JSON')
    .requiredOption('--probe <path>', 'Probe run JSON path')
    .option('--out <path>', 'Diff Markdown output path', '.nav-map/probe-runs/latest.diff.md')
    .action((_manifestPath, opts) => {
      const markdown = renderProbeDiff(loadProbeRun(opts.probe));
      writeProbeDiff(markdown, opts.out);
      console.log(`Wrote ${opts.out}`);
    });
}
```

The manifest argument is accepted now to keep the CLI shape stable. The first implementation can render from probe receipts only because probe results already carry evaluated status and reason.

- [ ] **Step 5: Register diff command and update command tests**

Modify `packages/scanner/src/program.ts`:

```ts
import { createDiffCommand } from './commands/diff.js';
program.addCommand(createDiffCommand());
```

Add command registration test:

```ts
it('registers diff command options', () => {
  const command = createDiffCommand();
  expect(command.name()).toBe('diff');
  expect(command.registeredArguments.map(argument => argument.name())).toEqual(['manifest']);
  expect(optionFlags(command)).toEqual(['--probe <path>', '--out <path>']);
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map-scanner test -- diff commands
```

Expected: pass.

## Task 6: Add Deckchecker Speaker Fixture

**Files:**
- Create: `packages/demo/public/deckchecker-speaker.workflow.json`
- Create: `packages/demo/public/deckchecker-speaker.nav-map.json`
- Modify: `packages/demo/app/page.tsx`

- [ ] **Step 1: Create speaker workflow manifest**

Create `packages/demo/public/deckchecker-speaker.workflow.json`:

```json
{
  "version": "workflow-atlas/1.0",
  "name": "Deckchecker Speaker Workflow",
  "baseUrl": "http://localhost:3000",
  "description": "Speaker-first Deckchecker atlas for agent context, auth-state verification, probes, and diff receipts.",
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "routeVariables": {
    "eventId": "e1000000-0000-4000-8000-000000000001"
  },
  "authStates": [
    {
      "id": "signed-out",
      "label": "Signed out",
      "kind": "anonymous"
    },
    {
      "id": "speaker",
      "label": "Speaker",
      "kind": "storage-state",
      "storageStatePath": ".nav-map/auth/deckchecker-speaker.storage.json",
      "capture": {
        "mode": "headed-login",
        "startRoute": "/sign-in",
        "successRoute": "/my/events",
        "successSelector": "main",
        "successText": "My Events"
      },
      "verify": {
        "route": "/my/events",
        "expectStatus": 200,
        "expectText": "My Events"
      }
    }
  ],
  "personas": [
    {
      "id": "signed-out",
      "label": "Signed out visitor"
    },
    {
      "id": "speaker",
      "label": "Deckchecker speaker"
    }
  ],
  "sections": [
    { "id": "public", "label": "Public" },
    { "id": "auth", "label": "Auth" },
    { "id": "speaker", "label": "Speaker" },
    { "id": "boundary", "label": "Role Boundaries" }
  ],
  "nodes": [
    {
      "id": "home",
      "route": "/",
      "label": "Landing",
      "section": "public",
      "purpose": "Public landing page; signed-in users redirect by role.",
      "personas": ["signed-out", "speaker"],
      "authRequirement": "public",
      "expectations": { "selectors": ["main"] },
      "sourceHints": ["web/src/app/page.tsx"]
    },
    {
      "id": "sign-in",
      "route": "/sign-in",
      "label": "Sign In",
      "section": "auth",
      "purpose": "Authentication entry for seeded speaker login.",
      "personas": ["signed-out"],
      "authRequirement": "signed-out",
      "expectations": { "selectors": ["main"], "text": ["Sign In"] },
      "sourceHints": ["web/src/app/(auth)/sign-in/page.tsx"]
    },
    {
      "id": "waitlist",
      "route": "/waitlist",
      "label": "Waitlist",
      "section": "public",
      "purpose": "Public conversion fallback.",
      "personas": ["signed-out"],
      "authRequirement": "public",
      "expectations": { "selectors": ["main"] },
      "sourceHints": ["web/src/app/(public)/waitlist/page.tsx"]
    },
    {
      "id": "speaker-events",
      "route": "/my/events",
      "label": "My Events",
      "section": "speaker",
      "purpose": "Speaker home route listing assigned events.",
      "personas": ["speaker"],
      "authRequirement": "speaker",
      "expectedRedirects": [{ "when": "signed-out", "to": "/sign-in?next=/my/events" }],
      "expectations": {
        "signedOutRedirect": "/sign-in?next=/my/events",
        "selectors": ["main"],
        "text": ["My Events"],
        "status": 200
      },
      "sourceHints": ["web/src/app/(speaker)/my/events/page.tsx"]
    },
    {
      "id": "speaker-event-detail",
      "route": "/my/events/[eventId]",
      "label": "Speaker Event Detail",
      "section": "speaker",
      "purpose": "Speaker event detail with sessions and submission status.",
      "personas": ["speaker"],
      "authRequirement": "speaker",
      "expectations": { "selectors": ["main"], "status": 200 },
      "sourceHints": ["web/src/app/(speaker)/my/events/[id]/page.tsx"]
    },
    {
      "id": "speaker-invitation",
      "route": "/my/events/[eventId]/invitation",
      "label": "Invitation",
      "section": "speaker",
      "purpose": "Speaker invitation response surface.",
      "personas": ["speaker"],
      "authRequirement": "speaker",
      "expectations": { "selectors": ["main"], "status": 200 },
      "sourceHints": ["web/src/app/(speaker)/my/events/[id]/invitation/page.tsx"]
    },
    {
      "id": "speaker-upload",
      "route": "/my/events/[eventId]/upload",
      "label": "Upload Deck",
      "section": "speaker",
      "purpose": "Speaker deck upload surface. First pilot verifies UI only and does not upload files.",
      "personas": ["speaker"],
      "authRequirement": "speaker",
      "expectations": { "selectors": ["main"], "status": 200 },
      "sourceHints": ["web/src/app/(speaker)/my/events/[id]/upload/page.tsx"]
    },
    {
      "id": "speaker-results",
      "route": "/my/events/[eventId]/results",
      "label": "Results",
      "section": "speaker",
      "purpose": "Speaker scan results surface.",
      "personas": ["speaker"],
      "authRequirement": "speaker",
      "expectations": { "selectors": ["main"], "status": 200 },
      "sourceHints": ["web/src/app/(speaker)/my/events/[id]/results/page.tsx"]
    },
    {
      "id": "speaker-profile",
      "route": "/my/profile",
      "label": "Speaker Profile",
      "section": "speaker",
      "purpose": "Speaker profile form. First pilot verifies UI only and does not save edits.",
      "personas": ["speaker"],
      "authRequirement": "speaker",
      "expectations": { "selectors": ["main"], "status": 200 },
      "sourceHints": ["web/src/app/(speaker)/my/profile/page.tsx"]
    },
    {
      "id": "admin-dashboard-boundary",
      "route": "/admin/dashboard",
      "label": "Admin Boundary",
      "section": "boundary",
      "purpose": "Boundary route used to verify speaker cannot access admin dashboard.",
      "personas": ["speaker"],
      "authRequirement": "admin",
      "expectations": { "selectors": ["main"] },
      "sourceHints": ["web/src/app/(admin)/admin/dashboard/page.tsx"]
    },
    {
      "id": "planner-events-boundary",
      "route": "/events",
      "label": "Planner Boundary",
      "section": "boundary",
      "purpose": "Boundary route used to verify speaker cannot access planner event list.",
      "personas": ["speaker"],
      "authRequirement": "planner",
      "expectations": { "selectors": ["main"] },
      "sourceHints": ["web/src/app/(planner)/events/page.tsx"]
    }
  ],
  "edges": [
    { "source": "sign-in", "target": "speaker-events", "action": "Sign in as speaker", "personas": ["speaker"], "type": "redirect" },
    { "source": "speaker-events", "target": "speaker-event-detail", "action": "Open assigned event", "personas": ["speaker"] },
    { "source": "speaker-event-detail", "target": "speaker-invitation", "action": "Review invitation", "personas": ["speaker"] },
    { "source": "speaker-event-detail", "target": "speaker-upload", "action": "Open upload surface", "personas": ["speaker"] },
    { "source": "speaker-upload", "target": "speaker-results", "action": "Review scan results", "personas": ["speaker"] },
    { "source": "speaker-events", "target": "speaker-profile", "action": "Open profile", "personas": ["speaker"] },
    { "source": "speaker-events", "target": "sign-in", "action": "Redirect signed-out visitor", "personas": ["signed-out"], "type": "redirect" }
  ],
  "flows": [
    { "name": "Speaker sign-in and event list", "steps": ["sign-in", "speaker-events"] },
    { "name": "Speaker event review", "steps": ["speaker-events", "speaker-event-detail", "speaker-invitation"] },
    { "name": "Speaker deck workflow", "steps": ["speaker-event-detail", "speaker-upload", "speaker-results"] },
    { "name": "Speaker auth boundaries", "steps": ["speaker-events", "admin-dashboard-boundary", "planner-events-boundary"], "partial": true }
  ],
  "metadata": {
    "sourceAppPath": "/Users/neonwatty/Desktop/deckchecker",
    "safety": "Read-only pilot except headed login capture. Do not upload decks or save profile edits."
  }
}
```

- [ ] **Step 2: Generate nav-map graph fixture**

Run:

```bash
node packages/scanner/dist/cli.js workflow packages/demo/public/deckchecker-speaker.workflow.json \
  -o packages/demo/public/deckchecker-speaker.nav-map.json \
  --no-screenshots
```

Expected output includes:

```text
Nodes: 11
Edges: 7
Groups: 4
```

- [ ] **Step 3: Add demo dataset option**

Modify `packages/demo/app/page.tsx`:

```ts
type DemoDataset = 'prcard' | 'deckchecker-speaker' | 'bleep';
```

Add option:

```tsx
<option value="deckchecker-speaker">Deckchecker speaker</option>
```

Update `loadDemoGraph`:

```ts
if (dataset === 'deckchecker-speaker') {
  const generated = await fetch('/deckchecker-speaker.nav-map.json');
  if (generated.ok) return (await generated.json()) as NavMapGraph;
  const manifest = await fetchJson<WorkflowManifest>('/deckchecker-speaker.workflow.json');
  return workflowManifestToGraph(manifest);
}
```

- [ ] **Step 4: Run demo build**

Run:

```bash
pnpm --filter demo build
```

Expected: build succeeds.

## Task 7: Documentation And End-to-End Verification

**Files:**
- Modify: `README.md`
- Create: `.gitignore` entry if `.nav-map/auth/` is not already ignored by repo-level ignore.

- [ ] **Step 1: Update README with CLI sequence**

Add this section to `README.md`:

```md
### Agent CLI loop

```bash
nav-map context deckchecker-speaker.workflow.json --auth-state speaker --focus speaker --format markdown
nav-map auth-state capture deckchecker-speaker.workflow.json --state speaker --base-url http://localhost:3000 --headed --out .nav-map/auth/deckchecker-speaker.storage.json
nav-map auth-state verify deckchecker-speaker.workflow.json --state speaker --base-url http://localhost:3000
nav-map probe deckchecker-speaker.workflow.json --base-url http://localhost:3000 --auth-state speaker --flow "Speaker deck workflow"
nav-map diff deckchecker-speaker.workflow.json --probe .nav-map/probe-runs/latest.json
```

Auth state files can impersonate users. Keep `.nav-map/auth/` gitignored and never paste storage-state contents into logs, prompts, issues, or commits.
```

- [ ] **Step 2: Run full package tests**

Run:

```bash
pnpm --filter @neonwatty/nav-map test
pnpm --filter @neonwatty/nav-map-scanner test
pnpm -r typecheck
```

Expected: all pass.

- [ ] **Step 3: Build packages**

Run:

```bash
pnpm --filter @neonwatty/nav-map build
pnpm --filter @neonwatty/nav-map-scanner build
pnpm --filter demo build
```

Expected: all pass.

- [ ] **Step 4: Generate context artifact from Deckchecker speaker manifest**

Run:

```bash
node packages/scanner/dist/cli.js context packages/demo/public/deckchecker-speaker.workflow.json \
  --auth-state speaker \
  --focus speaker \
  --format markdown \
  --line-budget 250 \
  --out /tmp/deckchecker-speaker-context.md
```

Expected:

```bash
test $(wc -l < /tmp/deckchecker-speaker-context.md) -le 250
rg "speaker-events|Speaker deck workflow|/sign-in\\?next=/my/events|Auth state: `speaker`" /tmp/deckchecker-speaker-context.md
```

Both commands exit 0.

- [ ] **Step 5: Verify no obvious secret strings in context artifact**

Run:

```bash
! rg -i "access_token|refresh_token|cookie|localStorage|password|service_role|webhook secret|oauth secret" /tmp/deckchecker-speaker-context.md
```

Expected: exit 0.

- [ ] **Step 6: Optional live Deckchecker speaker probe**

Only run this when Deckchecker local dev is intentionally available and a speaker storage state has been captured.

Run:

```bash
node packages/scanner/dist/cli.js auth-state verify packages/demo/public/deckchecker-speaker.workflow.json \
  --state speaker \
  --base-url http://localhost:3000

node packages/scanner/dist/cli.js probe packages/demo/public/deckchecker-speaker.workflow.json \
  --base-url http://localhost:3000 \
  --auth-state speaker \
  --flow "Speaker deck workflow" \
  --out /tmp/deckchecker-speaker-probe.json \
  --screenshots-dir /tmp/deckchecker-speaker-screenshots

node packages/scanner/dist/cli.js diff packages/demo/public/deckchecker-speaker.workflow.json \
  --probe /tmp/deckchecker-speaker-probe.json \
  --out /tmp/deckchecker-speaker.diff.md
```

Expected when local app and auth state are valid:

```bash
node -e "const p=require('/tmp/deckchecker-speaker-probe.json'); if (!p.results.every(r => ['pass','warn','unchecked'].includes(r.status))) process.exit(1)"
test -s /tmp/deckchecker-speaker.diff.md
```

## Self-Review

- Spec coverage: The plan implements manifest grounding, context export, auth capture/verify, probe, diff, Deckchecker speaker fixture, docs, tests, and measurable verification.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: `WorkflowAuthState`, `WorkflowNodeExpectations`, `ProbeRun`, and CLI option names are consistent across tasks.
- Scope check: The implementation is still a multi-command feature, but each task is independently testable and produces a usable slice.
