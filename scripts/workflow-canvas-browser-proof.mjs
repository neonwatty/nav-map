import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const requireFromCwd = createRequire(`${process.cwd()}/package.json`);
const { chromium } = requireFromCwd('playwright');
const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn('pnpm', ['--filter', 'demo', 'exec', 'next', 'start', '-p', String(port)], {
  cwd: repoRoot,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
server.stdout.on('data', chunk => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', chunk => {
  serverOutput += chunk.toString();
});

const receipt = {
  name: 'workflow-canvas-browser-proof',
  baseUrl,
  status: 'running',
  checks: [],
  metrics: {},
  screenshots: [],
};
const fixtureAssets = [
  '/workflow-fixtures/welcome-reference.webp',
  '/workflow-fixtures/welcome-reference-thumb.webp',
  '/workflow-fixtures/welcome-observation.webp',
  '/workflow-fixtures/profile-reference.webp',
  '/workflow-fixtures/profile-observation.webp',
  '/workflow-fixtures/profile-resolution.webp',
];

let browser;
try {
  await waitForServer(`${baseUrl}/workflow-canvas`);
  browser = await chromium.launch({ headless: true });
  await proveDesktopAssetsAndTopology(browser);
  await proveExactMobile(browser);
  await proveReducedMotion(browser);
  await proveRepresentativePerformance(browser);
  receipt.status = 'pass';
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  receipt.status = 'fail';
  receipt.error = error instanceof Error ? error.message : String(error);
  receipt.serverOutput = serverOutput.slice(-2000);
  process.stderr.write(`${JSON.stringify(receipt, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      /* server already exited */
    }
  }
}

async function proveDesktopAssetsAndTopology(activeBrowser) {
  const context = await activeBrowser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const imageResponses = new Map();
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (fixtureAssets.includes(path))
      imageResponses.set(path, {
        status: response.status(),
        contentType: response.headers()['content-type'],
      });
  });
  await page.goto(`${baseUrl}/workflow-canvas`, { waitUntil: 'networkidle' });
  const canvas = page.locator('.workflow-canvas[data-ready="true"]');
  await canvas.waitFor();
  await page.waitForFunction(
    () => document.querySelector('.workflow-canvas')?.getAttribute('data-narrow') === 'false'
  );
  assert.notEqual(
    await page
      .locator('.workflow-canvas-graph')
      .evaluate(element => getComputedStyle(element).display),
    'none',
    'Desktop must expose the visual graph'
  );

  const connectors = await page
    .locator('.workflow-canvas-graph__connector')
    .evaluateAll(elements =>
      elements.map(element => [
        element.getAttribute('data-from-node-id'),
        element.getAttribute('data-to-node-id'),
      ])
    );
  assert.deepEqual(
    connectors,
    [
      ['welcome', 'profile'],
      ['profile', 'confirmation'],
    ],
    'Desktop connectors must represent only supplied edges'
  );
  const focusableDecoration = await page
    .locator('[aria-hidden="true"]')
    .evaluateAll(elements =>
      elements.flatMap(element =>
        [...element.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].map(
          child => child.outerHTML
        )
      )
    );
  assert.deepEqual(
    focusableDecoration,
    [],
    'aria-hidden graph decoration must not contain focusable descendants'
  );

  const decoded = await page.evaluate(async paths => {
    return Promise.all(
      paths.map(
        path =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () =>
              resolve({ path, width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = () => reject(new Error(`Failed to decode ${path}`));
            image.src = path;
          })
      )
    );
  }, fixtureAssets);
  assert.deepEqual(
    decoded,
    [
      { path: fixtureAssets[0], width: 1672, height: 941 },
      { path: fixtureAssets[1], width: 480, height: 270 },
      { path: fixtureAssets[2], width: 1672, height: 941 },
      { path: fixtureAssets[3], width: 1672, height: 941 },
      { path: fixtureAssets[4], width: 1672, height: 941 },
      { path: fixtureAssets[5], width: 1672, height: 941 },
    ],
    'Every fixture image must decode to its supplied dimensions in Chromium'
  );
  for (const path of fixtureAssets) {
    const response = imageResponses.get(path);
    assert.equal(response?.status, 200, `${path} must return HTTP 200`);
    assert.match(response?.contentType ?? '', /^image\/webp(?:;|$)/, `${path} must return WebP`);
  }

  const profile = page.locator('.workflow-canvas-step-button[data-node-id="profile"]');
  await profile.click();
  assert.equal(await profile.getAttribute('aria-expanded'), 'true', 'Selection must expand truth');
  const profileTruth = page.locator(`#${await profile.getAttribute('aria-controls')}`);
  await profileTruth.waitFor({ state: 'visible' });
  assert.match(await profileTruth.innerText(), /reference: Profile reference; availability stale/);
  assert.match(await profileTruth.innerText(), /Finding — Open:/);
  assert.match(await profileTruth.innerText(), /Comparison — Finding open:/);
  await profile.focus();
  await profile.press('Space');
  await page.getByRole('complementary', { name: 'Profile details' }).waitFor();
  await page.getByRole('button', { name: 'Close details' }).click();
  const screenshot = '/tmp/workflow-canvas-desktop.png';
  await page.screenshot({ path: screenshot, fullPage: true });
  receipt.screenshots.push(screenshot);
  receipt.metrics.fixtureImages = decoded;
  receipt.checks.push(
    'desktop graph exposes exact supplied connectors with no focusable aria-hidden descendants'
  );
  receipt.checks.push(
    'all six fixture images return image/webp 200 responses and decode to exact dimensions in Chromium'
  );
  receipt.checks.push('selection exposes complete review truth and Space opens focused details');
  await context.close();
}

async function proveExactMobile(activeBrowser) {
  const viewport = { width: 393, height: 852 };
  const context = await activeBrowser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/workflow-canvas`, { waitUntil: 'networkidle' });
  await page.locator('.workflow-canvas[data-ready="true"]').waitFor();
  await page.waitForFunction(
    () => document.querySelector('.workflow-canvas')?.getAttribute('data-narrow') === 'true'
  );
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    htmlWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.deepEqual(
    { width: dimensions.width, height: dimensions.height },
    viewport,
    'Chromium CSS viewport must be exactly 393x852'
  );
  assert.ok(
    dimensions.htmlWidth <= viewport.width && dimensions.bodyWidth <= viewport.width,
    `Page overflowed horizontally: html=${dimensions.htmlWidth}, body=${dimensions.bodyWidth}`
  );
  assert.equal(
    await page
      .locator('.workflow-canvas-graph')
      .evaluate(element => getComputedStyle(element).display),
    'none',
    'Narrow mode must use the semantic list instead of a tiny graph'
  );
  const targetsBeforeInspection = await assertVisibleMobileTargets(page, 'before inspection');

  const currentStep = page.locator('.workflow-canvas-step-button[tabindex="0"]');
  await currentStep.focus();
  await currentStep.press('ArrowDown');
  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute('data-node-id')),
    'profile',
    'ArrowDown must follow producer semantic order'
  );
  const profileStep = page.locator('.workflow-canvas-step-button[data-node-id="profile"]');
  assert.equal(
    await profileStep.getAttribute('aria-expanded'),
    'true',
    'Mobile selection must expand complete truth'
  );
  const mobileTopology = await page.evaluate(() => {
    const result = {};
    for (const button of document.querySelectorAll('.workflow-canvas-step-button')) {
      const truth = document.getElementById(button.getAttribute('aria-controls'));
      result[button.getAttribute('data-node-id')] = truth?.textContent ?? '';
    }
    return result;
  });
  assert.match(
    mobileTopology.welcome,
    /Continues to:\s*profile \(Continue\)/,
    'Mobile semantics must expose the welcome edge'
  );
  assert.match(
    mobileTopology.profile,
    /Continues to:\s*confirmation \(Submit\)/,
    'Mobile semantics must expose the profile edge'
  );
  await page.keyboard.press('Space');
  const dialog = page.getByRole('dialog', { name: 'Profile details' });
  await dialog.waitFor();
  const targetsDuringInspection = await assertVisibleMobileTargets(page, 'during inspection');
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent),
    'Close details',
    'Inspect must move focus into the narrow dialog'
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.activeElement?.getAttribute('data-node-id') === 'profile'
  );
  assert.ok(
    await page.getByText(/reference: Profile reference; availability stale/).count(),
    'Semantic fallback must expose evidence state'
  );
  assert.ok(
    await page.getByText(/Comparison — Finding open:/).count(),
    'Semantic fallback must expose comparison truth'
  );
  const lazyImages = await page
    .locator('.workflow-canvas img')
    .evaluateAll(images =>
      images.every(image => image.loading === 'lazy' && image.decoding === 'async')
    );
  assert.equal(
    lazyImages,
    true,
    'All workflow evidence images must be lazy and asynchronously decoded'
  );
  const screenshot = '/tmp/workflow-canvas-393x852.png';
  await page.screenshot({ path: screenshot, fullPage: true });
  receipt.screenshots.push(screenshot);
  receipt.checks.push(
    'real Chromium exact 393x852, container narrow mode, no horizontal overflow, 44px controls'
  );
  receipt.checks.push(
    'semantic-order keyboard traversal, supplied mobile topology, Space inspection, narrow dialog containment, Escape close, deterministic focus return'
  );
  receipt.metrics.mobileViewport = dimensions;
  receipt.metrics.mobileTargets = {
    beforeInspection: targetsBeforeInspection,
    duringInspection: targetsDuringInspection,
  };
  await context.close();
}

async function assertVisibleMobileTargets(page, phase) {
  const targets = await page
    .locator('.workflow-canvas a, .workflow-canvas button')
    .evaluateAll(elements =>
      elements
        .filter(element =>
          element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        )
        .map(element => {
          const bounds = element.getBoundingClientRect();
          return {
            element: element.tagName.toLowerCase(),
            label: element.textContent?.trim().replace(/\s+/g, ' ') ?? '',
            href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
            width: bounds.width,
            height: bounds.height,
          };
        })
    );
  assert.ok(targets.length > 0, `Expected visible WorkflowCanvas targets ${phase}`);
  const undersized = targets.filter(target => target.width < 44 || target.height < 44);
  assert.deepEqual(
    undersized,
    [],
    `Every visible WorkflowCanvas anchor and button must be at least 44x44 ${phase}`
  );
  return targets;
}

async function proveReducedMotion(activeBrowser) {
  const context = await activeBrowser.newContext({
    viewport: { width: 900, height: 760 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/workflow-canvas`, { waitUntil: 'networkidle' });
  await page.locator('.workflow-canvas[data-ready="true"]').waitFor();
  const motion = await page.locator('.workflow-canvas').evaluate(element => {
    const all = [element, ...element.querySelectorAll('*')];
    return all.reduce((maximum, item) => {
      const style = getComputedStyle(item);
      const durations = `${style.animationDuration},${style.transitionDuration}`
        .split(',')
        .map(value => {
          const parsed = Number.parseFloat(value);
          return value.trim().endsWith('ms') ? parsed : parsed * 1000;
        })
        .filter(Number.isFinite);
      return Math.max(maximum, ...durations, 0);
    }, 0);
  });
  assert.ok(motion <= 0.01, `Reduced-motion duration exceeded equivalence threshold: ${motion}ms`);
  receipt.metrics.maximumReducedMotionDurationMs = motion;
  receipt.checks.push(
    'prefers-reduced-motion preserves content with no meaningful animation or transition'
  );
  await context.close();
}

async function proveRepresentativePerformance(activeBrowser) {
  const context = await activeBrowser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/workflow-canvas?representative=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.documentElement.dataset.workflowCanvasRepresentative === 'true'
  );
  await page.locator('.workflow-canvas[data-ready="true"]').waitFor();
  const shape = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.workflow-canvas-node').length,
    edges: document.querySelectorAll('.workflow-canvas-graph__connector').length,
    evidence: document.querySelectorAll(
      '.workflow-canvas-semantic__truth ul[aria-label^="Evidence summary"] > li'
    ).length,
    renderMs: Number(document.documentElement.dataset.workflowCanvasRenderMs),
  }));
  assert.deepEqual(
    { nodes: shape.nodes, edges: shape.edges, evidence: shape.evidence },
    { nodes: 40, edges: 60, evidence: 120 },
    'Representative fixture shape must be 40/60/120'
  );
  const representativeConnectors = await page
    .locator('.workflow-canvas-graph__connector')
    .evaluateAll(elements =>
      elements.map(element => ({
        id: element.getAttribute('data-edge-id'),
        from: element.getAttribute('data-from-node-id'),
        to: element.getAttribute('data-to-node-id'),
      }))
    );
  const expectedConnectors = [
    ...Array.from({ length: 39 }, (_, index) => ({
      id: `chain-${index}`,
      from: `perf-node-${String(index).padStart(2, '0')}`,
      to: `perf-node-${String(index + 1).padStart(2, '0')}`,
    })),
    ...Array.from({ length: 21 }, (_, index) => ({
      id: `branch-${index}`,
      from: `perf-node-${String(index).padStart(2, '0')}`,
      to: `perf-node-${String(index + 2).padStart(2, '0')}`,
    })),
  ];
  assert.deepEqual(
    representativeConnectors,
    expectedConnectors,
    'Representative connectors must preserve all 39 chain and 21 branch edges without adjacency inference'
  );
  assert.ok(
    Number.isFinite(shape.renderMs) && shape.renderMs < 1500,
    `Representative in-page render exceeded 1500ms: ${shape.renderMs}`
  );
  const first = page.locator('.workflow-canvas-step-button[tabindex="0"]');
  await first.focus();
  await first.press('ArrowDown');
  await page.waitForFunction(
    () => document.documentElement.dataset.workflowCanvasSelectionMs !== undefined
  );
  const selectionMs = await page.evaluate(() =>
    Number(document.documentElement.dataset.workflowCanvasSelectionMs)
  );
  assert.ok(
    Number.isFinite(selectionMs) && selectionMs < 100,
    `Representative selection exceeded 100ms: ${selectionMs}`
  );
  receipt.metrics.representative = { ...shape, selectionMs };
  receipt.checks.push(
    'real Chromium representative 40-node/60-edge/120-evidence exact branch topology, render <1500ms, and selection <100ms'
  );
  await context.close();
}

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const selected = typeof address === 'object' && address ? address.port : 0;
      server.close(error => (error ? reject(error) : resolve(selected)));
    });
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`Demo server exited early with ${server.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* server is still starting */
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
