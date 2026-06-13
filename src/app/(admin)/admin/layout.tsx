import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Shell admin: sidebar nav + guard quyen.
 * Server Component: doc profile.role; chi 'staff'/'admin' moi vao duoc, con lai redirect('/').
 * (Bo sung phong thu cho RLS DB — UI khong duoc bay cho khach thuong.)
 */

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Sản phẩm' },
  { href: '/admin/categories', label: 'Danh mục' },
  { href: '/admin/orders', label: 'Đơn hàng' },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <Link href="/admin" className="text-lg font-extrabold tracking-tight text-[var(--color-primary)]">
          Mega<span className="text-[var(--color-text)]">Admin</span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius)] px-3 py-2 text-[var(--color-muted)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-[var(--color-border)] pt-4">
          <Link href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
            ← Về cửa hàng
          </Link>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
