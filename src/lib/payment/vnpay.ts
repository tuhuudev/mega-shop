import crypto from 'node:crypto';

/**
 * Helper VNPay (sandbox) - dung VNPay v2 spec (vnp_Version=2.1.0).
 * Tien VNPay phai nhan 100 (vnp_Amount = amount * 100). Tien trong app la integer dong VND.
 *
 * Tham khao luong:
 *   1. buildPaymentUrl() -> redirect khach sang VNPAY_PAY_URL.
 *   2. VNPay xu ly -> redirect ve VNPAY_RETURN_URL kem cac tham so vnp_*.
 *   3. verifyReturn() -> recompute HMAC-SHA512, so sanh vnp_SecureHash.
 */

const PAY_URL = process.env.VNPAY_PAY_URL!;
const RETURN_URL = process.env.VNPAY_RETURN_URL!;
const TMN_CODE = process.env.VNPAY_TMN_CODE!;
const HASH_SECRET = process.env.VNPAY_HASH_SECRET!;

/**
 * Link thanh toan het han sau 15 phut (vnp_ExpireDate) - ngan hon han huy don
 * pending (30 phut, expire_pending_orders) -> khach khong tra tien cho don da huy.
 */
const PAYMENT_TTL_MS = 15 * 60 * 1000;

/**
 * Sap xep params theo key (alphabet) + encode chuan VNPay.
 * VNPay encode khoang trang thanh '+' (giong querystring.stringify cua Node),
 * nen ta dung encodeURIComponent roi thay '%20' -> '+' cho dong nhat.
 */
function encode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function buildSignData(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key] ?? '')}`)
    .join('&');
}

function hmacSha512(data: string): string {
  return crypto.createHmac('sha512', HASH_SECRET).update(data, 'utf-8').digest('hex');
}

/** yyyyMMddHHmmss theo gio Viet Nam (GMT+7) - VNPay yeu cau gio VN. */
function formatVnDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // 'en-CA' tra hour '24' luc nua dem -> chuan hoa ve '00'.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}${get('month')}${get('day')}${hour}${get('minute')}${get('second')}`;
}

export interface BuildPaymentUrlParams {
  /** ID don hang (de tham chieu trong orderInfo / lay lai khi return). */
  orderId: string;
  /** So tien VND (integer dong) - se nhan 100 cho VNPay. */
  amount: number;
  /** IP cua khach (vnp_IpAddr). */
  ipAddr: string;
  /** Mo ta don hang (vnp_OrderInfo). */
  orderInfo: string;
  /** Ma giao dich duy nhat (vnp_TxnRef). Mac dinh sinh tu time + random. */
  txnRef?: string;
}

/**
 * Tao URL redirect sang VNPay (da ky vnp_SecureHash).
 * Tra ve { url, txnRef } - caller luu txnRef vao bang payments de doi soat.
 */
export function buildPaymentUrl(params: BuildPaymentUrlParams): { url: string; txnRef: string } {
  const { orderId, amount, ipAddr, orderInfo } = params;
  const now = new Date();
  const expireAt = new Date(now.getTime() + PAYMENT_TTL_MS);
  const txnRef = params.txnRef ?? `${formatVnDate(now)}${Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, '0')}`;

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: TMN_CODE,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(amount * 100),
    vnp_ReturnUrl: RETURN_URL,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: formatVnDate(now),
    vnp_ExpireDate: formatVnDate(expireAt),
  };

  const signData = buildSignData(vnpParams);
  const secureHash = hmacSha512(signData);
  const url = `${PAY_URL}?${signData}&vnp_SecureHash=${secureHash}`;

  // Ghi chu: orderId duoc map qua txnRef o bang payments (khong nhet vao URL).
  void orderId;
  return { url, txnRef };
}

export interface VerifyReturnResult {
  /** Hash hop le (chu ky VNPay khop) + dung TmnCode cua minh -> du lieu dang tin. */
  valid: boolean;
  /** vnp_ResponseCode === '00' VA vnp_TransactionStatus === '00' (giao dich thanh cong). */
  isSuccess: boolean;
  /** vnp_TxnRef - map nguoc ve payments. */
  txnRef: string;
  /** So tien VND (da chia 100). */
  amount: number;
  /** vnp_TransactionNo - ma giao dich ben VNPay. */
  transactionNo: string;
  /** Ma phan hoi goc (de log / debug). */
  responseCode: string;
}

/**
 * Verify tham so VNPay redirect ve: recompute HMAC va so sanh vnp_SecureHash.
 * Nhan vao map query (vd: Object.fromEntries(searchParams)).
 */
export function verifyReturn(query: Record<string, string>): VerifyReturnResult {
  const received = query['vnp_SecureHash'] ?? '';

  // Loai vnp_SecureHash + vnp_SecureHashType ra khoi du lieu ky.
  const signed: Record<string, string> = {};
  for (const key of Object.keys(query)) {
    if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
    signed[key] = query[key] ?? '';
  }

  const signData = buildSignData(signed);
  const computed = hmacSha512(signData);

  // So sanh hash an toan theo thoi gian (timing-safe) khi do dai khop.
  let valid = false;
  if (received.length === computed.length) {
    valid = crypto.timingSafeEqual(
      Buffer.from(received, 'utf-8'),
      Buffer.from(computed, 'utf-8'),
    );
  }

  // Chu ky dung nhung cua merchant khac -> khong tin.
  if (query['vnp_TmnCode'] !== TMN_CODE) valid = false;

  const responseCode = query['vnp_ResponseCode'] ?? '';
  const transactionStatus = query['vnp_TransactionStatus'] ?? '';
  const rawAmount = Number(query['vnp_Amount'] ?? '0');

  return {
    valid,
    isSuccess: valid && responseCode === '00' && transactionStatus === '00',
    txnRef: query['vnp_TxnRef'] ?? '',
    amount: Number.isFinite(rawAmount) ? rawAmount / 100 : 0,
    transactionNo: query['vnp_TransactionNo'] ?? '',
    responseCode,
  };
}

/** Ket qua RPC confirm_vnpay_payment (migration 0004). */
export type ConfirmOutcome =
  | 'not_found'
  | 'already_confirmed'
  | 'invalid_amount'
  | 'paid'
  | 'failed'
  | 'needs_refund';

/**
 * Map ket qua xu ly -> JSON tra cho VNPay IPN (spec: { RspCode, Message }).
 * '00' = da ghi nhan (ke ca giao dich that bai / can hoan tien) -> VNPay ngung goi lai.
 */
export function ipnResponse(outcome: ConfirmOutcome | 'invalid_signature' | 'error'): {
  RspCode: string;
  Message: string;
} {
  switch (outcome) {
    case 'paid':
    case 'failed':
    case 'needs_refund':
      return { RspCode: '00', Message: 'Confirm Success' };
    case 'already_confirmed':
      return { RspCode: '02', Message: 'Order already confirmed' };
    case 'not_found':
      return { RspCode: '01', Message: 'Order not found' };
    case 'invalid_amount':
      return { RspCode: '04', Message: 'Invalid amount' };
    case 'invalid_signature':
      return { RspCode: '97', Message: 'Invalid signature' };
    default:
      return { RspCode: '99', Message: 'Unknown error' };
  }
}
