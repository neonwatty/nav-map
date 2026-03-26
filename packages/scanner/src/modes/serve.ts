import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { viewerHtml } from '../viewer/template.js';

export interface ServeOptions {
  jsonPath: string;
  screenshotDir?: string;
  port?: number;
}

export function startServer(options: ServeOptions): http.Server {
  const { jsonPath, screenshotDir, port = 3333 } = options;
  const resolvedJson = path.resolve(jsonPath);

  if (!fs.existsSync(resolvedJson)) {
    throw new Error(`File not found: ${resolvedJson}`);
  }

  const html = viewerHtml('/data.json');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (url.pathname === '/data.json') {
      const data = fs.readFileSync(resolvedJson, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
      return;
    }

    // Serve screenshots if requested
    if (screenshotDir && url.pathname.startsWith('/screenshots/')) {
      const filename = path.basename(url.pathname);
      const filePath = path.join(path.resolve(screenshotDir), filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mime =
          ext === '.png'
            ? 'image/png'
            : ext === '.webp'
              ? 'image/webp'
              : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try: nav-map serve --port ${port + 1}`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, () => {
    console.log(`\nNav Map viewer running at http://localhost:${port}`);
    console.log(`Serving: ${resolvedJson}`);
    console.log('Press Ctrl+C to stop.\n');
  });

  return server;
}
