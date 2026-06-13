import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatVnd } from '@/lib/schemas';
import type { OrderStatus } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  shipped: 'Đang giao',
  cancelled: 'Đã huỷ',
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  shipped: 'bg-sky-100 text-sky-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/** Danh sach don hang cua user dang dang nhap. RLS chi tra don cua chinh ho. */
export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at, status, total_amount')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Đơn hàng của tôi</h1>

      {!orders || orders.length === 0 ? (
        <p className="mt-8 text-center text-[var(--color-muted)]">
          Bạn chưa có đơn hàng nào.{' '}
          <Link href="/" className="text-[var(--color-primary)] hover:underline">
            Mua sắm ngay
          </Link>
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-primary)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-[var(--color-muted)]">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <StatusBadge status={order.status} />
                  <span className="font-semibold">{formatVnd(order.total_amount)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
