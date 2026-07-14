import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { viewerHtml } from '../viewer/template.js';

export interface ServeReadyInfo {
  url: string;
  port: number;
  jsonPath: string;
}

export interface ServeOptions {
  jsonPath: string;
  screenshotDir?: string;
  viewerAssetDir?: string;
  port?: number;
  /** Number of consecutive ports to try after the requested port is occupied. */
  portFallbacks?: number;
  host?: string;
  onReady?: (info: ServeReadyInfo) => void;
}

const DEFAULT_VIEWER_ASSET_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'viewer');

export function startServer(options: ServeOptions): http.Server {
  const {
    jsonPath,
    screenshotDir,
    viewerAssetDir = DEFAULT_VIEWER_ASSET_DIR,
    port = 3333,
    portFallbacks = 0,
    host,
    onReady,
  } = options;
  const resolvedJson = path.resolve(jsonPath);
  const resolvedScreenshotDir = screenshotDir ? path.resolve(screenshotDir) : undefined;
  const resolvedViewerAssetDir = path.resolve(viewerAssetDir);

  requireFile(resolvedJson, 'Graph file');
  requireFile(path.join(resolvedViewerAssetDir, 'app.js'), 'Viewer JavaScript');
  requireFile(path.join(resolvedViewerAssetDir, 'app.css'), 'Viewer stylesheet');

  const html = viewerHtml({ dataUrl: '/data.json', screenshotBasePath: '' });
  let attemptedPort = port;
  let remainingFallbacks = Math.max(0, portFallbacks);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      sendText(res, 200, 'text/html; charset=utf-8', html);
      return;
    }

    if (url.pathname === '/data.json') {
      sendFile(res, resolvedJson, 'application/json; charset=utf-8');
      return;
    }

    if (url.pathname === '/viewer/app.js' || url.pathname === '/viewer/app.css') {
      const filename = path.basename(url.pathname);
      sendFile(
        res,
        path.join(resolvedViewerAssetDir, filename),
        filename.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8'
      );
      return;
    }

    if (resolvedScreenshotDir && url.pathname.startsWith('/screenshots/')) {
      const screenshotPath = resolveScreenshotPath(resolvedScreenshotDir, url.pathname);
      if (screenshotPath.status === 'forbidden') {
        sendText(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
        return;
      }
      if (screenshotPath.path) {
        sendFile(res, screenshotPath.path, mimeTypeFor(screenshotPath.path));
        return;
      }
    }

    sendText(res, 404, 'text/plain; charset=utf-8', 'Not found');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      if (remainingFallbacks > 0) {
        const occupiedPort = attemptedPort;
        attemptedPort += 1;
        remainingFallbacks -= 1;
        console.warn(`Port ${occupiedPort} is in use; trying ${attemptedPort}.`);
        server.listen(attemptedPort, host);
        return;
      }
      console.error(
        `Port ${attemptedPort} is already in use. Try: nav-map serve --port ${attemptedPort + 1}`
      );
      process.exitCode = 1;
      return;
    }
    console.error('NavMap viewer server failed:', err.message);
    process.exitCode = 1;
  });

  server.listen(attemptedPort, host, () => {
    const address = server.address();
    const resolvedPort = typeof address === 'object' && address ? address.port : port;
    const displayHost = host && host !== '0.0.0.0' && host !== '::' ? host : 'localhost';
    const url = `http://${displayHost}:${resolvedPort}`;
    const ready = { url, port: resolvedPort, jsonPath: resolvedJson };

    console.log(`\nNavMap viewer running at ${url}`);
    console.log(`Serving: ${resolvedJson}`);
    console.log('Press Ctrl+C to stop.\n');
    onReady?.(ready);
  });

  return server;
}

function requireFile(filePath: string, label: string): void {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function resolveScreenshotPath(
  screenshotRoot: string,
  requestPath: string
): { status: 'ok' | 'forbidden'; path?: string } {
  let relativePath: string;
  try {
    relativePath = decodeURIComponent(requestPath.slice('/screenshots/'.length));
  } catch {
    return { status: 'forbidden' };
  }

  if (!relativePath || relativePath.includes('\0')) return { status: 'forbidden' };

  const resolvedRoot = path.resolve(screenshotRoot);
  const candidate = path.resolve(resolvedRoot, relativePath);
  if (!isWithin(resolvedRoot, candidate)) return { status: 'forbidden' };
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return { status: 'ok', path: candidate };
  }

  // Preserve the previous --screenshot-dir behavior for callers that point at a leaf directory.
  const legacyCandidate = path.join(resolvedRoot, path.basename(relativePath));
  if (fs.existsSync(legacyCandidate) && fs.statSync(legacyCandidate).isFile()) {
    return { status: 'ok', path: legacyCandidate };
  }

  return { status: 'ok' };
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function mimeTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function sendText(
  response: http.ServerResponse,
  status: number,
  contentType: string,
  body: string
): void {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

function sendFile(response: http.ServerResponse, filePath: string, contentType: string): void {
  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(filePath).pipe(response);
}
