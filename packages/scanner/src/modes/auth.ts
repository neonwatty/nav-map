import fs from 'node:fs';
import path from 'node:path';

export interface AuthOptions {
  url: string;
  output: string;
}

export async function runAuth(options: AuthOptions): Promise<void> {
  const { url, output } = options;
  const outputPath = path.resolve(output);

  const pw = await import('playwright');
  const browser = await pw.chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Expose a function the page can call to signal "done"
  let saveResolve: () => void;
  const savePromise = new Promise<void>(resolve => {
    saveResolve = resolve;
  });

  await page.exposeFunction('__navMapSaveAuth', () => {
    saveResolve!();
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Inject a floating "Save & Close" button
  await page.evaluate(`(() => {
    const btn = document.createElement('button');
    btn.textContent = '\\u2713 Save Auth & Close';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;padding:12px 24px;font-size:16px;font-weight:700;background:#3355aa;color:#fff;border:none;border-radius:8px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    btn.addEventListener('click', () => window.__navMapSaveAuth());
    document.body.appendChild(btn);
  })()`);

  console.log('Browser opened. Log in, then click "Save Auth & Close".');
  console.log('Or press Ctrl+C to save and exit.\n');

  // SIGINT fallback
  const sigintHandler = () => {
    console.log('\nSaving auth state...');
    saveResolve!();
  };
  process.on('SIGINT', sigintHandler);

  await savePromise;
  process.off('SIGINT', sigintHandler);

  // Save storageState
  const state = await context.storageState();
  fs.writeFileSync(outputPath, JSON.stringify(state, null, 2));
  console.log(`Auth state saved to ${outputPath}`);

  await browser.close();
}
