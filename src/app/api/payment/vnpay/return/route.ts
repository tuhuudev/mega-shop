import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyReturn } from '@/lib/payment/vnpay';

/**
 * GET /api/payment/vnpay/return
 *
 * VNPay redirect khach ve day kem cac tham so vnp_*.
 * 1. verifyReturn() -> recompute HMAC, kiem chu ky + ma phan hoi.
 * 2. Dung createAdminClient() (service role, bypass RLS) de cap nhat payments + orders.
 * 3. Idempotent: neu payment da 'success' thi bo qua, khong ghi de.
 * 4. Redirect khach ve /orders/<id>?paid=1 (thanh cong) hoac ?failed=1.
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());

  const result = verifyReturn(query);
  const admin = createAdminClient();

  // Tra cuu payment theo txn_ref de biet order_id (khong tin orderId tu URL).
  const { data: payment } = await admin
    .from('payments')
    .select('id, order_id, status, amount')
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

  // Idempotent: da xu ly thanh cong roi -> khong lam lai.
  if (payment.status === 'success') {
    return NextResponse.redirect(new URL(`/orders/${orderId}?paid=1`, siteUrl));
  }

  // Phong chong gia mao so tien: so tien VNPay tra phai khop don.
  const amountMatches = result.amount === payment.amount;

  if (result.isSuccess && amountMatches) {
    await admin
      .from('payments')
      .update({
        status: 'success',
        transaction_no: result.transactionNo,
        raw: query,
      })
      .eq('id', payment.id)
      .eq('status', 'pending'); // chi cap nhat khi con pending (tranh ghi de race)

    await admin
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId)
      .eq('status', 'pending');

    return NextResponse.redirect(new URL(`/orders/${orderId}?paid=1`, siteUrl));
  }

  // That bai (response code != '00' hoac sai so tien) -> danh dau failed.
  await admin
    .from('payments')
    .update({
      status: 'failed',
      transaction_no: result.transactionNo,
      raw: query,
    })
    .eq('id', payment.id)
    .eq('status', 'pending');

  return NextResponse.redirect(new URL(`/orders/${orderId}?failed=1`, siteUrl));
}
