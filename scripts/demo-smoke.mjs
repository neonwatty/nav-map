import { createRequire } from 'node:module';

const requireFromCwd = createRequire(`${process.cwd()}/package.json`);
const { chromium } = requireFromCwd('playwright');

const baseUrl = process.env.DEMO_SMOKE_URL ?? 'http://127.0.0.1:4174';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const messages = [];

page.on('console', message => {
  if (message.type() === 'error') {
    messages.push(`console error: ${message.text()}`);
  }
});
page.on('pageerror', error => {
  messages.push(`page error: ${error.message}`);
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Start Here' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Explore map' }).click();

  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByPlaceholder('Search pages...').fill('studio');
  await page
    .getByRole('button', { name: /Studio/ })
    .first()
    .waitFor();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Flow' }).click();
  await page.getByRole('combobox', { name: 'Flow' }).waitFor();
  await page.getByText(/^Flow: /).waitFor();
  await page.getByRole('button', { name: 'Animate' }).waitFor();

  await page.getByRole('button', { name: 'Audit' }).click();
  await page.getByText('Route Health').waitFor();
  await page
    .getByText(/Suggested fix:/)
    .first()
    .waitFor();
  await page.getByRole('button', { name: 'Close route health' }).click();

  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByText('Help').waitFor();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('button', { name: 'Copy view summary' }).click();
  await page.getByRole('button', { name: 'Copied view summary' }).waitFor();
  const copiedSummary = await page.evaluate(() => navigator.clipboard.readText());
  if (
    !copiedSummary.includes('Nav Map: ') ||
    !copiedSummary.includes('View: flow') ||
    !copiedSummary.includes('Flow: ')
  ) {
    throw new Error(`Unexpected copied view summary: ${copiedSummary}`);
  }

  if (messages.length > 0) {
    throw new Error(messages.join('\n'));
  }
} finally {
  await browser.close();
}
