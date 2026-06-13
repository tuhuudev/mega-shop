import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatVnd } from '@/lib/schemas';
import { getCart, updateQty, removeItem } from '@/lib/cart/actions';

/** Trang gio hang (server component). Doc gio + thao tac qua Server Action. */
export default async function CartPage() {
  const { lines, total } = await getCart();

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-extrabold">Giỏ hàng trống</h1>
        <p className="mt-2 text-[var(--color-muted)]">Chưa có sản phẩm nào trong giỏ.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-primary-fg)]"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="mb-5 text-2xl font-extrabold">Giỏ hàng</h1>
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={line.product_id}>
              <Card className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-[var(--color-bg)]">
                  {line.image_url ? (
                    <Image
                      src={line.image_url}
                      alt={line.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{line.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">{formatVnd(line.price)}</p>
                </div>

                {/* Bo dem so luong — moi nut la 1 Server Action bound. */}
                <div className="flex items-center gap-2">
                  <form action={updateQty.bind(null, line.product_id, line.quantity - 1)}>
                    <Button type="submit" variant="ghost" size="sm" aria-label="Giảm">
                      −
                    </Button>
                  </form>
                  <span className="w-8 text-center tabular-nums font-medium">{line.quantity}</span>
                  <form action={updateQty.bind(null, line.product_id, line.quantity + 1)}>
                    <Button type="submit" variant="ghost" size="sm" aria-label="Tăng">
                      +
                    </Button>
                  </form>
                </div>

                <div className="w-28 text-right font-semibold tabular-nums">
                  {formatVnd(line.line_total)}
                </div>

                <form action={removeItem.bind(null, line.product_id)}>
                  <Button type="submit" variant="danger" size="sm" aria-label="Xoá">
                    Xoá
                  </Button>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <h2 className="text-lg font-bold">Tổng cộng</h2>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
            <span className="text-[var(--color-muted)]">Tạm tính</span>
            <span className="text-xl font-extrabold tabular-nums text-[var(--color-primary)]">
              {formatVnd(total)}
            </span>
          </div>
          <Link
            href="/checkout"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] font-semibold text-[var(--color-primary-fg)] hover:brightness-95"
          >
            Thanh toán
          </Link>
        </Card>
      </aside>
    </div>
  );
}
