import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

/** Shell storefront: header + footer. Cart agent co the gan badge gio vao day. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <Link href="/" className="text-lg font-medium lowercase tracking-tight text-[var(--color-text)]">
            megashop
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[var(--color-muted)] sm:flex">
            <Link href="/" className="transition-colors hover:text-[var(--color-text)]">Sản phẩm</Link>
            {user && <Link href="/orders" className="transition-colors hover:text-[var(--color-text)]">Đơn hàng</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-5 text-sm text-[var(--color-muted)]">
            <Link href="/cart" className="transition-colors hover:text-[var(--color-text)]">Giỏ hàng</Link>
            {user ? (
              <Link href="/account" className="transition-colors hover:text-[var(--color-text)]">Tài khoản</Link>
            ) : (
              <Link
                href="/login"
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-4 py-1.5 text-[var(--color-text)] transition-colors hover:border-[var(--color-text)]"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">{children}</main>

      <footer className="mt-12 border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-[var(--color-muted)] sm:flex-row">
          <span className="lowercase tracking-tight text-[var(--color-text)]">megashop</span>
          <span>Cà phê · Trà · Phụ kiện pha chế</span>
          <span className="text-xs">Next.js 15 · Supabase · VNPay</span>
        </div>
      </footer>
    </div>
  );
}
