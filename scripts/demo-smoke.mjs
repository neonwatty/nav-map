import { createRequire } from 'node:module';

const requireFromCwd = createRequire(`${process.cwd()}/package.json`);
const { chromium } = requireFromCwd('playwright');

const explicitBaseUrl = readOption('--url') ?? process.env.DEMO_SMOKE_URL ?? null;
const baseUrl = normalizeBaseUrl(
  explicitBaseUrl ?? (await detectBaseUrl(['http://localhost:3000', 'http://localhost:3001']))
);
const viewport = { width: 858, height: 760 };
const receipt = {
  name: 'nav-map-demo-smoke',
  baseUrl,
  viewport,
  routes: [],
  checks: [],
  warnings: [],
};

await assertDemoServerReady();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
  viewport,
});
const page = await context.newPage();
const messages = [];
const resourceWarnings = new Map();

page.on('console', message => {
  if (message.type() === 'error') {
    const text = message.text();
    if (text.startsWith('Failed to load resource:')) {
      resourceWarnings.set(text, (resourceWarnings.get(text) ?? 0) + 1);
      return;
    }
    messages.push(`console error: ${text}`);
  }
});
page.on('pageerror', error => {
  messages.push(`page error: ${error.message}`);
});

try {
  await smokePrcard();
  await smokeDeckchecker();
  await smokeBleep();
  await smokeInvalidDataset();

  if (messages.length > 0) {
    throw new Error(messages.join('\n'));
  }

  flushResourceWarnings();
  receipt.status = 'pass';
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  flushResourceWarnings();
  receipt.status = 'fail';
  receipt.error = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify(receipt, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

async function smokePrcard() {
  await gotoDataset('prcard', 'PRcard Workflow Atlas');
  await clickButton('Map');
  await expectPreviewSource('saved');

  await expectNodeCard('Home', ['App', 'Saved Preview']);
  await openSearchAndSelect('home', 'Home');
  await expectVisibleText([
    'Page Details',
    'Artifact',
    'App',
    'Review Mode',
    'Real app route',
    'Current Preview',
    'Saved Screenshot',
  ]);
  await expectButton('Open app');
  pass('prcard app node details show real-app review mode and Open app action');

  await expectNodeCard('Quick Setup Concept', ['Prototype', 'Static Reference']);
  await openSearchAndSelect('quick setup concept', 'Quick Setup Concept');
  await expectVisibleText([
    'Surface Details',
    'Artifact',
    'Prototype',
    'Review Mode',
    'Static prototype',
    'Static Reference',
  ]);
  await expectDisabledButton(
    'Open target',
    'Static prototype has no live target. Use the saved preview or add a prototype live URL.'
  );
  pass('prcard prototype node details show static-prototype mode and disabled Open target action');

  await expectNodeCard('Quick Setup HTML Mockup', []);
  await openSearchAndSelect('quick setup html', 'Quick Setup HTML Mockup');
  await expectVisibleText([
    'Surface Details',
    'Artifact',
    'Mockup',
    'Review Mode',
    'HTML mockup',
    'Current Preview',
    'Saved Screenshot',
    'Live Target',
    'Target Configured',
    '/mockups/prcard-quick-setup.html',
  ]);
  await expectButton('Open mockup');
  pass('prcard mockup node details show HTML-mockup mode and Open mockup action');
  pass('search selects PRcard prototype and mockup nodes for details review');

  await openAuditAndFocusIssue();
  pass('audit panel focuses a route-health issue and navigates to it');

  await expectDisabledButton(
    'Animate',
    'Switch to Flow view and choose a recorded flow to animate'
  );
  pass('PRcard map mode explains why flow animation is unavailable');

  await clickButton('Flow');
  await waitForText('Flow: Signed-out activation');
  await clickButton('Animate');
  await waitForText('Animating: Signed-out activation');
  await clickButton('Stop');
  await waitForText('Animate');
  pass('PRcard flow animation starts and stops from the toolbar');

  await clickButton('Map');
  await clickTargetPreview();
  await waitForTargetSummary(text => text.includes('targets:') && !text.includes('checking'));
  await openSearchAndSelect('home', 'Home');
  await expectVisibleText(['Current Preview', 'Saved Fallback', 'Target Preflight', 'Offline']);
  pass('PRcard Target preview shows offline app node status and saved fallback');
  await openSearchAndSelect('quick setup concept', 'Quick Setup Concept');
  await expectVisibleText(['Surface Details', 'Artifact', 'Prototype', 'Static prototype']);
  pass('PRcard Target preview keeps static prototype node status explicit');
  await openSearchAndSelect('quick setup html', 'Quick Setup HTML Mockup');
  await expectVisibleText(['Target Preflight', 'Ready', 'Live Iframe']);
  pass('PRcard Target preview preflight reaches the local HTML mockup');
}

async function smokeDeckchecker() {
  await gotoDataset('deckchecker-speaker', 'Deckchecker Speaker Workflow');
  await expectPreviewSource('saved');
  await expectNodeCard('Landing', []);
  await openSearchAndSelect('landing', 'Landing');
  await expectVisibleText([
    'Page Details',
    'Artifact',
    'App',
    'Current Preview',
    'Saved Screenshot',
  ]);
  pass('Deckchecker app node details show saved app screenshot state');

  await clickTargetPreview();
  await waitForTargetSummary(text =>
    ['unverified', 'offline', 'unavailable'].some(word => text.includes(word))
  );
  await selectNode('Landing');
  await expectNoVisibleText('Target PreflightReady');
  await expectVisibleText(['Live Target', 'Target Preflight']);
  await expectAnyVisibleText(['Unverified External', 'Offline', 'No Target']);
  pass('Deckchecker Target preview reports non-ready external/local target state');
}

async function smokeBleep() {
  await gotoDataset('bleep', 'Bleep That Sh*t!');
  await expectVisibleText(['Scan', 'Routes', 'Screens']);
  await expectNoVisibleText('0 Sections');
  await expectNodeCard('Home', []);
  await openSearchAndSelect('home', 'Home');
  await expectVisibleText(['Page Details', 'Artifact', 'App']);
  pass('Bleep app scan renders as Scan overview and app node details');

  await clickTargetPreview();
  await waitForTargetSummary(text =>
    ['unverified', 'offline', 'unavailable'].some(word => text.includes(word))
  );
  await openSearchAndSelect('home', 'Home');
  await expectVisibleText(['Live Target', 'Target Preflight']);
  await expectAnyVisibleText(['Unverified External', 'Offline', 'No Target']);
  pass('Bleep Target preview reports non-ready external/local target state');
}

async function smokeInvalidDataset() {
  await goto(`${baseUrl}/?dataset=deckchecker&smoke=invalid`, 'PRcard Workflow Atlas');
  await expectVisibleText(['Unknown dataset "deckchecker". Showing PRcard workflow instead.']);
  pass('invalid dataset key shows explicit warning instead of silent fallback');
}

async function gotoDataset(dataset, expectedName) {
  const url = `${baseUrl}/?dataset=${encodeURIComponent(dataset)}&smoke=${encodeURIComponent(
    dataset
  )}`;
  await goto(url, expectedName);
}

async function goto(url, expectedName) {
  receipt.routes.push(url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForText(expectedName, 15000);
  await dismissInitialHelp();
  await waitForText(expectedName, 15000);
  pass(`rendered ${expectedName}`);
}

async function dismissInitialHelp() {
  const exploreMap = page.getByRole('button', { name: 'Explore map' });
  if (await isVisible(exploreMap, 1200)) {
    await exploreMap.click();
  }
}

async function expectPreviewSource(mode) {
  const saved = page.getByRole('button', {
    name: 'Show saved screenshots and static surface images',
  });
  const target = page.getByRole('button', {
    name: 'Try live app or mockup targets where available',
  });
  await saved.waitFor({ state: 'visible', timeout: 10000 });
  await target.waitFor({ state: 'visible', timeout: 10000 });

  const savedPressed = await saved.getAttribute('aria-pressed');
  const targetPressed = await target.getAttribute('aria-pressed');
  if (mode === 'saved' && savedPressed !== 'true') {
    throw new Error(`Expected Saved preview to be active, got ${savedPressed}`);
  }
  if (mode === 'target' && targetPressed !== 'true') {
    throw new Error(`Expected Target preview to be active, got ${targetPressed}`);
  }
  pass(`preview source ${mode} is active`);
}

async function clickTargetPreview() {
  await page
    .getByRole('button', { name: 'Try live app or mockup targets where available' })
    .click();
  await expectPreviewSource('target');
}

async function expectNodeCard(label, fragments) {
  const node = page.locator('.react-flow__node').filter({ hasText: label }).first();
  await node.waitFor({ state: 'visible', timeout: 10000 });
  const text = await node.innerText();
  for (const fragment of fragments) {
    if (!text.includes(fragment)) {
      throw new Error(`Expected node "${label}" to include "${fragment}". Saw: ${text}`);
    }
  }
}

async function selectNode(label) {
  const node = page.locator('.react-flow__node').filter({ hasText: label }).first();
  await node.waitFor({ state: 'visible', timeout: 10000 });
  await node.click();
  await waitForText(label);
}

async function openSearchAndSelect(query, resultLabel) {
  await clickButton('Search');
  const searchInput = page.getByPlaceholder('Search pages...');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(query);
  const results = page.getByRole('group', { name: 'Search results' });
  await results.waitFor({ state: 'visible', timeout: 10000 });
  await results
    .getByRole('button', { name: new RegExp(resultLabel) })
    .first()
    .click();
}

async function openAuditAndFocusIssue() {
  await clickButton('Audit');
  await waitForText('Route Health');
  const issue = page.locator('button').filter({ hasText: 'Suggested fix:' }).first();
  await issue.waitFor({ state: 'visible', timeout: 10000 });
  await issue.click();
  await waitForText('Audit:');
  await tryCloseRouteHealth();
}

async function clickButton(name) {
  const button = page.getByRole('button', { name, exact: true });
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await button.click();
}

async function expectDisabledButton(name, title) {
  const button = page.getByRole('button', { name, exact: true });
  await button.waitFor({ state: 'visible', timeout: 10000 });
  const disabled = await button.isDisabled();
  if (!disabled) {
    throw new Error(`Expected "${name}" button to be disabled`);
  }
  const actualTitle = await button.getAttribute('title');
  if (title && actualTitle !== title) {
    throw new Error(`Expected "${name}" title "${title}". Saw: ${actualTitle}`);
  }
}

async function expectButton(name) {
  const button = page.getByRole('button', { name, exact: true });
  await button.waitFor({ state: 'visible', timeout: 10000 });
  if (await button.isDisabled()) {
    throw new Error(`Expected "${name}" button to be enabled`);
  }
}

async function tryCloseRouteHealth() {
  try {
    await page.getByRole('button', { name: 'Close route health' }).click({ timeout: 1200 });
  } catch {
    receipt.warnings.push(
      'At 858px, the route-health close button can be overlapped by the wrapped toolbar after focusing an issue. Audit focus passed; close-button polish should be handled in a UI slice.'
    );
    await page.keyboard.press('Escape');
    try {
      await page.getByRole('button', { name: 'Audit', exact: true }).click({ timeout: 1200 });
    } catch {
      receipt.warnings.push('Could not close route health with the toolbar Audit toggle.');
    }
  }
}

async function waitForTargetSummary(predicate) {
  const summary = page.getByLabel('Target preflight summary');
  await summary.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[aria-label="Target preflight summary"]');
      return element?.textContent ?? '';
    },
    undefined,
    { timeout: 15000 }
  );

  const start = Date.now();
  while (Date.now() - start < 15000) {
    const text = (await summary.innerText()).toLowerCase();
    if (predicate(text)) {
      pass(`target summary: ${text}`);
      return text;
    }
    await page.waitForTimeout(250);
  }

  throw new Error(
    `Target summary did not reach expected state. Last value: ${await summary.innerText()}`
  );
}

async function expectVisibleText(fragments) {
  const text = (await visibleText()).toLowerCase();
  for (const fragment of fragments) {
    if (!text.includes(fragment.toLowerCase())) {
      throw new Error(`Expected visible text to include "${fragment}"`);
    }
  }
}

async function expectAnyVisibleText(fragments) {
  const text = (await visibleText()).toLowerCase();
  if (!fragments.some(fragment => text.includes(fragment.toLowerCase()))) {
    throw new Error(`Expected visible text to include one of: ${fragments.join(', ')}`);
  }
}

async function expectNoVisibleText(fragment) {
  const text = (await visibleText()).replace(/\s+/g, '');
  if (text.includes(fragment.replace(/\s+/g, ''))) {
    throw new Error(`Expected visible text not to include "${fragment}"`);
  }
}

async function waitForText(text, timeout = 10000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
}

async function visibleText() {
  return page.locator('body').innerText();
}

async function isVisible(locator, timeout) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

function pass(name) {
  receipt.checks.push({ name, status: 'pass' });
}

function flushResourceWarnings() {
  for (const [text, count] of resourceWarnings.entries()) {
    const suffix = count === 1 ? '' : ` (${count} occurrences)`;
    const warning = `Browser resource warning during target preflight: ${text}${suffix}`;
    if (!receipt.warnings.includes(warning)) receipt.warnings.push(warning);
  }
  resourceWarnings.clear();
}

async function assertDemoServerReady() {
  let response;
  try {
    response = await fetch(baseUrl);
  } catch (error) {
    throw new Error(
      `Demo smoke server is not reachable at ${baseUrl}. Start it with "pnpm dev" or set DEMO_SMOKE_URL. ${String(
        error
      )}`
    );
  }

  if (!response.ok) {
    throw new Error(`Demo smoke server returned HTTP ${response.status} at ${baseUrl}`);
  }
}

async function detectBaseUrl(candidates) {
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (response.ok) return candidate;
    } catch {
      // Try the next common local demo port.
    }
  }

  return candidates[0];
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}
