import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromCwd = createRequire(`${process.cwd()}/package.json`);
const { chromium } = requireFromCwd('playwright');

const explicitBaseUrl = readOption('--url') ?? process.env.LANDING_SMOKE_URL ?? null;
const baseUrl = normalizeBaseUrl(
  explicitBaseUrl ?? (await detectBaseUrl(['http://localhost:3000', 'http://localhost:4174']))
);
const rootDir = process.env.INIT_CWD ?? process.cwd();
const artifactDir = path.resolve(
  rootDir,
  readOption('--artifact-dir') ?? process.env.LANDING_SMOKE_ARTIFACT_DIR ?? '.nav-map/artifacts'
);
const deploymentBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const deploymentHeaders = readDeploymentHeaders(deploymentBypassSecret);

const receipt = {
  name: 'nav-map-landing-page-smoke',
  baseUrl,
  artifactDir,
  routes: [],
  checks: [],
  screenshots: [],
  warnings: [],
};

await assertServerReady();
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const browserErrors = [];

try {
  await smokeLandingDesktop();
  await smokeLandingMobile();
  await smokeDemoRoute();
  await smokeRootDatasetRedirect();

  if (browserErrors.length > 0) {
    throw new Error(browserErrors.join('\n'));
  }

  receipt.status = 'pass';
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  receipt.status = 'fail';
  receipt.error = redactBypassUrl(error instanceof Error ? error.message : String(error));
  process.stderr.write(`${JSON.stringify(receipt, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

async function smokeLandingDesktop() {
  const page = await openPage('/', { width: 1440, height: 960 });
  await expectVisibleText(page, [
    'NavMap',
    'Workflow atlas for agents',
    'Open demo',
    'pnpm add @neonwatty/nav-map',
    'Prototype, live app, and HTML mockup review in one place.',
  ]);
  await expectHeroLayout(page, 'desktop');
  await screenshot(page, 'landing-desktop.png');
  await page.close();
  pass('desktop landing page renders content, media, and no hero overlap');
}

async function smokeLandingMobile() {
  const page = await openPage('/', { width: 390, height: 844 });
  await expectVisibleText(page, ['NavMap', 'Workflow atlas for agents', 'Open demo']);
  await expectHeroLayout(page, 'mobile');
  await expectSelectorInFirstViewport(page, '.landing-band');
  await screenshot(page, 'landing-mobile.png');
  await page.close();
  pass('mobile landing page renders without overlap and reveals next section');
}

async function smokeDemoRoute() {
  const page = await openPage('/demo?dataset=prcard', { width: 858, height: 760 });
  await expectVisibleText(page, ['PRcard Workflow Atlas']);
  await page.close();
  pass('canonical /demo route renders interactive PRcard workflow');
}

async function smokeRootDatasetRedirect() {
  const page = await openPage('/?dataset=prcard&smoke=landing-compat', {
    width: 858,
    height: 760,
  });
  await expectVisibleText(page, ['PRcard Workflow Atlas']);
  const finalUrl = new URL(page.url());
  if (finalUrl.pathname !== '/demo' || finalUrl.searchParams.get('dataset') !== 'prcard') {
    throw new Error(
      `Expected root dataset URL to redirect to /demo?dataset=prcard. Saw ${redactBypassUrl(
        page.url()
      )}`
    );
  }
  await page.close();
  pass('root dataset URL redirects to canonical /demo route');
}

async function openPage(pathname, viewport) {
  const page = await browser.newPage({ viewport, extraHTTPHeaders: deploymentHeaders });
  page.on('console', message => {
    if (message.type() === 'error') {
      browserErrors.push(`${pathname} console error: ${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    browserErrors.push(`${pathname} page error: ${error.message}`);
  });

  const publicUrl = `${baseUrl}${pathname}`;
  receipt.routes.push(publicUrl);
  const response = await page.goto(withDeploymentBypass(publicUrl), {
    waitUntil: 'domcontentloaded',
  });
  if (!response?.ok()) {
    throw new Error(
      `Expected ${publicUrl} to return 2xx. Saw ${response?.status() ?? 'no response'}`
    );
  }
  await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });
  return page;
}

async function expectHeroLayout(page, mode) {
  const hero = page.locator('.landing-hero');
  const title = page.locator('#hero-title');
  const preview = page.locator('.preview-frame');
  await hero.waitFor({ state: 'visible', timeout: 10000 });
  await title.waitFor({ state: 'visible', timeout: 10000 });
  await preview.waitFor({ state: 'visible', timeout: 10000 });

  const [titleBox, previewBox] = await Promise.all([title.boundingBox(), preview.boundingBox()]);
  if (!titleBox || !previewBox) throw new Error('Could not measure hero title and preview.');

  if (boxesOverlap(titleBox, previewBox)) {
    throw new Error(`Hero title overlaps preview in ${mode} layout.`);
  }

  const previewImageCount = await page.locator('.hero-preview img').count();
  if (previewImageCount < 1) {
    throw new Error(`Expected at least one real product image in ${mode} hero.`);
  }
}

async function expectSelectorInFirstViewport(page, selector) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error(`Could not measure "${selector}".`);
  if (box.y >= viewport.height) {
    throw new Error(`Expected "${selector}" to be visible in first viewport.`);
  }
}

async function expectVisibleText(page, fragments) {
  await page.waitForFunction(
    expectedFragments =>
      expectedFragments.every(fragment =>
        (document.body.textContent ?? '').toLowerCase().includes(fragment.toLowerCase())
      ),
    fragments,
    { timeout: 15000 }
  );

  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const fragment of fragments) {
    if (!text.includes(fragment.toLowerCase())) {
      throw new Error(`Expected visible text to include "${fragment}"`);
    }
  }
}

async function screenshot(page, fileName) {
  const filePath = path.join(artifactDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  receipt.screenshots.push(filePath);
}

async function assertServerReady() {
  let response;
  try {
    response = await fetch(withDeploymentBypass(baseUrl), { headers: deploymentHeaders });
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error ? ` ${error.cause.message}` : '';
    throw new Error(
      `Landing smoke server is not reachable at ${baseUrl}. Start it first or set LANDING_SMOKE_URL. ${String(
        error
      )}${cause}`
    );
  }

  if (!response.ok) {
    throw new Error(`Landing smoke server returned HTTP ${response.status} at ${baseUrl}`);
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

function boxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function pass(name) {
  receipt.checks.push({ name, status: 'pass' });
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}

function readDeploymentHeaders(bypassSecret) {
  if (!bypassSecret) return {};

  return {
    'x-vercel-protection-bypass': bypassSecret,
    'x-vercel-set-bypass-cookie': 'true',
  };
}

function withDeploymentBypass(url) {
  if (!deploymentBypassSecret) return url;

  const nextUrl = new URL(url);
  nextUrl.searchParams.set('x-vercel-protection-bypass', deploymentBypassSecret);
  nextUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');
  return nextUrl.toString();
}

function redactBypassUrl(value) {
  if (!deploymentBypassSecret) return value;
  return value.replaceAll(deploymentBypassSecret, '[redacted-vercel-bypass]');
}
