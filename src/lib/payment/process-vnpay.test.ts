import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ipnResponse, processVnpayResult } from './process-vnpay';

type Payment = { id: string; order_id: string; status: 'pending' | 'success' | 'failed'; amount: number };

/** Supabase admin gia: chi ho tro chuoi lenh ma processVnpayResult dung, ghi lai moi UPDATE. */
function fakeAdmin(payment: Payment | null) {
  const updates: { table: string; values: Record<string, unknown>; filters: [string, unknown][] }[] = [];
  const admin = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const builder = {
        select: () => builder,
        update(v: Record<string, unknown>) {
          updates.push({ table, values: v, filters });
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          return builder;
        },
        maybeSingle: async () => ({ data: payment && filters.some(([c, v]) => c === 'txn_ref' && v === 'REF1') ? payment : null }),
        // UPDATE ... .eq() duoc await truc tiep.
        then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      };
      return builder;
    },
  };
  return { admin: admin as never, updates };
}

function signedQuery(overrides: Record<string, string> = {}) {
  const params: Record<string, string> = {
    vnp_Amount: '15000000',
    vnp_ResponseCode: '00',
    vnp_TransactionNo: '14000001',
    vnp_TxnRef: 'REF1',
    ...overrides,
  };
  const data = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]!).replace(/%20/g, '+')}`)
    .join('&');
  const hash = crypto.createHmac('sha512', 'TESTSECRET').update(data, 'utf-8').digest('hex');
  return { ...params, vnp_SecureHash: hash };
}

const pending: Payment = { id: 'p1', order_id: 'o1', status: 'pending', amount: 150000 };

describe('processVnpayResult', () => {
  it('thanh cong -> payment success + order paid, chi khi con pending', async () => {
    const { admin, updates } = fakeAdmin({ ...pending });
    expect(await processVnpayResult(admin, signedQuery())).toEqual({ kind: 'paid', orderId: 'o1' });
    expect(updates.map((u) => [u.table, u.values.status])).toEqual([
      ['payments', 'success'],
      ['orders', 'paid'],
    ]);
    for (const u of updates) expect(u.filters).toContainEqual(['status', 'pending']);
  });

  it('ma loi -> payment failed, khong dung vao order', async () => {
    const { admin, updates } = fakeAdmin({ ...pending });
    expect(await processVnpayResult(admin, signedQuery({ vnp_ResponseCode: '24' }))).toEqual({
      kind: 'failed',
      orderId: 'o1',
    });
    expect(updates.map((u) => [u.table, u.values.status])).toEqual([['payments', 'failed']]);
  });

  it('chu ky sai -> khong cap nhat gi', async () => {
    const { admin, updates } = fakeAdmin({ ...pending });
    const q = { ...signedQuery(), vnp_Amount: '100' };
    expect(await processVnpayResult(admin, q)).toEqual({ kind: 'invalid_signature', orderId: 'o1' });
    expect(updates).toEqual([]);
  });

  it('chu ky viet hoa van hop le', async () => {
    const { admin } = fakeAdmin({ ...pending });
    const q = signedQuery();
    q.vnp_SecureHash = q.vnp_SecureHash.toUpperCase();
    expect((await processVnpayResult(admin, q)).kind).toBe('paid');
  });

  it('so tien lech payment -> amount_mismatch, khong cap nhat', async () => {
    const { admin, updates } = fakeAdmin({ ...pending, amount: 999000 });
    expect(await processVnpayResult(admin, signedQuery())).toEqual({ kind: 'amount_mismatch', orderId: 'o1' });
    expect(updates).toEqual([]);
  });

  it('da xu ly roi -> idempotent', async () => {
    const { admin, updates } = fakeAdmin({ ...pending, status: 'success' });
    expect(await processVnpayResult(admin, signedQuery())).toEqual({
      kind: 'already_processed',
      orderId: 'o1',
      paid: true,
    });
    expect(updates).toEqual([]);
  });

  it('khong co payment -> not_found', async () => {
    const { admin } = fakeAdmin(null);
    expect(await processVnpayResult(admin, signedQuery())).toEqual({ kind: 'not_found' });
  });
});

describe('ipnResponse', () => {
  it.each([
    [{ kind: 'invalid_signature', orderId: null }, '97'],
    [{ kind: 'not_found' }, '01'],
    [{ kind: 'amount_mismatch', orderId: 'o' }, '04'],
    [{ kind: 'already_processed', orderId: 'o', paid: true }, '02'],
    [{ kind: 'paid', orderId: 'o' }, '00'],
    [{ kind: 'failed', orderId: 'o' }, '00'],
  ] as const)('%o -> %s', (outcome, code) => {
    expect(ipnResponse(outcome).RspCode).toBe(code);
  });
});
