import fs from 'node:fs';
import path from 'node:path';
import { optimizeScreenshot } from './optimize.js';

export async function captureScreenshots(
  routes: { route: string; id: string }[],
  baseUrl: string,
  outputDir: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Skip dynamic routes (containing [param])
  const staticRoutes = routes.filter(r => !r.route.includes('['));

  if (staticRoutes.length === 0) {
    console.log('  No static routes to screenshot');
    return results;
  }

  let browser;
  try {
    // Dynamic import to make playwright optional
    const pw = await import('playwright');
    browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    for (const { route, id } of staticRoutes) {
      const url = `${baseUrl.replace(/\/$/, '')}${route}`;
      console.log(`  Capturing ${url}...`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(500);

        const rawPath = path.join(outputDir, `${id}-raw.png`);
        await page.screenshot({ path: rawPath, fullPage: false });

        // Optimize: resize to 320x200 WebP
        const optimizedPath = path.join(outputDir, `${id}.webp`);
        await optimizeScreenshot(rawPath, optimizedPath);

        // Clean up raw
        fs.unlinkSync(rawPath);

        results.set(id, optimizedPath);
      } catch (err) {
        console.warn(`  Warning: Failed to capture ${url}: ${err}`);
      }
    }

    await context.close();
  } catch (err) {
    console.warn(`  Warning: Playwright not available, skipping screenshots: ${err}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}
