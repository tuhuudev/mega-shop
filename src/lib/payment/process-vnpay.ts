import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/db.types';
import { verifyReturn } from './vnpay';

/**
 * Ket qua xu ly mot ket qua thanh toan VNPay (dung chung cho return URL va IPN).
 * Ca hai duong deu goi ham nay nen cap nhat DB chi o mot cho, idempotent.
 */
export type VnpayOutcome =
  | { kind: 'invalid_signature'; orderId: string | null }
  | { kind: 'not_found' }
  | { kind: 'already_processed'; orderId: string; paid: boolean }
  | { kind: 'amount_mismatch'; orderId: string }
  | { kind: 'paid'; orderId: string }
  | { kind: 'failed'; orderId: string };

/**
 * 1. Verify chu ky. 2. Tim payment theo txn_ref (khong tin orderId tu query).
 * 3. Da xu ly -> khong lam lai. 4. So tien VNPay phai khop payment (khong cap nhat neu lech).
 * 5. Thanh cong -> payment success + order paid; nguoc lai payment failed.
 * Moi UPDATE kem dieu kien status='pending' de hai request dong thoi (return + IPN) khong ghi de nhau.
 */
export async function processVnpayResult(
  admin: SupabaseClient<Database>,
  query: Record<string, string>,
): Promise<VnpayOutcome> {
  const result = verifyReturn(query);

  const { data: payment } = await admin
    .from('payments')
    .select('id, order_id, status, amount')
    .eq('txn_ref', result.txnRef)
    .maybeSingle();

  if (!result.valid) return { kind: 'invalid_signature', orderId: payment?.order_id ?? null };
  if (!payment) return { kind: 'not_found' };

  const orderId = payment.order_id;

  if (payment.status !== 'pending') {
    return { kind: 'already_processed', orderId, paid: payment.status === 'success' };
  }

  if (result.amount !== payment.amount) return { kind: 'amount_mismatch', orderId };

  if (result.isSuccess) {
    await admin
      .from('payments')
      .update({ status: 'success', transaction_no: result.transactionNo, raw: query })
      .eq('id', payment.id)
      .eq('status', 'pending');
    await admin.from('orders').update({ status: 'paid' }).eq('id', orderId).eq('status', 'pending');
    return { kind: 'paid', orderId };
  }

  await admin
    .from('payments')
    .update({ status: 'failed', transaction_no: result.transactionNo, raw: query })
    .eq('id', payment.id)
    .eq('status', 'pending');
  return { kind: 'failed', orderId };
}

/** Ma phan hoi IPN theo tai lieu VNPay (VNPay se goi lai neu khong nhan duoc 00/02). */
export function ipnResponse(outcome: VnpayOutcome): { RspCode: string; Message: string } {
  switch (outcome.kind) {
    case 'invalid_signature':
      return { RspCode: '97', Message: 'Invalid signature' };
    case 'not_found':
      return { RspCode: '01', Message: 'Order not found' };
    case 'amount_mismatch':
      return { RspCode: '04', Message: 'Invalid amount' };
    case 'already_processed':
      return { RspCode: '02', Message: 'Order already confirmed' };
    case 'paid':
    case 'failed':
      return { RspCode: '00', Message: 'Confirm Success' };
  }
}
