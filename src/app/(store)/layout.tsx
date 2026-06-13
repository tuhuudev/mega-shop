import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

/** Shell storefront: header + footer. Cart agent co the gan badge gio vao day. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)]/70 bg-[var(--color-bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-7 px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-ink)] font-display text-lg italic text-[var(--color-ink-fg)] transition-transform group-hover:-rotate-6">
              M
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              Mega<span className="italic text-[var(--color-primary)]">shop</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-muted)] sm:flex">
            <Link href="/" className="relative py-1 transition-colors hover:text-[var(--color-text)]">Sản phẩm</Link>
            {user && <Link href="/orders" className="transition-colors hover:text-[var(--color-text)]">Đơn hàng</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 text-sm font-medium">
            <Link
              href="/cart"
              className="rounded-full px-3.5 py-2 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
            >
              Giỏ hàng
            </Link>
            {user ? (
              <Link
                href="/account"
                className="rounded-full px-3.5 py-2 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
              >
                Tài khoản
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[var(--color-ink)] px-5 py-2.5 font-semibold text-[var(--color-ink-fg)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">{children}</main>

      <footer className="mt-8 border-t border-[var(--color-border)]/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-[var(--color-muted)] sm:flex-row">
          <span className="font-display text-lg italic text-[var(--color-text)]">Megashop</span>
          <span>Cà phê · Trà · Phụ kiện pha chế — rang xay mỗi ngày.</span>
          <span className="text-xs">Next.js 15 · Supabase · VNPay</span>
        </div>
      </footer>
    </div>
  );
}
