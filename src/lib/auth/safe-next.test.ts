import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps internal paths', () => {
    expect(safeNext('/cart')).toBe('/cart');
    expect(safeNext('/products/ao-thun?size=M#reviews')).toBe('/products/ao-thun?size=M#reviews');
  });

  it.each([
    null,
    '',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\\/evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    'javascript:alert(1)',
  ])('falls back to /account for %j', (input) => {
    expect(safeNext(input)).toBe('/account');
  });
});
