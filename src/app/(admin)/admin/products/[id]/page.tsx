import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/schemas';
import { ProductForm } from '../product-form';

/** Trang sua san pham theo id. */
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('categories').select('id, name').order('name'),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Sửa sản phẩm</h1>
      <ProductForm categories={categories ?? []} product={product as Product} />
    </div>
  );
}
