import { describe, expect, it } from 'vitest';
import {
  createEdgeId,
  groupFromPath,
  normalizeUrl,
  pathToId,
  shouldCrawlUrl,
} from '../modes/crawl.js';

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
});
