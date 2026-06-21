import fs from 'node:fs';
import path from 'node:path';
import { routeToId } from '@neonwatty/nav-map/workflow';
import {
  createAgentContract,
  type AgentContract,
  type AgentContractNextAction,
} from './agent-contract.js';
import type { ProbeNodeResult, ProbeRun, ProbeStatus } from './probe.js';

export interface ProbeDiffManifest {
  name: string;
  nodes: readonly {
    id?: string;
    route: string;
  }[];
}

export function loadProbeRun(filePath: string): ProbeRun {
  const parsed = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8')) as
    | ProbeRun
    | { kind?: string; data?: ProbeRun };
  if (parsed && typeof parsed === 'object' && 'kind' in parsed && parsed.kind === 'probe-run') {
    return parsed.data as ProbeRun;
  }
  return parsed as ProbeRun;
}

export function renderProbeDiff(run: ProbeRun): string {
  const safeRun = sanitizeProbeValue(run) as ProbeRun;
  const rows = safeRun.results.map(result =>
    [
      markdownCell(result.nodeId),
      markdownCell(result.status),
      markdownCell(formatCode(result.concreteRoute)),
      markdownCell(formatCode(result.finalUrl)),
      markdownCell(result.reason ?? ''),
      markdownCell(result.screenshot ?? ''),
    ].join(' | ')
  );

  return [
    `# ${sanitizeProbeString(safeRun.app)} Probe Diff`,
    '',
    `- Auth state: ${sanitizeProbeString(safeRun.authState ?? 'none')}`,
    `- Base URL: ${sanitizeProbeString(safeRun.baseUrl)}`,
    `- Started: ${sanitizeProbeString(safeRun.startedAt)}`,
    `- Finished: ${sanitizeProbeString(safeRun.finishedAt)}`,
    '',
    '| Node | Status | Route | Final URL | Reason | Screenshot |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(row => `| ${row} |`),
    '',
  ].join('\n');
}

export function writeProbeDiff(markdown: string, outputPath: string): void {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, markdown);
}

export interface ProbeDiffFinding {
  nodeId: string;
  status: ProbeStatus;
  route: string;
  finalUrl: string;
  reason?: string;
  screenshot?: string;
  checkSummary: Record<string, number>;
}

export interface ProbeDiffPayload {
  app: string;
  command: string;
  manifestPath?: string;
  authState?: string;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  selection?: ProbeRun['selection'];
  screenshotSummary?: ProbeRun['screenshotSummary'];
  warnings: string[];
  findings: ProbeDiffFinding[];
}

export function renderProbeDiffContract(
  run: ProbeRun,
  options: string | { outputPath?: string; manifestPath?: string } = {}
): AgentContract<'probe-diff', ProbeDiffPayload> {
  const safeRun = sanitizeProbeValue(run) as ProbeRun;
  const outputPath = typeof options === 'string' ? options : options.outputPath;
  const manifestPath = typeof options === 'string' ? undefined : options.manifestPath;
  const payload: ProbeDiffPayload = {
    app: safeRun.app,
    command: buildProbeDiffCommand(safeRun, manifestPath, outputPath),
    manifestPath,
    authState: safeRun.authState,
    baseUrl: safeRun.baseUrl,
    startedAt: safeRun.startedAt,
    finishedAt: safeRun.finishedAt,
    selection: safeRun.selection,
    screenshotSummary: safeRun.screenshotSummary,
    warnings: buildDiffWarnings(safeRun),
    findings: safeRun.results.map(result => ({
      nodeId: result.nodeId,
      status: result.status,
      route: result.concreteRoute,
      finalUrl: result.finalUrl,
      reason: result.reason,
      screenshot: result.screenshot,
      checkSummary: summarizeChecks(result),
    })),
  };
  const counts = summarizeResults(safeRun.results);

  return createAgentContract({
    kind: 'probe-diff',
    generatedAt: safeRun.finishedAt,
    summary: {
      app: safeRun.app,
      authState: safeRun.authState ?? null,
      total: safeRun.results.length,
      ...counts,
    },
    data: payload,
    artifacts: [
      ...(outputPath
        ? [{ kind: 'probe-diff', path: outputPath, description: 'Probe diff contract JSON' }]
        : []),
      ...safeRun.results
        .filter(result => result.screenshot)
        .map(result => ({
          kind: 'screenshot',
          path: result.screenshot,
          description: `Screenshot for ${result.nodeId}`,
        })),
    ],
    nextActions: [...buildDiffNextActions(safeRun, manifestPath)],
  });
}

