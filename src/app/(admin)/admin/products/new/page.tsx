import { createClient } from '@/lib/supabase/server';
import { ProductForm } from '../product-form';

/** Trang tao san pham moi. */
export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('categories').select('id, name').order('name');

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Thêm sản phẩm</h1>
      <ProductForm categories={categories ?? []} />
    </div>
  );
}
