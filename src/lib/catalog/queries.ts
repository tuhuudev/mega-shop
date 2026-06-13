import { createClient } from '@/lib/supabase/server';
import { categorySchema, productSchema } from '@/lib/schemas';
import type { Category, Product } from '@/lib/schemas';

/**
 * Server fetch helpers cho Catalog. Dung createClient() (RSC) -> RLS cho phep DOC public.
 * Tra ve kieu da validate qua zod tu '@/lib/schemas'.
 */

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface ListProductsParams {
  search?: string;
  categorySlug?: string;
  sort?: ProductSort;
}

/** Lay danh sach SP, ho tro tim theo ten, loc theo danh muc (slug), sap xep. */
export async function listProducts(params: ListProductsParams = {}): Promise<Product[]> {
  const { search, categorySlug, sort = 'newest' } = params;
  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select('id, name, slug, description, price, stock, image_url, category_id, created_at');

  // Loc theo danh muc: resolve slug -> id (1 truy van nho), tranh join phuc tap.
  if (categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    // Khong tim thay danh muc -> tra rong thay vi loi.
    if (!cat) return [];
    query = query.eq('category_id', cat.id);
  }

  if (search && search.trim()) {
    // ilike: tim khong phan biet hoa thuong; escape ky tu wildcard nguoi dung nhap.
    const term = search.trim().replace(/[%_]/g, (m) => `\\${m}`);
    query = query.ilike('name', `%${term}%`);
  }

  switch (sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw new Error(`listProducts: ${error.message}`);

  return (data ?? []).map((row) => productSchema.parse(row));
}

/** Lay 1 SP theo slug (dung cho PDP). Tra null neu khong ton tai. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, description, price, stock, image_url, category_id, created_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`getProductBySlug: ${error.message}`);
  if (!data) return null;

  return productSchema.parse(data);
}

/** Lay tat ca danh muc (dung cho thanh loc). */
export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (error) throw new Error(`listCategories: ${error.message}`);

  return (data ?? []).map((row) => categorySchema.parse(row));
}