export function validateProbeRunManifest(
  run: ProbeRun,
  manifest: ProbeDiffManifest,
  manifestPath = '<manifest>'
): void {
  if (run.app !== manifest.name) {
    throw new Error(
      `Probe run app "${run.app}" does not match manifest "${manifest.name}" (${manifestPath})`
    );
  }

  const manifestNodeIds = new Set(manifest.nodes.map(node => node.id ?? routeToId(node.route)));
  const missingNodeIds = run.results
    .map(result => result.nodeId)
    .filter(nodeId => !manifestNodeIds.has(nodeId));
  if (missingNodeIds.length > 0) {
    throw new Error(
      `Probe run contains node ids not present in manifest ${manifestPath}: ${missingNodeIds.join(', ')}`
    );
  }
}

function formatCode(value: string): string {
  return `\`${value.replace(/`/g, '\\`')}\``;
}

function markdownCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function summarizeChecks(result: ProbeNodeResult): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const check of result.checks ?? []) {
    summary[check.status] = (summary[check.status] ?? 0) + 1;
  }
  return summary;
}

function summarizeResults(results: ProbeNodeResult[]): Record<ProbeStatus, number> {
  return {
    pass: results.filter(result => result.status === 'pass').length,
    warn: results.filter(result => result.status === 'warn').length,
    fail: results.filter(result => result.status === 'fail').length,
    unchecked: results.filter(result => result.status === 'unchecked').length,
  };
}

function buildProbeDiffCommand(
  run: ProbeRun,
  manifestPath: string | undefined,
  outputPath: string | undefined
): string {
  return [
    'nav-map diff',
    manifestPath ? shellArg(manifestPath) : '<manifest>',
    '--probe <probe-run>',
    '--format json',
    outputPath ? `--out ${shellArg(outputPath)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildDiffWarnings(run: ProbeRun): string[] {
  const warnings = [...(run.warnings ?? [])];
  const failed = run.results.filter(result => result.status === 'fail').length;
  const warned = run.results.filter(result => result.status === 'warn').length;
  if (failed > 0 && !warnings.some(warning => warning.includes('failed'))) {
    warnings.push(`${failed} route probe(s) failed expectations.`);
  }
  if (warned > 0 && !warnings.some(warning => warning.includes('warnings'))) {
    warnings.push(`${warned} diff finding(s) contain warnings.`);
  }
  return warnings;
}

function buildDiffNextActions(
  run: ProbeRun,
  manifestPath: string | undefined
): AgentContractNextAction[] {
  const manifestArg = manifestPath ? shellArg(manifestPath) : '<manifest>';
  return [
    {
      label: 'Inspect manifest context',
      command: `nav-map context ${manifestArg}${run.authState ? ` --auth-state ${shellArg(run.authState)}` : ''} --format json --contract`,
      reason: 'Load expected workflow context before applying manifest updates.',
      safety: 'read-only',
    },
    {
      label: 'Refresh probe after fixes',
      command: `nav-map probe ${manifestArg} --base-url ${shellArg(run.baseUrl)}${run.authState ? ` --auth-state ${shellArg(run.authState)}` : ''} --contract`,
      reason: 'Regenerate expected-vs-observed evidence after app or manifest changes.',
      safety: 'writes-local-files',
    },
  ];
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
