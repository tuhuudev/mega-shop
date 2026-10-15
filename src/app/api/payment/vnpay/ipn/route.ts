import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ipnResponse, verifyReturn } from '@/lib/payment/vnpay';
import type { ConfirmOutcome } from '@/lib/payment/vnpay';

/**
 * GET /api/payment/vnpay/ipn  (VNPay server -> server)
 *
 * Nguon su that cua trang thai thanh toan (khong phu thuoc trinh duyet khach).
 * 1. verifyReturn() -> chu ky + TmnCode; sai -> RspCode 97.
 * 2. RPC confirm_vnpay_payment (service role): khoa don + payment, so tien voi
 *    orders.total_amount, cap nhat nguyen tu, idempotent (dung chung voi return).
 * 3. Tra JSON { RspCode, Message } theo spec VNPay.
 */
export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const result = verifyReturn(query);
  if (!result.valid) {
    return NextResponse.json(ipnResponse('invalid_signature'));
  }

  const { data, error } = await createAdminClient().rpc('confirm_vnpay_payment', {
    p_txn_ref: result.txnRef,
    p_amount: result.amount,
    p_success: result.isSuccess,
    p_transaction_no: result.transactionNo,
    p_raw: query,
  });
  if (error || !data) {
    return NextResponse.json(ipnResponse('error'));
  }

  return NextResponse.json(ipnResponse(data as ConfirmOutcome));
}
