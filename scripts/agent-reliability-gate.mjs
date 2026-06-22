import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const manifestPath = path.join(repoRoot, 'packages/demo/public/golden-agent.workflow.json');
const outDir = path.resolve(
  readOption('--out-dir') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-reliability-'))
);
const scannerBin = path.join(repoRoot, 'packages/scanner/bin/nav-map.js');
const startedAt = new Date().toISOString();

fs.mkdirSync(outDir, { recursive: true });

const server = await startFixtureServer();

try {
  const baseUrl = `http://127.0.0.1:${server.port}`;
  const inspectPath = path.join(outDir, 'golden-agent.inspect.json');
  const contextPath = path.join(outDir, 'golden-agent.context.json');
  const graphPath = path.join(outDir, 'golden-agent.nav-map.json');
  const probePath = path.join(outDir, 'golden-agent.probe.json');
  const diffPath = path.join(outDir, 'golden-agent.diff.json');
  const screenshotsDir = path.join(outDir, 'screenshots');

  const commands = [];
  commands.push(
    await run('workflow inspect', [
      process.execPath,
      scannerBin,
      'workflow',
      manifestPath,
      '--inspect',
      '--contract',
      '-o',
      inspectPath,
    ])
  );
  commands.push(
    await run(
      'context contract',
      [process.execPath, scannerBin, 'context', manifestPath, '--format', 'json', '--contract'],
      contextPath
    )
  );
  commands.push(
    await run('workflow graph', [
      process.execPath,
      scannerBin,
      'workflow',
      manifestPath,
      '--no-screenshots',
      '-o',
      graphPath,
    ])
  );
  commands.push(
    await run('probe contract', [
      process.execPath,
      scannerBin,
      'probe',
      manifestPath,
      '--base-url',
      baseUrl,
      '--nodes',
      'home,dashboard',
      '--out',
      probePath,
      '--screenshots-dir',
      screenshotsDir,
      '--contract',
    ])
  );
  commands.push(
    await run('diff contract', [
      process.execPath,
      scannerBin,
      'diff',
      manifestPath,
      '--probe',
      probePath,
      '--format',
      'json',
      '--out',
      diffPath,
    ])
  );

  const inspect = readJson(inspectPath);
  const context = readJson(contextPath);
  const graph = readJson(graphPath);
  const probe = readContractData(readJson(probePath), 'probe-run');
  const diff = readJson(diffPath);
  assertGate(inspect, context, graph, probe, diff);

  const finishedAt = new Date().toISOString();
  process.stdout.write(
    `${JSON.stringify(
      {
        name: 'nav-map-agent-reliability-gate',
        status: 'pass',
        startedAt,
        finishedAt,
        baseUrl,
        outDir,
        manifest: path.relative(repoRoot, manifestPath),
        summary: {
          routes: context.data.routes.length,
          surfaces: context.data.surfaces.length,
          flows: context.data.flows.length,
          probeResults: summarizeProbe(probe),
          diffSummary: diff.summary,
        },
        artifacts: {
          inspect: inspectPath,
          context: contextPath,
          graph: graphPath,
          probe: probePath,
          diff: diffPath,
          screenshotsDir,
        },
        commands,
      },
      null,
      2
    )}\n`
  );
} finally {
  await server.close();
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function run(label, command, stdoutPath) {
  const [cmd, ...args] = command;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', status => {
      if (stdoutPath) {
        fs.writeFileSync(stdoutPath, stdout);
      }

      if (status !== 0) {
        reject(new Error(`${label} failed with exit ${status}\n${stdout}\n${stderr}`.trim()));
        return;
      }

      resolve({
        label,
        status: 'pass',
        command: [path.relative(repoRoot, cmd) || cmd, ...args].join(' '),
        ...(stdoutPath ? { stdoutPath } : {}),
      });
    });
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readContractData(value, kind) {
  if (value.kind !== kind) {
    throw new Error(`Expected ${kind} contract, received ${value.kind ?? 'unknown'}`);
  }
  return value.data;
}

function assertGate(inspect, context, graph, probe, diff) {
  if (inspect.kind !== 'workflow-inspect' || inspect.summary.valid !== true) {
    throw new Error('Workflow inspect contract is not valid.');
  }
  if (context.kind !== 'workflow-context') {
    throw new Error('Context output is not a workflow-context contract.');
  }
  if (context.data.routes.length !== 2 || context.data.surfaces.length !== 2) {
    throw new Error('Golden context must expose two routes and two surfaces.');
  }
  if (graph.nodes.length !== 4 || graph.edges.length !== 3) {
    throw new Error('Golden graph must contain four nodes and three edges.');
  }
  const probeSummary = summarizeProbe(probe);
  if (probeSummary.fail > 0 || probeSummary.warn > 0 || probeSummary.unchecked > 0) {
    throw new Error(`Probe produced non-passing results: ${JSON.stringify(probeSummary)}`);
  }
  if (diff.kind !== 'probe-diff') {
    throw new Error('Diff output is not a probe-diff contract.');
  }
  if (diff.summary.fail > 0 || diff.summary.warn > 0 || diff.summary.unchecked > 0) {
    throw new Error(`Diff produced non-passing results: ${JSON.stringify(diff.summary)}`);
  }
}

function summarizeProbe(probe) {
  return {
    pass: probe.results.filter(result => result.status === 'pass').length,
    warn: probe.results.filter(result => result.status === 'warn').length,
    fail: probe.results.filter(result => result.status === 'fail').length,
    unchecked: probe.results.filter(result => result.status === 'unchecked').length,
  };
}

function startFixtureServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/') {
      sendHtml(response, '<main><h1>Golden Agent Home</h1><p>Stable public app route.</p></main>');
      return;
    }
    if (url.pathname === '/dashboard') {
      response.writeHead(302, { Location: '/login?next=%2Fdashboard' });
      response.end();
      return;
    }
    if (url.pathname === '/login') {
      sendHtml(response, '<main><h1>Login</h1><p>Redirect boundary reached.</p></main>');
      return;
    }
    if (url.pathname === '/mockups/golden-checkout.html') {
      const filePath = path.join(repoRoot, 'packages/demo/public/mockups/golden-checkout.html');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(fs.readFileSync(filePath, 'utf8'));
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not determine fixture server port.'));
        return;
      }
      resolve({
        port: address.port,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close(error => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });
}

function sendHtml(response, body) {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(
    `<!doctype html><html lang="en"><head><title>Golden Agent</title></head><body>${body}</body></html>`
  );
}
