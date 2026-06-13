import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Không tìm thấy trang' };

/** Trang 404 toi gian, dong bo voi storefront (kem am, don sac, airy). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link
        href="/"
        className="absolute top-6 left-6 text-lg font-medium lowercase tracking-tight text-[var(--color-text)] transition-opacity hover:opacity-60"
      >
        megashop
      </Link>

      <p className="font-display text-7xl text-[var(--color-text)] sm:text-8xl">404</p>
      <h1 className="mt-6 text-lg font-medium text-[var(--color-text)]">
        Không tìm thấy trang
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
        Trang bạn tìm không tồn tại hoặc đã được chuyển đi. Hãy quay lại cửa hàng.
      </p>

      <Link
        href="/"
        className="mt-8 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-text)]"
      >
        ← Về trang chủ
      </Link>
    </div>
  );
}
