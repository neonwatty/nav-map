import { describe, expect, it } from 'vitest';
import {
  createEdgeId,
  groupFromPath,
  normalizeUrl,
  pathToId,
  resolveDiscoveredNavigations,
  shouldCrawlUrl,
  type DiscoveredNavigation,
} from '../modes/crawl.js';
import fixtureNavigations from './fixtures/dynamic-crawl-navigations.json' with { type: 'json' };

describe('crawl helpers', () => {
  it('normalizes hashes and trailing slashes', () => {
    expect(normalizeUrl('https://example.com/docs/#intro')).toBe('https://example.com/docs');
  });

  it('creates stable route IDs', () => {
    expect(pathToId('/studio/settings')).toBe('studio-settings');
    expect(pathToId('/')).toBe('index');
  });

  it('uses the first route segment as a group', () => {
    expect(groupFromPath('/studio/settings')).toBe('studio');
    expect(groupFromPath('/')).toBe('root');
  });

  it('separates static and observed edge IDs', () => {
    expect(createEdgeId('home', 'settings', 'static-link')).toBe('home->settings:static-link');
    expect(createEdgeId('home', 'settings', 'observed-interaction')).toBe(
      'home->settings:observed-interaction'
    );
  });

  it('only crawls same-origin HTTP URLs', () => {
    expect(shouldCrawlUrl('https://example.com/docs', 'https://example.com')).toBe(true);
    expect(shouldCrawlUrl('https://other.com/docs', 'https://example.com')).toBe(false);
    expect(shouldCrawlUrl('mailto:test@example.com', 'https://example.com')).toBe(false);
  });

  it('resolves fixture navigations into static and observed edges', () => {
    const resolved = resolveDiscoveredNavigations(
      'index',
      'https://example.com/',
      'https://example.com',
      fixtureNavigations as DiscoveredNavigation[]
    );

    expect(resolved.map(item => item.normalizedUrl)).toEqual([
      'https://example.com/docs',
      'https://example.com/app/settings',
    ]);
    expect(resolved.map(item => item.edge)).toEqual([
      expect.objectContaining({
        id: 'index->docs:static-link',
        target: 'docs',
        type: 'link',
        discovery: 'static-link',
      }),
      expect.objectContaining({
        id: 'index->app-settings:observed-interaction',
        target: 'app-settings',
        type: 'router-push',
        discovery: 'observed-interaction',
      }),
    ]);
  });
});
