import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildPaymentUrl } from '@/lib/payment/vnpay';

/**
 * GET /api/payment/vnpay/create?orderId=<uuid>
 *
 * 1. Xac thuc user (Supabase Auth).
 * 2. Load order qua server client (RLS dam bao chi chu don doc duoc) + check status='pending'.
 * 3. Insert mot dong payments (status=pending, txn_ref duy nhat).
 * 4. Build URL VNPay da ky -> redirect 302 sang VNPay.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (!orderId) {
    return NextResponse.redirect(new URL('/orders?error=missing_order', siteUrl));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', siteUrl));
  }

  // RLS: orders read chi cho chu don -> them eq(user_id) cho ro rang/an toan.
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, status, total_amount')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.redirect(new URL('/orders?error=not_found', siteUrl));
  }
  if (order.status !== 'pending') {
    // Da thanh toan / huy -> ve thang trang chi tiet.
    return NextResponse.redirect(new URL(`/orders/${order.id}`, siteUrl));
  }

  // Lay IP khach (sau proxy/Vercel dung x-forwarded-for).
  const ipAddr =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const { url, txnRef } = buildPaymentUrl({
    orderId: order.id,
    amount: order.total_amount,
    ipAddr,
    orderInfo: `Thanh toan don hang ${order.id}`,
  });

  // Luu giao dich pending de return handler doi soat theo txn_ref.
  const { error: payErr } = await supabase.from('payments').insert({
    order_id: order.id,
    provider: 'vnpay',
    amount: order.total_amount,
    status: 'pending',
    txn_ref: txnRef,
  });
  if (payErr) {
    return NextResponse.redirect(new URL(`/orders/${order.id}?error=payment_init`, siteUrl));
  }

  return NextResponse.redirect(url, { status: 302 });
}
