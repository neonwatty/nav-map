import { describe, it, expect } from 'vitest';
import { getGroupColors, darkGroupColors, lightGroupColors } from './colors';

describe('getGroupColors', () => {
  it('returns dark colors for known group in dark mode', () => {
    const colors = getGroupColors('marketing', true);
    expect(colors).toEqual(darkGroupColors.marketing);
  });

  it('returns light colors for known group in light mode', () => {
    const colors = getGroupColors('marketing', false);
    expect(colors).toEqual(lightGroupColors.marketing);
  });

  it('returns fallback for unknown group in dark mode', () => {
    const colors = getGroupColors('unknown-group', true);
    expect(colors.bg).toBe('#1e1e2a');
    expect(colors.border).toBe('#888');
  });

  it('returns fallback for unknown group in light mode', () => {
    const colors = getGroupColors('unknown-group', false);
    expect(colors.bg).toBe('#f0f0f4');
    expect(colors.border).toBe('#888');
  });

  it('handles all predefined groups', () => {
    const groups = ['marketing', 'product', 'studio', 'premium', 'auth', 'legal'];
    for (const group of groups) {
      const dark = getGroupColors(group, true);
      const light = getGroupColors(group, false);
      expect(dark.bg).toBeTruthy();
      expect(light.bg).toBeTruthy();
      expect(dark).not.toEqual(light);
    }
  });
});

describe('getGroupColors with overrides', () => {
  it('uses override when provided for known group', () => {
    const override = { marketing: { bg: '#000', border: '#fff', text: '#abc' } };
    const colors = getGroupColors('marketing', true, override);
    expect(colors).toEqual({ bg: '#000', border: '#fff', text: '#abc' });
  });

  it('falls back to built-in when override does not cover group', () => {
    const override = { marketing: { bg: '#000', border: '#fff', text: '#abc' } };
    const colors = getGroupColors('product', true, override);
    expect(colors).toEqual(darkGroupColors.product);
  });

  it('works with no override (backward-compatible)', () => {
    const colors = getGroupColors('marketing', true);
    expect(colors).toEqual(darkGroupColors.marketing);
  });
});
