'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { productInputSchema, categorySchema, ORDER_STATUSES } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

/**
 * Server Actions cho ADMIN: CRUD san pham/danh muc + doi trang thai don.
 * Quyen ghi do RLS DB kiem soat (chi staff/admin: is_staff()). Day chi validate
 * dau vao + chuan hoa slug, sau do revalidate cac trang lien quan.
 * Tra ve { error } khi that bai de UI hien thi.
 */

export type ActionResult = { error: string } | { ok: true };

// ---- Helpers ----

// Ep gia tri form (string) ve so/null cho zod product input.
function toNumber(value: FormDataEntryValue | null): number {
  return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
}
function toNullableText(value: FormDataEntryValue | null): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  return v === '' ? null : v;
}

function parseProductForm(formData: FormData) {
  return productInputSchema.safeParse({
    name: typeof formData.get('name') === 'string' ? (formData.get('name') as string).trim() : '',
    description: toNullableText(formData.get('description')),
    price: toNumber(formData.get('price')),
    stock: toNumber(formData.get('stock')),
    image_url: toNullableText(formData.get('image_url')),
    category_id: toNullableText(formData.get('category_id')),
    slug: toNullableText(formData.get('slug')) ?? undefined,
  });
}

// ---- Products ----

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' };
  }
  const { slug, ...rest } = parsed.data;
  const finalSlug = slug && slug.trim() !== '' ? slugify(slug) : slugify(rest.name);

  const supabase = await createClient();
  const { error } = await supabase.from('products').insert({ ...rest, slug: finalSlug });
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/products');
  revalidatePath('/admin');
  return { ok: true };
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: 'ID khong hop le' };
  }
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' };
  }
  const { slug, ...rest } = parsed.data;
  const finalSlug = slug && slug.trim() !== '' ? slugify(slug) : slugify(rest.name);

  const supabase = await createClient();
  const { error } = await supabase.from('products').update({ ...rest, slug: finalSlug }).eq('id', id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${id}`);
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: 'ID khong hop le' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/products');
  revalidatePath('/admin');
  return { ok: true };
}

// ---- Categories ----

const categoryInputSchema = categorySchema.pick({ name: true }).extend({
  slug: z.string().min(1).optional(),
});

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const parsed = categoryInputSchema.safeParse({
    name: typeof formData.get('name') === 'string' ? (formData.get('name') as string).trim() : '',
    slug: toNullableText(formData.get('slug')) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' };
  }
  const finalSlug = parsed.data.slug && parsed.data.slug.trim() !== '' ? slugify(parsed.data.slug) : slugify(parsed.data.name);

  const supabase = await createClient();
  const { error } = await supabase.from('categories').insert({ name: parsed.data.name, slug: finalSlug });
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/categories');
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: 'ID khong hop le' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/categories');
  return { ok: true };
}

// ---- Orders ----

const updateOrderStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
});

export async function updateOrderStatus(formData: FormData): Promise<ActionResult> {
  const parsed = updateOrderStatusSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('orders').update({ status: parsed.data.status }).eq('id', parsed.data.id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { ok: true };
}
