import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatVnd } from '@/lib/schemas';
import type { OrderStatus, PaymentStatus } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  shipped: 'Đang giao',
  cancelled: 'Đã huỷ',
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  shipped: 'bg-sky-100 text-sky-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  success: 'Thành công',
  failed: 'Thất bại',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; failed?: string }>;
}

/** Chi tiet don hang: items, tong tien, trang thai don + thanh toan, banner ket qua VNPay. */
export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { paid, failed } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS dam bao chi chu don doc duoc; eq(user_id) cho ro rang.
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, total_amount, recipient_name, phone, address, note, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('id, product_name, unit_price, quantity, line_total')
    .eq('order_id', id);

  // Giao dich thanh toan moi nhat cua don (neu co).
  const { data: payment } = await supabase
    .from('payments')
    .select('status, transaction_no, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const orderStatus = order.status as OrderStatus;
  const canPay = orderStatus === 'pending';

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/orders" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
        ← Quay lại danh sách
      </Link>

      {paid === '1' && (
        <div className="mt-4 rounded-[var(--radius)] border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
          Thanh toán thành công! Cảm ơn bạn đã mua hàng.
        </div>
      )}
      {failed === '1' && (
        <div className="mt-4 rounded-[var(--radius)] border border-rose-300 bg-rose-50 p-4 text-rose-800">
          Thanh toán không thành công hoặc đã bị huỷ. Bạn có thể thử lại.
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Đơn hàng #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-[var(--color-muted)]">{formatDate(order.created_at)}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${ORDER_STATUS_CLASS[orderStatus]}`}
        >
          {ORDER_STATUS_LABEL[orderStatus]}
        </span>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">Sản phẩm</h2>
        <ul className="mt-3 divide-y divide-[var(--color-border)]">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.product_name}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {formatVnd(item.unit_price)} × {item.quantity}
                </p>
              </div>
              <span className="shrink-0 font-medium">{formatVnd(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <span className="font-semibold">Tổng cộng</span>
          <span className="text-lg font-extrabold text-[var(--color-primary)]">
            {formatVnd(order.total_amount)}
          </span>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Giao hàng</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-[var(--color-muted)]">Người nhận:</dt>
              <dd>{order.recipient_name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[var(--color-muted)]">Điện thoại:</dt>
              <dd>{order.phone}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[var(--color-muted)]">Địa chỉ:</dt>
              <dd>{order.address}</dd>
            </div>
            {order.note && (
              <div className="flex gap-2">
                <dt className="text-[var(--color-muted)]">Ghi chú:</dt>
                <dd>{order.note}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold">Thanh toán</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-[var(--color-muted)]">Phương thức:</dt>
              <dd>VNPay</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[var(--color-muted)]">Trạng thái:</dt>
              <dd>{payment ? PAYMENT_STATUS_LABEL[payment.status as PaymentStatus] : 'Chưa có'}</dd>
            </div>
            {payment?.transaction_no && (
              <div className="flex gap-2">
                <dt className="text-[var(--color-muted)]">Mã giao dịch:</dt>
                <dd className="font-mono">{payment.transaction_no}</dd>
              </div>
            )}
          </dl>

          {canPay && (
            <Link href={`/api/payment/vnpay/create?orderId=${order.id}`} className="mt-4 block">
              <Button className="w-full">Thanh toán qua VNPay</Button>
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}
