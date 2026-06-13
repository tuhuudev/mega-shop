import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3',
        'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]',
        className,
      )}
      {...props}
    />
  );
}
