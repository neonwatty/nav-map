export interface ViewerHtmlOptions {
  dataUrl?: string;
  screenshotBasePath?: string;
}

export function viewerHtml(options: ViewerHtmlOptions | string = {}): string {
  const normalized = typeof options === 'string' ? { dataUrl: options } : options;
  const dataUrl = normalized.dataUrl ?? '/data.json';
  const screenshotBasePath = normalized.screenshotBasePath ?? '';
  const config = JSON.stringify({ dataUrl, screenshotBasePath }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <title>NavMap</title>
    <link rel="stylesheet" href="/viewer/app.css" />
  </head>
  <body>
    <div id="root">
      <main class="nav-map-viewer-status" role="status">Loading NavMap…</main>
    </div>
    <script>window.__NAV_MAP_VIEWER__=${config};</script>
    <script src="/viewer/app.js"></script>
  </body>
</html>`;
}
