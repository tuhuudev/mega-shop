import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatVnd } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { DeleteProductButton } from './delete-product-button';

/** Danh sach san pham: bang + link them moi / sua + nut xoa. */

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, slug, created_at')
    .order('created_at', { ascending: false });

  const rows = products ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Sản phẩm</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{rows.length} sản phẩm.</p>
        </div>
        <Link href="/admin/products/new">
          <Button>+ Thêm sản phẩm</Button>
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Tên</th>
              <th className="px-4 py-3 font-semibold">Giá</th>
              <th className="px-4 py-3 font-semibold">Tồn kho</th>
              <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-muted)]">
                  Chưa có sản phẩm nào.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/products/${p.id}`} className="hover:text-[var(--color-primary)]">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-[var(--color-muted)]">{p.slug}</span>
                  </td>
                  <td className="px-4 py-3">{formatVnd(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= 5 ? 'font-semibold text-[var(--color-danger)]' : ''}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/products/${p.id}`}>
                        <Button variant="ghost" size="sm">Sửa</Button>
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
