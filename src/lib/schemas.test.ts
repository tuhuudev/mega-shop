import { describe, expect, it } from 'vitest';
import { cartItemSchema, checkoutSchema, productInputSchema } from './schemas';

describe('checkoutSchema', () => {
  const valid = { recipient_name: 'Nguyen Van A', phone: '0912345678', address: '12 Le Loi, Q1' };

  it('chap nhan du lieu hop le', () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['912345678', '09123456789', '+84912345678', '09a2345678'])('tu choi so dien thoai %s', (phone) => {
    expect(checkoutSchema.safeParse({ ...valid, phone }).success).toBe(false);
  });

  it('tu choi ghi chu qua 500 ky tu', () => {
    expect(checkoutSchema.safeParse({ ...valid, note: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('productInputSchema', () => {
  const base = { name: 'Ao', description: null, price: 150000, stock: 3, image_url: null, category_id: null };

  it('gia phai la so nguyen khong am (VND)', () => {
    expect(productInputSchema.safeParse(base).success).toBe(true);
    expect(productInputSchema.safeParse({ ...base, price: 1.5 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, price: -1 }).success).toBe(false);
  });
});

describe('cartItemSchema', () => {
  it('so luong phai duong', () => {
    const product_id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    expect(cartItemSchema.safeParse({ product_id, quantity: 1 }).success).toBe(true);
    expect(cartItemSchema.safeParse({ product_id, quantity: 0 }).success).toBe(false);
  });
});
