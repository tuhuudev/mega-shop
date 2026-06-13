'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
// Contract path owned by Cart agent. Server action: addToCart(productId, quantity?).
import { addToCart } from '@/lib/cart/actions';

/**
 * Nut "Them vao gio" phia client: goi server action addToCart, hien trang thai pending.
 * Dung useTransition de UI khong block trong khi action chay.
 */
export function AddToCartButton({
  productId,
  quantity = 1,
  disabled,
  className,
  label = 'Thêm vào giỏ',
  size = 'md',
}: {
  productId: string;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size={size}
      disabled={disabled || pending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          await addToCart(productId, quantity);
        })
      }
    >
      {pending ? 'Đang thêm…' : label}
    </Button>
  );
}
