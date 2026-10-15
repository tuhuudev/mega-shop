import { describe, it, expect } from 'vitest';

// VNPay module doc env luc import -> phai set TRUOC khi import (dynamic import ben duoi).
process.env.VNPAY_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
process.env.VNPAY_RETURN_URL = 'http://localhost:3000/api/payment/vnpay/return';
process.env.VNPAY_TMN_CODE = 'TESTCODE';
process.env.VNPAY_HASH_SECRET = 'TESTSECRET';

const { buildPaymentUrl, verifyReturn, ipnResponse } = await import('./vnpay');

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

/** Ky lai query sau khi sua (gia lap tham so VNPay tra ve hop le). */
async function resign(q: Record<string, string>): Promise<Record<string, string>> {
  const crypto = await import('node:crypto');
  const signed = Object.fromEntries(
    Object.entries(q).filter(([k]) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType'),
  );
  const data = Object.keys(signed)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(signed[k] ?? '').replace(/%20/g, '+')}`)
    .join('&');
  const hash = crypto.createHmac('sha512', 'TESTSECRET').update(data, 'utf-8').digest('hex');
  return { ...signed, vnp_SecureHash: hash };
}

function paidQuery(): Record<string, string> {
  const { url } = buildPaymentUrl({
    orderId: 'order-1',
    amount: 50000,
    ipAddr: '127.0.0.1',
    orderInfo: 'Thanh toan',
    txnRef: 'TXN777',
  });
  return urlToQuery(url);
}

describe('vnpay audit fixes', () => {
  it('them vnp_ExpireDate = CreateDate + 15 phut', () => {
    const q = paidQuery();
    expect(q.vnp_ExpireDate).toMatch(/^\d{14}$/);
    const toDate = (s: string) =>
      new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`);
    const diffMin = (toDate(q.vnp_ExpireDate!).getTime() - toDate(q.vnp_CreateDate!).getTime()) / 60000;
    expect(diffMin).toBe(15);
  });

  it('success chi khi ResponseCode 00 VA TransactionStatus 00', async () => {
    const ok = verifyReturn(await resign({ ...paidQuery(), vnp_ResponseCode: '00', vnp_TransactionStatus: '00' }));
    expect(ok.valid).toBe(true);
    expect(ok.isSuccess).toBe(true);

    const pendingAtBank = verifyReturn(
      await resign({ ...paidQuery(), vnp_ResponseCode: '00', vnp_TransactionStatus: '01' }),
    );
    expect(pendingAtBank.valid).toBe(true);
    expect(pendingAtBank.isSuccess).toBe(false);
  });

  it('tu choi chu ky hop le nhung sai TmnCode', async () => {
    const q = await resign({ ...paidQuery(), vnp_TmnCode: 'OTHERSHOP', vnp_ResponseCode: '00', vnp_TransactionStatus: '00' });
    const res = verifyReturn(q);
    expect(res.valid).toBe(false);
    expect(res.isSuccess).toBe(false);
  });

  it('map ket qua -> RspCode IPN theo spec VNPay', () => {
    expect(ipnResponse('paid').RspCode).toBe('00');
    expect(ipnResponse('failed').RspCode).toBe('00');
    expect(ipnResponse('needs_refund').RspCode).toBe('00');
    expect(ipnResponse('already_confirmed').RspCode).toBe('02');
    expect(ipnResponse('not_found').RspCode).toBe('01');
    expect(ipnResponse('invalid_amount').RspCode).toBe('04');
    expect(ipnResponse('invalid_signature').RspCode).toBe('97');
    expect(ipnResponse('error').RspCode).toBe('99');
  });
});
