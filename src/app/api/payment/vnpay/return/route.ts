import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { processVnpayResult } from '@/lib/payment/process-vnpay';

/**
 * GET /api/payment/vnpay/return
 *
 * VNPay redirect TRINH DUYET khach ve day kem cac tham so vnp_*. Xu ly giong IPN
 * (processVnpayResult, idempotent) de chay duoc ca khi dev local (IPN khong goi duoc localhost),
 * roi redirect khach ve /orders/<id>?paid=1 hoac ?failed=1.
 * Nguon tin cay chinh o production la IPN (/api/payment/vnpay/ipn) vi khach co the dong tab.
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());

  const outcome = await processVnpayResult(createAdminClient(), query);

  switch (outcome.kind) {
    case 'not_found':
      return NextResponse.redirect(new URL('/orders?error=invalid_signature', siteUrl));
    case 'invalid_signature':
      return NextResponse.redirect(
        outcome.orderId
          ? new URL(`/orders/${outcome.orderId}?failed=1`, siteUrl)
          : new URL('/orders?error=invalid_signature', siteUrl),
      );
    case 'paid':
      return NextResponse.redirect(new URL(`/orders/${outcome.orderId}?paid=1`, siteUrl));
    case 'already_processed':
      return NextResponse.redirect(
        new URL(`/orders/${outcome.orderId}?${outcome.paid ? 'paid' : 'failed'}=1`, siteUrl),
      );
    case 'amount_mismatch':
    case 'failed':
      return NextResponse.redirect(new URL(`/orders/${outcome.orderId}?failed=1`, siteUrl));
  }
}
