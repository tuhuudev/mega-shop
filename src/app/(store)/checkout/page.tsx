import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatVnd } from '@/lib/schemas';
import { getCart, placeOrder } from '@/lib/cart/actions';

/**
 * Trang checkout (server component): tom tat don + form nguoi nhan.
 * Submit -> Server Action handleCheckout -> placeOrder (validate bang checkoutSchema).
 */
export default async function CheckoutPage() {
  const { lines, total } = await getCart();

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-extrabold">Giỏ hàng trống</h1>
        <p className="mt-2 text-[var(--color-muted)]">Hãy thêm sản phẩm trước khi thanh toán.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-primary-fg)]"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  // Inline Server Action: doc FormData -> goi placeOrder (validate + RPC + redirect).
  async function handleCheckout(formData: FormData) {
    'use server';
    const note = (formData.get('note') as string | null)?.trim();
    await placeOrder({
      recipient_name: ((formData.get('recipient_name') as string | null) ?? '').trim(),
      phone: ((formData.get('phone') as string | null) ?? '').trim(),
      address: ((formData.get('address') as string | null) ?? '').trim(),
      note: note ? note : undefined,
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="mb-5 text-2xl font-extrabold">Thanh toán</h1>
        <Card>
          <form action={handleCheckout} className="space-y-4">
            <div>
              <label htmlFor="recipient_name" className="mb-1 block text-sm font-medium">
                Họ tên người nhận
              </label>
              <Input id="recipient_name" name="recipient_name" required minLength={2} autoComplete="name" />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                Số điện thoại
              </label>
              <Input
                id="phone"
                name="phone"
                required
                inputMode="tel"
                pattern="0\d{9}"
                placeholder="0xxxxxxxxx"
                autoComplete="tel"
              />
            </div>

            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium">
                Địa chỉ giao hàng
              </label>
              <Input id="address" name="address" required minLength={5} autoComplete="street-address" />
            </div>

            <div>
              <label htmlFor="note" className="mb-1 block text-sm font-medium">
                Ghi chú <span className="text-[var(--color-muted)]">(không bắt buộc)</span>
              </label>
              <textarea
                id="note"
                name="note"
                maxLength={500}
                rows={3}
                className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
              />
            </div>

            <Button type="submit" className="w-full">
              Đặt hàng & thanh toán
            </Button>
          </form>
        </Card>
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <h2 className="text-lg font-bold">Đơn hàng</h2>
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.product_id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {line.name}
                  <span className="text-[var(--color-muted)]"> × {line.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium">{formatVnd(line.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
            <span className="text-[var(--color-muted)]">Tổng cộng</span>
            <span className="text-xl font-extrabold tabular-nums text-[var(--color-primary)]">
              {formatVnd(total)}
            </span>
          </div>
          <Link
            href="/cart"
            className="mt-4 block text-center text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            ← Quay lại giỏ hàng
          </Link>
        </Card>
      </aside>
    </div>
  );
}
