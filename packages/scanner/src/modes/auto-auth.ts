import type { BrowserContext } from 'playwright';
import { DEFAULT_SELECTORS } from '../config.js';
import type { NavMapAuthSelectors } from '../config.js';

export interface LoginStep {
  action: 'fill' | 'click';
  selector: string;
  value?: string;
}

export function buildLoginSteps(
  email: string,
  password: string,
  selectors?: NavMapAuthSelectors
): LoginStep[] {
  const s = selectors ?? DEFAULT_SELECTORS;
  return [
    { action: 'fill', selector: s.email, value: email },
    { action: 'fill', selector: s.password, value: password },
    { action: 'click', selector: s.submit },
  ];
}

export interface AutoLoginOptions {
  loginUrl: string;
  email: string;
  password: string;
  selectors?: NavMapAuthSelectors;
  timeoutMs?: number;
  headless?: boolean;
}

export async function autoLogin(options: AutoLoginOptions): Promise<BrowserContext> {
  const { loginUrl, email, password, selectors, timeoutMs = 30_000, headless = true } = options;
  const steps = buildLoginSteps(email, password, selectors);

  const pw = await import('playwright');
  const browser = await pw.chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    await page.goto(loginUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });

    for (const step of steps) {
      const locator = page.locator(step.selector).first();
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });

      if (step.action === 'fill') {
        await locator.fill(step.value!);
      } else {
        await locator.click();
      }
    }

    // Wait for navigation after login (page reload or redirect).
    // Use a short timeout for URL change detection — SPAs often stay on the same URL.
    const normalizedLoginUrl = new URL(loginUrl).pathname.replace(/\/+$/, '');
    const urlChanged = await page
      .waitForURL(url => new URL(url).pathname.replace(/\/+$/, '') !== normalizedLoginUrl, {
        timeout: 5_000,
        waitUntil: 'domcontentloaded',
      })
      .then(() => true)
      .catch(() => false);

    if (!urlChanged) {
      // SPA — URL didn't change. Wait for the login form to disappear as a
      // signal that auth succeeded, with a generous timeout.
      const passwordSelector = selectors?.password ?? 'input[type="password"]';
      await page.locator(passwordSelector).first().waitFor({ state: 'hidden', timeout: timeoutMs });
    }
  } catch (err) {
    await browser.close();
    throw new Error(`Auto-login failed: ${err instanceof Error ? err.message : err}`, {
      cause: err,
    });
  }

  await page.close();

  // Return the context (caller is responsible for closing the browser).
  // Attach browser reference so caller can close it later.
  (context as ContextWithBrowser).__browser = browser;
  return context;
}

export interface ContextWithBrowser extends BrowserContext {
  __browser?: import('playwright').Browser;
}

export function closeBrowser(context: BrowserContext): Promise<void> {
  const browser = (context as ContextWithBrowser).__browser;
  if (browser) {
    return browser.close();
  }
  return Promise.resolve();
}
