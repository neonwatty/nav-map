import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crawlUrl } from '../modes/crawl.js';

const runBrowserTests = process.env.NAV_MAP_BROWSER_TESTS === '1';

describe.skipIf(!runBrowserTests)('crawlUrl browser integration', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = http.createServer((request, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8');

      if (request.url === '/about') {
        response.end('<title>About</title><h1>About</h1>');
        return;
      }

      if (request.url === '/settings') {
        response.end('<title>Settings</title><h1>Settings</h1>');
        return;
      }

      response.end(`
        <title>Home</title>
        <a href="/about">About</a>
        <button onclick="window.location.href='/settings'">Settings</button>
        <button onclick="window.location.href='/danger'">Delete account</button>
      `);
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('discovers static links and safe click navigations', async () => {
    const graph = await crawlUrl({
      startUrl: baseUrl,
      maxPages: 5,
      maxInteractionsPerPage: 5,
    });

    expect(graph.nodes.map(node => node.route).sort()).toEqual(['/', '/about', '/settings']);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'index',
          target: 'about',
          type: 'link',
          discovery: 'static-link',
        }),
        expect.objectContaining({
          source: 'index',
          target: 'settings',
          type: 'router-push',
          discovery: 'observed-interaction',
        }),
      ])
    );
    expect(graph.nodes.some(node => node.route === '/danger')).toBe(false);
  });
});
