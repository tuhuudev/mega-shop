import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildPaymentUrl, verifyReturn } from './vnpay';

const SECRET = 'TESTSECRET';

/** Ky lai bo tham so nhu VNPay (sort key, encode space -> '+', HMAC-SHA512). */
function sign(params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? '').replace(/%20/g, '+')}`)
    .join('&');
  return crypto.createHmac('sha512', SECRET).update(data, 'utf-8').digest('hex');
}

function vnpayReturn(overrides: Record<string, string> = {}): Record<string, string> {
  const params: Record<string, string> = {
    vnp_Amount: '15000000',
    vnp_BankCode: 'NCB',
    vnp_OrderInfo: 'Thanh toan don hang abc',
    vnp_ResponseCode: '00',
    vnp_TmnCode: 'TESTCODE',
    vnp_TransactionNo: '14000001',
    vnp_TxnRef: '20261004120000123456',
    ...overrides,
  };
  return { ...params, vnp_SecureHashType: 'HmacSHA512', vnp_SecureHash: sign(params) };
}

describe('buildPaymentUrl', () => {
  it('nhan so tien x100 va ky URL bang HASH_SECRET', () => {
    const { url, txnRef } = buildPaymentUrl({
      orderId: 'o1',
      amount: 150000,
      ipAddr: '1.2.3.4',
      orderInfo: 'Thanh toan don hang o1',
      txnRef: 'REF1',
    });
    const parsed = new URL(url);
    const params = Object.fromEntries(parsed.searchParams.entries());
    expect(txnRef).toBe('REF1');
    expect(params.vnp_Amount).toBe('15000000');
    expect(params.vnp_TmnCode).toBe('TESTCODE');
    expect(params.vnp_CreateDate).toMatch(/^\d{14}$/);

    const { vnp_SecureHash, ...signed } = params;
    expect(vnp_SecureHash).toBe(sign(signed));
  });

  it('URL tu tao verify duoc bang verifyReturn (round-trip)', () => {
    const { url } = buildPaymentUrl({ orderId: 'o1', amount: 99000, ipAddr: '::1', orderInfo: 'Don o1' });
    const params = Object.fromEntries(new URL(url).searchParams.entries());
    expect(verifyReturn(params).valid).toBe(true);
  });

  it('sinh txnRef khac nhau khi khong truyen', () => {
    const a = buildPaymentUrl({ orderId: 'o', amount: 1, ipAddr: '::1', orderInfo: 'x' }).txnRef;
    const b = buildPaymentUrl({ orderId: 'o', amount: 1, ipAddr: '::1', orderInfo: 'x' }).txnRef;
    expect(a).toMatch(/^\d{20}$/);
    expect(a).not.toBe(b);
  });
});

describe('verifyReturn', () => {
  it('chu ky dung + ma 00 -> thanh cong, so tien chia 100', () => {
    const r = verifyReturn(vnpayReturn());
    expect(r).toMatchObject({
      valid: true,
      isSuccess: true,
      amount: 150000,
      txnRef: '20261004120000123456',
      transactionNo: '14000001',
      responseCode: '00',
    });
  });

  it('chu ky dung nhung ma loi -> valid, khong thanh cong', () => {
    const r = verifyReturn(vnpayReturn({ vnp_ResponseCode: '24' }));
    expect(r.valid).toBe(true);
    expect(r.isSuccess).toBe(false);
  });

  it('sua so tien sau khi ky -> chu ky sai', () => {
    const q = vnpayReturn();
    q.vnp_Amount = '100';
    const r = verifyReturn(q);
    expect(r.valid).toBe(false);
    expect(r.isSuccess).toBe(false);
  });

  it('thieu chu ky hoac chu ky rac -> khong hop le', () => {
    const { vnp_SecureHash: _drop, ...noHash } = vnpayReturn();
    expect(verifyReturn(noHash).valid).toBe(false);
    expect(verifyReturn({ ...vnpayReturn(), vnp_SecureHash: 'abc' }).valid).toBe(false);
  });

  it('ky bang secret khac -> khong hop le', () => {
    const q = vnpayReturn();
    const { vnp_SecureHash: _h, vnp_SecureHashType: _t, ...signed } = q;
    const forged = crypto
      .createHmac('sha512', 'WRONG')
      .update(new URLSearchParams(Object.entries(signed).sort()).toString())
      .digest('hex');
    expect(verifyReturn({ ...q, vnp_SecureHash: forged }).valid).toBe(false);
  });

  it('so tien khong phai so -> amount = 0', () => {
    expect(verifyReturn({ vnp_Amount: 'abc' }).amount).toBe(0);
  });
});
