import { z } from 'zod';

/**
 * CONTRACTS dung chung toan app (foundation). Moi sub-agent import tu day,
 * KHONG tu dinh nghia lai kieu du lieu -> dam bao khop schema DB + giua cac slice.
 */

// ---- Enums (khop CHECK constraint trong DB) ----
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'success', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const USER_ROLES = ['customer', 'staff', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---- Catalog ----
export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});
export type Category = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().int().nonnegative(), // VND, luu integer (dong) -> tranh sai so float
  stock: z.number().int().nonnegative(),
  image_url: z.string().url().nullable(),
  category_id: z.string().uuid().nullable(),
  created_at: z.string(),
});
export type Product = z.infer<typeof productSchema>;

export const productInputSchema = productSchema
  .pick({ name: true, description: true, price: true, stock: true, image_url: true, category_id: true })
  .extend({ slug: z.string().min(1).optional() });
export type ProductInput = z.infer<typeof productInputSchema>;

// ---- Cart ----
export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartLineSchema = cartItemSchema.extend({
  name: z.string(),
  price: z.number().int(),
  image_url: z.string().nullable(),
  line_total: z.number().int(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

// ---- Orders ----
export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  unit_price: z.number().int(),
  quantity: z.number().int().positive(),
  line_total: z.number().int(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  total_amount: z.number().int(),
  recipient_name: z.string(),
  phone: z.string(),
  address: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
});
export type Order = z.infer<typeof orderSchema>;

// ---- Checkout (form khach nhap) ----
export const checkoutSchema = z.object({
  recipient_name: z.string().min(2, 'Nhập họ tên người nhận'),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Nhập địa chỉ giao hàng'),
  note: z.string().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ---- Helpers ----
export const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
