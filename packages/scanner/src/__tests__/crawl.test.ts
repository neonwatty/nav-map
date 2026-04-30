import { describe, expect, it } from 'vitest';
import { groupFromPath, normalizeUrl, pathToId } from '../modes/crawl.js';

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
});
