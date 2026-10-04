import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ipnResponse, processVnpayResult } from '@/lib/payment/process-vnpay';

/**
 * GET /api/payment/vnpay/ipn — VNPay goi SERVER-TO-SERVER sau moi giao dich.
 * Day la nguon xac nhan thanh toan dang tin cay (khong phu thuoc trinh duyet khach).
 * Khai bao URL nay (domain public, HTTPS) trong cau hinh merchant VNPay.
 * Luon tra HTTP 200 + JSON { RspCode, Message } theo spec VNPay.
 */
export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  try {
    const outcome = await processVnpayResult(createAdminClient(), query);
    return NextResponse.json(ipnResponse(outcome));
  } catch {
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' });
  }
}
