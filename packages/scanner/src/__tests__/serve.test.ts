import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer } from '../modes/serve.js';

const servers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      server =>
        new Promise<void>(resolve => {
          server.close(() => resolve());
        })
    )
  );
});

describe('complete viewer server', () => {
  it('serves the full viewer assets, graph, and nested screenshots', async () => {
    const fixture = createFixture();
    const server = startServer({
      jsonPath: fixture.graphPath,
      screenshotDir: fixture.screenshotDir,
      viewerAssetDir: fixture.viewerAssetDir,
      host: '127.0.0.1',
      port: 0,
    });
    servers.push(server);
    await once(server, 'listening');
    const baseUrl = serverUrl(server);

    const [html, script, styles, graph, nestedScreenshot, legacyScreenshot] = await Promise.all([
      fetch(`${baseUrl}/`),
      fetch(`${baseUrl}/viewer/app.js`),
      fetch(`${baseUrl}/viewer/app.css`),
      fetch(`${baseUrl}/data.json`),
      fetch(`${baseUrl}/screenshots/nested/home.png`),
      fetch(`${baseUrl}/screenshots/legacy/home.png`),
    ]);

    expect(html.status).toBe(200);
    expect(await html.text()).toContain('<script src="/viewer/app.js"></script>');
    expect(script.status).toBe(200);
    expect(await script.text()).toContain('complete-viewer-fixture');
    expect(styles.status).toBe(200);
    expect(await styles.text()).toContain('.complete-viewer-fixture');
    expect(graph.status).toBe(200);
    const graphBody = (await graph.json()) as { meta: { name: string } };
    expect(graphBody.meta.name).toBe('Serve fixture');
    expect(nestedScreenshot.status).toBe(200);
    expect(await nestedScreenshot.text()).toBe('nested-image');
    expect(legacyScreenshot.status).toBe(200);
    expect(await legacyScreenshot.text()).toBe('legacy-image');
  });

  it('rejects screenshot traversal and reports missing assets before listening', async () => {
    const fixture = createFixture();
    const server = startServer({
      jsonPath: fixture.graphPath,
      screenshotDir: fixture.screenshotDir,
      viewerAssetDir: fixture.viewerAssetDir,
      host: '127.0.0.1',
      port: 0,
    });
    servers.push(server);
    await once(server, 'listening');

    const traversal = await fetch(`${serverUrl(server)}/screenshots/%2e%2e%2fsecret.png`);
    expect(traversal.status).toBe(403);

    expect(() =>
      startServer({
        jsonPath: fixture.graphPath,
        viewerAssetDir: path.join(fixture.root, 'missing-viewer'),
        port: 0,
      })
    ).toThrow('Viewer JavaScript not found');
  });

  it('uses a bounded consecutive-port fallback when explicitly requested', async () => {
    const occupied = http.createServer((_request, response) => response.end('occupied'));
    servers.push(occupied);
    occupied.listen(0, '127.0.0.1');
    await once(occupied, 'listening');
    const address = occupied.address();
    if (!address || typeof address === 'string') throw new Error('Expected occupied TCP port');

    const fixture = createFixture();
    const viewer = startServer({
      jsonPath: fixture.graphPath,
      viewerAssetDir: fixture.viewerAssetDir,
      host: '127.0.0.1',
      port: address.port,
      portFallbacks: 10,
    });
    servers.push(viewer);
    await new Promise<void>(resolve => viewer.once('listening', resolve));

    const viewerAddress = viewer.address();
    if (!viewerAddress || typeof viewerAddress === 'string') {
      throw new Error('Expected viewer TCP port');
    }
    expect(viewerAddress.port).toBeGreaterThan(address.port);
    expect((await fetch(serverUrl(viewer))).status).toBe(200);
  });
});

function createFixture(): {
  root: string;
  graphPath: string;
  screenshotDir: string;
  viewerAssetDir: string;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-serve-'));
  const graphPath = path.join(root, 'nav-map.json');
  const screenshotDir = path.join(root, 'screenshots');
  const viewerAssetDir = path.join(root, 'viewer');

  fs.mkdirSync(path.join(screenshotDir, 'nested'), { recursive: true });
  fs.mkdirSync(viewerAssetDir, { recursive: true });
  fs.writeFileSync(
    graphPath,
    JSON.stringify({
      version: '1.0',
      meta: { name: 'Serve fixture', generatedAt: '2026-07-13', generatedBy: 'manual' },
      nodes: [{ id: 'home', route: '/', label: 'Home', group: 'main' }],
      edges: [],
      groups: [{ id: 'main', label: 'Main' }],
    })
  );
  fs.writeFileSync(path.join(viewerAssetDir, 'app.js'), 'complete-viewer-fixture');
  fs.writeFileSync(path.join(viewerAssetDir, 'app.css'), '.complete-viewer-fixture {}');
  fs.writeFileSync(path.join(screenshotDir, 'nested', 'home.png'), 'nested-image');
  fs.writeFileSync(path.join(screenshotDir, 'home.png'), 'legacy-image');

  return { root, graphPath, screenshotDir, viewerAssetDir };
}

function serverUrl(server: http.Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP server address');
  return `http://127.0.0.1:${address.port}`;
}
