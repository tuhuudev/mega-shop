import { describe, expect, it } from 'vitest';
import { cn, slugify } from './utils';

describe('slugify', () => {
  it.each([
    ['Áo Thun Nam', 'ao-thun-nam'],
    ['Điện thoại Đẹp', 'dien-thoai-dep'],
    ['  Giày -- thể thao!! 2026 ', 'giay-the-thao-2026'],
    ['Nồi cơm điện 1.8L', 'noi-com-dien-1-8l'],
    ['---', ''],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('cn', () => {
  it('gop class va xu ly xung dot Tailwind', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4');
  });
});
