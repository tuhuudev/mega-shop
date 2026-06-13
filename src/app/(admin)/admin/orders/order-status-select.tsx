'use client';

import { useState, useTransition } from 'react';
import { updateOrderStatus } from '@/lib/admin/actions';
import { ORDER_STATUSES } from '@/lib/schemas';
import type { OrderStatus } from '@/lib/schemas';

/** Doi trang thai don: select -> goi server action ngay khi thay doi. */

const LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  shipped: 'Đã giao',
  cancelled: 'Đã hủy',
};

export function OrderStatusSelect({ id, status }: { id: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<OrderStatus>(status);

  function handleChange(next: OrderStatus) {
    const prev = current;
    setCurrent(next);
    const formData = new FormData();
    formData.set('id', id);
    formData.set('status', next);
    startTransition(async () => {
      const res = await updateOrderStatus(formData);
      if ('error' in res) {
        setCurrent(prev); // rollback neu loi
        window.alert(res.error);
      }
    });
  }

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as OrderStatus)}
      className="h-9 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>{LABELS[s]}</option>
      ))}
    </select>
  );
}
