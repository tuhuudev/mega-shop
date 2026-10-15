import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyReturn } from '@/lib/payment/vnpay';

/**
 * GET /api/payment/vnpay/return
 *
 * VNPay redirect khach ve day kem cac tham so vnp_*.
 * 1. verifyReturn() -> recompute HMAC, kiem chu ky + TmnCode + ma phan hoi.
 * 2. Goi CUNG RPC confirm_vnpay_payment voi IPN (idempotent): IPN la nguon chinh,
 *    return chi la duong du phong (vd localhost, VNPay khong goi IPN toi duoc).
 * 3. Redirect khach ve /orders/<id>?paid=1 (thanh cong) hoac ?failed=1.
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());

  const result = verifyReturn(query);
  const admin = createAdminClient();

  // Tra cuu payment theo txn_ref de biet order_id (khong tin orderId tu URL).
  const { data: payment } = await admin
    .from('payments')
    .select('order_id')
    .eq('txn_ref', result.txnRef)
    .maybeSingle();

  // Khong tim thay giao dich hoac chu ky sai -> bao loi, khong cap nhat gi.
  if (!result.valid || !payment) {
    const target = payment
      ? new URL(`/orders/${payment.order_id}?failed=1`, siteUrl)
      : new URL('/orders?error=invalid_signature', siteUrl);
    return NextResponse.redirect(target);
  }

  const orderId = payment.order_id;

  // Cap nhat nguyen tu (payment + order) trong DB; so tien so voi orders.total_amount.
  await admin.rpc('confirm_vnpay_payment', {
    p_txn_ref: result.txnRef,
    p_amount: result.amount,
    p_success: result.isSuccess,
    p_transaction_no: result.transactionNo,
    p_raw: query,
  });

  // Hien thi theo trang thai THAT trong DB (IPN co the da xu ly truoc).
  const { data: after } = await admin
    .from('payments')
    .select('status')
    .eq('txn_ref', result.txnRef)
    .maybeSingle();

  const outcome = after?.status === 'success' ? 'paid=1' : 'failed=1';
  return NextResponse.redirect(new URL(`/orders/${orderId}?${outcome}`, siteUrl));
}
