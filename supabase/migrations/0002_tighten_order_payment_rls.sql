-- ============================================================
-- 0002: siet RLS cho orders / order_items / payments
--
-- Lo hong o 0001: khach dang nhap co the goi thang PostgREST (anon key + JWT cua minh)
--   * INSERT orders voi status='paid' va total_amount tuy y
--   * INSERT order_items voi unit_price / line_total tuy y
--   * INSERT payments voi status='success' hoac amount khac tong don
-- -> tao don "da thanh toan" ma khong tra tien, hoac tra 1.000d cho don iPhone.
--
-- Don hang chi duoc tao qua RPC place_order (security definer, tu tinh tong tu gia
-- trong DB) nen bo hai policy insert truc tiep. Payment chi duoc tao o trang thai
-- pending, dung so tien cua don.
-- ============================================================

drop policy if exists "orders insert" on public.orders;
drop policy if exists "order_items insert" on public.order_items;

drop policy if exists "payments insert own order" on public.payments;
create policy "payments insert own order" on public.payments for insert
  with check (
    status = 'pending'
    and transaction_no is null
    and raw is null
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
        and o.status = 'pending'
        and o.total_amount = amount
    )
  );
