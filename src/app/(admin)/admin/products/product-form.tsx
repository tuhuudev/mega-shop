'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createProduct, updateProduct } from '@/lib/admin/actions';
import type { Category, Product } from '@/lib/schemas';

/**
 * Form tao/sua san pham (dung chung new + edit).
 * Mode quyet dinh action: co `product` -> updateProduct, khong -> createProduct.
 * Slug de trong -> server tu sinh tu ten (slugify).
 */
export function ProductForm({
  categories,
  product,
}: {
  categories: Pick<Category, 'id' | 'name'>[];
  product?: Product;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = product ? await updateProduct(product.id, formData) : await createProduct(formData);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.push('/admin/products');
    });
  }

  const labelCls = 'mb-1 block text-sm font-medium';
  const fieldCls = 'mb-4';

  return (
    <form action={handleSubmit} className="mt-6 max-w-2xl">
      <div className={fieldCls}>
        <label htmlFor="name" className={labelCls}>Tên sản phẩm</label>
        <Input id="name" name="name" required defaultValue={product?.name ?? ''} />
      </div>

      <div className={fieldCls}>
        <label htmlFor="slug" className={labelCls}>Slug (để trống sẽ tự tạo)</label>
        <Input id="slug" name="slug" defaultValue={product?.slug ?? ''} placeholder="vd: ao-thun-nam" />
      </div>

      <div className={fieldCls}>
        <label htmlFor="description" className={labelCls}>Mô tả</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ''}
          className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={fieldCls}>
          <label htmlFor="price" className={labelCls}>Giá (VND)</label>
          <Input id="price" name="price" type="number" min={0} step={1} required defaultValue={product?.price ?? ''} />
        </div>
        <div className={fieldCls}>
          <label htmlFor="stock" className={labelCls}>Tồn kho</label>
          <Input id="stock" name="stock" type="number" min={0} step={1} required defaultValue={product?.stock ?? ''} />
        </div>
      </div>

      <div className={fieldCls}>
        <label htmlFor="image_url" className={labelCls}>Ảnh (URL)</label>
        <Input id="image_url" name="image_url" type="url" defaultValue={product?.image_url ?? ''} placeholder="https://…" />
      </div>

      <div className={fieldCls}>
        <label htmlFor="category_id" className={labelCls}>Danh mục</label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={product?.category_id ?? ''}
          className="h-11 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-primary)]"
        >
          <option value="">— Không —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-[var(--color-danger)]">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : product ? 'Cập nhật' : 'Tạo sản phẩm'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')} disabled={pending}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
