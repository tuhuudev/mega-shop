'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCategory, deleteCategory } from '@/lib/admin/actions';
import type { Category } from '@/lib/schemas';

/** Quan ly danh muc: form tao moi + danh sach co nut xoa. Client comp (form action + pending). */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createCategory(formData);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Xóa danh mục "${name}"?`)) return;
    startTransition(async () => {
      const res = await deleteCategory(id);
      if ('error' in res) {
        window.alert(res.error);
      }
    });
  }

  return (
    <div className="mt-6 max-w-2xl">
      <form ref={formRef} action={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-50">
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Tên danh mục</label>
          <Input id="name" name="name" required placeholder="vd: Thời trang" />
        </div>
        <div className="flex-1 min-w-50">
          <label htmlFor="slug" className="mb-1 block text-sm font-medium">Slug (tùy chọn)</label>
          <Input id="slug" name="slug" placeholder="tu tao neu de trong" />
        </div>
        <Button type="submit" disabled={pending}>{pending ? 'Đang lưu…' : 'Thêm'}</Button>
      </form>
      {error && <p className="mt-2 text-sm font-medium text-[var(--color-danger)]">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Tên</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-muted)]">Chưa có danh mục.</td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{c.slug}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(c.id, c.name)} disabled={pending}>
                      Xóa
                    </Button>
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
