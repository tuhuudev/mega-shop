import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gop class Tailwind an toan (dedupe + merge xung dot). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Tao slug tu ten (dung cho product/category). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
