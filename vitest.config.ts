import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    // vnpay.ts doc env luc import -> gia tri sandbox gia cho test.
    env: {
      VNPAY_TMN_CODE: 'TESTCODE',
      VNPAY_HASH_SECRET: 'TESTSECRET',
      VNPAY_PAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      VNPAY_RETURN_URL: 'http://localhost:3000/api/payment/vnpay/return',
    },
  },
});
