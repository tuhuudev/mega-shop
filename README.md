# Mega Shop

E-commerce 1 cửa hàng — **Next.js 15 (App Router) + Supabase + VNPay**. Tiền lưu integer (đồng VND).

## Chạy
```bash
pnpm install            # hoac npm install
cp .env.example .env.local   # dien Supabase + VNPay keys
# Tao Supabase project, chay supabase/migrations/0001_init.sql
npm run dev             # http://localhost:3000
```

## Kiến trúc & RANH GIỚI AGENT (mỗi vùng 1 owner — không giẫm nhau)
| Vùng | Owner | Mô tả |
|---|---|---|
| `src/lib/schemas.ts`, `src/lib/supabase/*`, `src/lib/utils.ts`, `src/components/ui/*`, `src/app/layout.tsx`, `(store)/layout.tsx`, `globals.css`, `middleware.ts`, `supabase/migrations/*` | **Foundation** | Contracts: zod types, Supabase client, design system, DB schema + RLS, RPC `place_order`. |
| `src/app/(auth)/**`, `src/lib/auth/**` | **Auth** | Đăng nhập/đăng ký (Supabase Auth), trang account, đăng xuất. |
| `src/app/(store)/page.tsx`, `(store)/products/**`, `src/lib/catalog/**`, `src/components/product/**` | **Catalog** | Lưới SP, tìm/lọc, trang chi tiết (PDP). |
| `src/app/(store)/cart/**`, `(store)/checkout/**`, `src/lib/cart/**` | **Cart/Checkout** | Giỏ (Supabase cart_items), form checkout → gọi RPC `place_order`. |
| `src/app/api/payment/vnpay/**`, `src/lib/payment/**`, `(store)/orders/**` | **Payment** | Tạo URL VNPay, xử lý return/IPN (verify hash), cập nhật `payments`+`orders`; trang đơn hàng. |
| `src/app/(admin)/**`, `src/lib/admin/**` | **Admin** | Dashboard, CRUD sản phẩm/danh mục, quản lý đơn. |

## Contracts (hợp đồng giữa các slice)
- Kiểu dữ liệu & validation: `@/lib/schemas` (Product, Cart, Order, CheckoutInput, OrderStatus…). **KHÔNG** tự định nghĩa lại.
- Supabase: `@/lib/supabase/server` (RSC/Action/Route), `@/lib/supabase/client` (client comp), `createAdminClient()` cho webhook.
- Đặt hàng: gọi RPC `place_order(p_recipient, p_phone, p_address, p_note)` → trả `order_id` (tự trừ tồn kho, tạo order+items, xoá giỏ — nguyên tử).
- Handoff thanh toán: sau khi tạo order → redirect `GET /api/payment/vnpay/create?orderId=<id>` → trả URL VNPay. VNPay redirect về `/api/payment/vnpay/return` (verify `vnp_SecureHash`, cập nhật payment+order='paid').
- UI: dùng `@/components/ui/*` (Button, Card, Input) + class Tailwind theo token `--color-*`.

## Quy ước
- TS strict, `verbatimModuleSyntax` → `import type`. Server Action cho mutation; RSC đọc dữ liệu.
- Mỗi agent CHỈ tạo file trong vùng của mình; KHÔNG sửa config/shared/foundation.
