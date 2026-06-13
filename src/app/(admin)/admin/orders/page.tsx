import { formatVnd } from '@/lib/schemas';
import type { OrderStatus } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { OrderStatusSelect } from './order-status-select';

/** Danh sach tat ca don hang (staff doc duoc qua RLS) + doi trang thai. */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_amount, recipient_name, phone, created_at')
    .order('created_at', { ascending: false });

  const rows = orders ?? [];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Đơn hàng</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{rows.length} đơn.</p>

      <div className="mt-6 overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Mã đơn</th>
              <th className="px-4 py-3 font-semibold">Người nhận</th>
              <th className="px-4 py-3 font-semibold">Tổng tiền</th>
              <th className="px-4 py-3 font-semibold">Ngày tạo</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-muted)]">Chưa có đơn hàng.</td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{o.recipient_name}</span>
                    <span className="block text-xs text-[var(--color-muted)]">{o.phone}</span>
                  </td>
                  <td className="px-4 py-3">{formatVnd(o.total_amount)}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect id={o.id} status={o.status as OrderStatus} />
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
