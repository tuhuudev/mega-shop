import { describe, it, expect } from 'vitest';

// VNPay module doc env luc import -> phai set TRUOC khi import (dynamic import ben duoi).
process.env.VNPAY_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
process.env.VNPAY_RETURN_URL = 'http://localhost:3000/api/payment/vnpay/return';
process.env.VNPAY_TMN_CODE = 'TESTCODE';
process.env.VNPAY_HASH_SECRET = 'TESTSECRET';

const { buildPaymentUrl, verifyReturn } = await import('./vnpay');

/** Tach query string cua URL -> map (giong Object.fromEntries(searchParams) ben route). */
function urlToQuery(url: string): Record<string, string> {
  const q = url.split('?')[1] ?? '';
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(q)) out[k] = v;
  return out;
}

describe('vnpay buildPaymentUrl', () => {
  it('nhan tien voi 100 cho vnp_Amount', () => {
    const { url } = buildPaymentUrl({
      orderId: 'order-1',
      amount: 145000,
      ipAddr: '127.0.0.1',
      orderInfo: 'Thanh toan don hang ABC',
      txnRef: 'TXN123',
    });
    const q = urlToQuery(url);
    expect(q.vnp_Amount).toBe('14500000'); // 145000 * 100
    expect(q.vnp_TxnRef).toBe('TXN123');
    expect(q.vnp_SecureHash).toMatch(/^[0-9a-f]{128}$/); // HMAC-SHA512 hex
  });
});

describe('vnpay verifyReturn', () => {
  it('chap nhan chu ky hop le (round-trip tu buildPaymentUrl)', () => {
    const { url } = buildPaymentUrl({
      orderId: 'order-1',
      amount: 145000,
      ipAddr: '127.0.0.1',
      orderInfo: 'Thanh toan don hang co dau cach',
      txnRef: 'TXN123',
    });
    const res = verifyReturn(urlToQuery(url));
    expect(res.valid).toBe(true);
    expect(res.amount).toBe(145000); // da chia 100
    expect(res.txnRef).toBe('TXN123');
  });

  it('phat hien gia mao khi sua vnp_Amount', () => {
    const { url } = buildPaymentUrl({
      orderId: 'order-1',
      amount: 145000,
      ipAddr: '127.0.0.1',
      orderInfo: 'Thanh toan',
      txnRef: 'TXN123',
    });
    const q = urlToQuery(url);
    q.vnp_Amount = '100'; // ke gian sua tien
    const res = verifyReturn(q);
    expect(res.valid).toBe(false);
    expect(res.isSuccess).toBe(false);
  });

  it('valid nhung khong success khi thieu ResponseCode 00', () => {
    const { url } = buildPaymentUrl({
      orderId: 'order-1',
      amount: 50000,
      ipAddr: '127.0.0.1',
      orderInfo: 'Thanh toan',
      txnRef: 'TXN999',
    });
    const res = verifyReturn(urlToQuery(url));
    expect(res.valid).toBe(true);
    expect(res.isSuccess).toBe(false); // chua co vnp_ResponseCode = '00'
  });
});
