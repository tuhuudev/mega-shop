import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

/** Shell storefront: header + footer. Cart agent co the gan badge gio vao day. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-[var(--color-primary)]">
            Mega<span className="text-[var(--color-text)]">Shop</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-[var(--color-muted)]">
            <Link href="/" className="hover:text-[var(--color-text)]">Sản phẩm</Link>
            {user && <Link href="/orders" className="hover:text-[var(--color-text)]">Đơn hàng</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/cart" className="hover:text-[var(--color-primary)]">Giỏ hàng</Link>
            {user ? (
              <Link href="/account" className="hover:text-[var(--color-primary)]">Tài khoản</Link>
            ) : (
              <Link href="/login" className="rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-primary-fg)]">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>

      <footer className="border-t border-[var(--color-border)] py-8 text-center text-sm text-[var(--color-muted)]">
        Mega Shop · Next.js 15 + Supabase + VNPay
      </footer>
    </div>
  );
}
