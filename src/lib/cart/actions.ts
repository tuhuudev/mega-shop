'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkoutSchema } from '@/lib/schemas';
import type { CartLine, CheckoutInput } from '@/lib/schemas';

/**
 * Server Actions cho gio hang + checkout. Tat ca chay tren SERVER,
 * dung Supabase client co RLS (chi tac dong len gio cua user dang dang nhap).
 */

/**
 * Lay user dang dang nhap. Chua dang nhap -> redirect sang /login
 * (muot, khong nem loi crash overlay). redirect() tra ve `never`
 * nen sau dong nay TS hieu `user` chac chan ton tai.
 */
async function requireUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/cart');
  return user.id;
}

/**
 * Dam bao co 1 cart row cho user roi tra ve cart_id.
 * carts.user_id la UNIQUE -> insert ... on conflict do nothing roi select.
 */
async function ensureCartId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  // Thu select truoc (truong hop pho bien: gio da ton tai).
  const existing = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data.id;

  // Chua co -> tao moi; on conflict (user_id) do nothing tranh race.
  const inserted = await supabase
    .from('carts')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();
  if (inserted.error) throw new Error(inserted.error.message);
  if (inserted.data) return inserted.data.id;

  // Race: dong khac vua tao -> select lai.
  const again = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (again.error) throw new Error(again.error.message);
  return again.data.id;
}

/**
 * Them san pham vao gio (cong don so luong). CONTRACT — Catalog agent import ham nay.
 */
export async function addToCart(productId: string, quantity = 1): Promise<void> {
  if (quantity < 1) return;
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const cartId = await ensureCartId(supabase, userId);

  // Cong don len so luong hien co (neu chua co -> mac dinh 0).
  const current = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle();
  if (current.error) throw new Error(current.error.message);

  const nextQty = (current.data?.quantity ?? 0) + quantity;

  const upserted = await supabase
    .from('cart_items')
    .upsert(
      { cart_id: cartId, product_id: productId, quantity: nextQty },
      { onConflict: 'cart_id,product_id' },
    );
  if (upserted.error) throw new Error(upserted.error.message);

  revalidatePath('/cart');
}

/** Dat lai so luong cho 1 dong. quantity <= 0 -> xoa dong. */
export async function updateQty(productId: string, quantity: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const cartId = await ensureCartId(supabase, userId);

  if (quantity <= 0) {
    await removeItem(productId);
    return;
  }

  const updated = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('cart_id', cartId)
    .eq('product_id', productId);
  if (updated.error) throw new Error(updated.error.message);

  revalidatePath('/cart');
}

/** Xoa 1 dong khoi gio. */
export async function removeItem(productId: string): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const cartId = await ensureCartId(supabase, userId);

  const deleted = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId)
    .eq('product_id', productId);
  if (deleted.error) throw new Error(deleted.error.message);

  revalidatePath('/cart');
}

/** Ket qua doc gio: danh sach dong + tong tien. */
export interface CartSnapshot {
  lines: CartLine[];
  total: number;
}

/**
 * Doc gio cua user (join cart_items voi products). Tra ve [] neu chua dang nhap / gio rong.
 */
export async function getCart(): Promise<CartSnapshot> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { lines: [], total: 0 };

  // Lay cart_id (khong tao moi khi chi doc).
  const cart = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (cart.error) throw new Error(cart.error.message);
  if (!cart.data) return { lines: [], total: 0 };

  // Join cart_items -> products de lay ten/gia/anh.
  const items = await supabase
    .from('cart_items')
    .select('product_id, quantity, products(name, price, image_url)')
    .eq('cart_id', cart.data.id);
  if (items.error) throw new Error(items.error.message);

  const lines: CartLine[] = (items.data ?? [])
    .map((row) => {
      // products co the la object (1-1) tuy cach supabase-js suy luan kieu.
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      if (!product) return null;
      const price = product.price;
      return {
        product_id: row.product_id,
        quantity: row.quantity,
        name: product.name,
        price,
        image_url: product.image_url,
        line_total: price * row.quantity,
      } satisfies CartLine;
    })
    .filter((line): line is CartLine => line !== null);

  const total = lines.reduce((sum, line) => sum + line.line_total, 0);
  return { lines, total };
}

/**
 * Dat hang: validate form -> goi RPC place_order (nguyen tu) -> redirect sang Payment.
 * Nem Error voi message tieng Viet de form hien thi.
 */
export async function placeOrder(input: CheckoutInput): Promise<void> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
  }

  const supabase = await createClient();
  await requireUserId(supabase);

  const { recipient_name, phone, address, note } = parsed.data;
  const { data: orderId, error } = await supabase.rpc('place_order', {
    p_recipient: recipient_name,
    p_phone: phone,
    p_address: address,
    p_note: note ?? null,
  });

  if (error) {
    // Map loi RPC -> thong bao than thien.
    const msg = error.message;
    if (msg.includes('CART_EMPTY')) throw new Error('Giỏ hàng trống');
    if (msg.includes('OUT_OF_STOCK')) {
      const name = msg.split('OUT_OF_STOCK:')[1]?.trim();
      throw new Error(name ? `Sản phẩm "${name}" không đủ tồn kho` : 'Sản phẩm không đủ tồn kho');
    }
    throw new Error(msg);
  }
  if (!orderId) throw new Error('Không tạo được đơn hàng');

  // Gio da bi xoa trong RPC -> lam moi cac trang lien quan.
  revalidatePath('/cart');
  revalidatePath('/orders');

  // Handoff sang Payment agent: tao URL VNPay.
  redirect(`/api/payment/vnpay/create?orderId=${orderId}`);
}
