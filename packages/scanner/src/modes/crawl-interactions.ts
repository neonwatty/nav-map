import type { DiscoveredNavigation } from './crawl.js';
import {
  dedupeInteractionCandidates,
  isSafeInteractionText,
  type InteractiveCandidate,
} from './interaction-filter.js';

function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    url.pathname = pathname;
    return url.toString();
  } catch {
    return raw;
  }
}

export async function discoverInteractiveNavigations(
  page: import('playwright').Page,
  currentUrl: string,
  maxInteractions: number,
  filterOptions: { include?: string[]; exclude?: string[] }
): Promise<DiscoveredNavigation[]> {
  const results: DiscoveredNavigation[] = [];

  for (let index = 0; index < maxInteractions; index++) {
    const candidates = dedupeInteractionCandidates(await markInteractiveCandidates(page)).filter(
      candidate => isSafeInteractionText(candidate.text, filterOptions)
    );
    const candidate = candidates[index];
    if (!candidate) break;

    try {
      await page.locator(`[data-nav-map-candidate="${candidate.id}"]`).click({ timeout: 1_000 });
      await page.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(150);

      if (normalizeUrl(page.url()) !== normalizeUrl(currentUrl)) {
        results.push({
          href: normalizeUrl(page.url()),
          text: candidate.text,
          discovery: 'observed-interaction',
        });
        await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      }
    } catch {
      if (normalizeUrl(page.url()) !== normalizeUrl(currentUrl)) {
        await page
          .goto(currentUrl, { waitUntil: 'networkidle', timeout: 30_000 })
          .catch(() => undefined);
      }
    }
  }

  return results;
}

async function markInteractiveCandidates(
  page: import('playwright').Page
): Promise<InteractiveCandidate[]> {
  return page.evaluate(`() => {
    const selector = [
      'button',
      '[role="button"]',
      '[role="link"]',
      '[data-href]',
      '[data-url]',
      '[onclick]',
    ].join(',');

    return Array.from(document.querySelectorAll(selector))
      .filter((element, index) => {
        if (element.closest('a[href]')) return false;
        if (element.hasAttribute('disabled')) return false;
        if (element.getAttribute('aria-disabled') === 'true') return false;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        element.dataset.navMapCandidate = String(index);
        return true;
      })
      .map(element => ({
        id: element.dataset.navMapCandidate ?? '',
        text:
          element.getAttribute('aria-label') ??
          element.getAttribute('title') ??
          element.textContent?.trim() ??
          '',
      }));
  }`) as Promise<InteractiveCandidate[]>;
}
