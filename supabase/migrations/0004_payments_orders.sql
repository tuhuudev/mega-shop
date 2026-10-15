-- ============================================================
-- 0004 payments + orders integrity (audit 2026-10-15: H-2, M-1, M-2)
--  H-2: confirm_vnpay_payment() - xac nhan thanh toan NGUYEN TU + idempotent,
--       dung chung cho IPN va Return URL; so tien so voi orders.total_amount.
--  M-1: expire_pending_orders() - huy don pending qua han + hoan kho (pg_cron).
--       set_order_status() - ma tran chuyen trang thai, hoan kho khi huy.
--  M-2: staff khong UPDATE orders truc tiep nua; chi qua set_order_status().
-- Thu tu khoa: orders -> payments o MOI ham (tranh deadlock).
-- ============================================================

-- Hoan kho theo order_items (noi bo, khong expose qua API).
create or replace function public._restock_order(p_order_id uuid)
returns void language sql security definer set search_path = public as $$
  update products p set stock = p.stock + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;
$$;

-- H-2: tra ve 'not_found' | 'already_confirmed' | 'invalid_amount' | 'paid' | 'failed' | 'needs_refund'.
create or replace function public.confirm_vnpay_payment(
  p_txn_ref text, p_amount integer, p_success boolean, p_transaction_no text, p_raw jsonb
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_order    orders%rowtype;
  v_pay      payments%rowtype;
begin
  select order_id into v_order_id from payments where txn_ref = p_txn_ref;
  if v_order_id is null then return 'not_found'; end if;

  select * into v_order from orders where id = v_order_id for update;
  select * into v_pay from payments where txn_ref = p_txn_ref for update;

  if v_pay.status <> 'pending' then return 'already_confirmed'; end if;
  if p_amount is distinct from v_order.total_amount then return 'invalid_amount'; end if;

  if not p_success then
    update payments set status = 'failed', transaction_no = p_transaction_no, raw = p_raw where id = v_pay.id;
    return 'failed';
  end if;

  update payments set status = 'success', transaction_no = p_transaction_no, raw = p_raw where id = v_pay.id;
  -- Don da huy (het han) hoac da duoc tra boi giao dich khac -> ghi nhan tien, can hoan tien tay.
  if v_order.status <> 'pending' then return 'needs_refund'; end if;

  update orders set status = 'paid' where id = v_order.id;
  return 'paid';
end $$;

-- M-1: huy don pending qua han, hoan kho, danh dau payment pending la failed.
create or replace function public.expire_pending_orders(p_older_than interval default interval '30 minutes')
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id from orders
    where status = 'pending' and created_at < now() - p_older_than
    for update skip locked
  loop
    perform public._restock_order(r.id);
    update orders set status = 'cancelled' where id = r.id;
    update payments set status = 'failed' where order_id = r.id and status = 'pending';
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- M-1/M-2: doi trang thai don boi staff. Khong cho pending -> paid bang tay.
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_current text;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select status into v_current from orders where id = p_order_id for update;
  if v_current is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_current = p_status then return; end if;

  if not ((v_current = 'pending' and p_status = 'cancelled')
       or (v_current = 'paid' and p_status in ('shipped', 'cancelled'))) then
    raise exception 'INVALID_TRANSITION:%->%', v_current, p_status;
  end if;

  if p_status = 'cancelled' then
    perform public._restock_order(p_order_id);
    update payments set status = 'failed' where order_id = p_order_id and status = 'pending';
  end if;
  update orders set status = p_status where id = p_order_id;
end $$;

-- Quyen goi ham (Postgres mac dinh cho PUBLIC execute -> thu lai).
revoke execute on function public._restock_order(uuid) from public, anon, authenticated;
revoke execute on function public.confirm_vnpay_payment(text, integer, boolean, text, jsonb) from public, anon, authenticated;
revoke execute on function public.expire_pending_orders(interval) from public, anon, authenticated;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.confirm_vnpay_payment(text, integer, boolean, text, jsonb) to service_role;
grant execute on function public.expire_pending_orders(interval) to service_role;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- M-2: khong ai (ke ca staff) UPDATE orders truc tiep qua API nua.
drop policy if exists "orders staff update" on public.orders;
revoke update on public.orders from anon, authenticated;

-- M-1: gioi han so luong moi dong gio (chan gom het kho bang 1 dong).
alter table public.cart_items add constraint cart_items_quantity_max check (quantity <= 99);

-- M-1: lich huy don qua han moi 5 phut (chi khi DB co pg_cron, vd Supabase cloud).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('expire-pending-orders', '*/5 * * * *', 'select public.expire_pending_orders()');
  end if;
end $$;
