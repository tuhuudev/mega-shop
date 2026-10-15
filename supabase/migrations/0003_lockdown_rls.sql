-- ============================================================
-- 0003 lockdown RLS (audit 2026-10-15: C-1, C-2, H-1)
--  C-1: user tu UPDATE profiles.role -> admin. Chi cho sua full_name.
--  C-2: user tu INSERT orders/order_items (status='paid', gia tuy y).
--       Don chi duoc tao qua RPC place_order (security definer, gia lay tu DB).
--  H-1: user tu INSERT payments (status='success' gia). Payment do server
--       tao bang service role (route /api/payment/vnpay/create).
-- ============================================================

-- C-1: chi cot full_name duoc user tu sua.
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- C-2: bo duong insert truc tiep; place_order (security definer) van chay.
drop policy if exists "orders insert"      on public.orders;
drop policy if exists "order_items insert" on public.order_items;
revoke insert on public.orders, public.order_items from anon, authenticated;

-- H-1: payments chi do service role ghi.
drop policy if exists "payments insert own order" on public.payments;
revoke insert on public.payments from anon, authenticated;
