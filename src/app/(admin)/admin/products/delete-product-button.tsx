'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { deleteProduct } from '@/lib/admin/actions';

/** Nut xoa san pham: xac nhan -> goi server action. Client comp de confirm + pending. */
export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Xóa sản phẩm "${name}"?`)) return;
    startTransition(async () => {
      const res = await deleteProduct(id);
      if ('error' in res) {
        window.alert(res.error);
      }
    });
  }

  return (
    <Button variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
      {pending ? 'Đang xóa…' : 'Xóa'}
    </Button>
  );
}
