'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
// Contract path owned by Cart agent. Server action: addToCart(productId, quantity?).
import { addToCart } from '@/lib/cart/actions';

/**
 * Khoi chon so luong + them vao gio cho PDP. Gioi han so luong theo ton kho.
 */
export function ProductPurchase({ productId, stock }: { productId: string; stock: number }) {
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const outOfStock = stock <= 0;

  const clamp = (n: number) => Math.max(1, Math.min(stock, n));

  if (outOfStock) {
    return (
      <Button disabled className="w-full sm:w-auto">
        Hết hàng
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--color-border)]">
        <button
          type="button"
          aria-label="Giảm số lượng"
          className="grid h-full w-11 place-items-center text-lg text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
          disabled={qty <= 1}
          onClick={() => setQty((q) => clamp(q - 1))}
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={stock}
          value={qty}
          aria-label="Số lượng"
          onChange={(e) => setQty(clamp(Number(e.target.value) || 1))}
          className="h-full w-12 border-x border-[var(--color-border)] bg-transparent text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Tăng số lượng"
          className="grid h-full w-11 place-items-center text-lg text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
          disabled={qty >= stock}
          onClick={() => setQty((q) => clamp(q + 1))}
        >
          +
        </button>
      </div>

      <Button
        type="button"
        disabled={pending}
        className="flex-1 sm:flex-none"
        onClick={() =>
          startTransition(async () => {
            await addToCart(productId, qty);
          })
        }
      >
        {pending ? 'Đang thêm…' : 'Thêm vào giỏ'}
      </Button>
    </div>
  );
}
