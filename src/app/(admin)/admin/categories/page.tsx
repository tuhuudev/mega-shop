import { createClient } from '@/lib/supabase/server';
import type { Category } from '@/lib/schemas';
import { CategoryManager } from './category-manager';

/** Danh muc: liet ke + tao/xoa. */
export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('categories').select('id, name, slug').order('name');

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Danh mục</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Tạo và quản lý danh mục sản phẩm.</p>
      <CategoryManager categories={(categories ?? []) as Category[]} />
    </div>
  );
}
