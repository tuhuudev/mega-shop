-- RLS lockdown tests (audit C-1, C-2, H-1) + place_order regression.
-- Run via supabase/tests/run-rls-tests.sh. Each check prints PASS/FAIL; the last
-- block raises if any check failed, so the script exits non-zero.

select set_config('test.failures', '0', false);

create function pg_temp.fail(msg text) returns void language plpgsql as $$
begin
  perform set_config('test.failures', (current_setting('test.failures')::int + 1)::text, false);
  raise notice 'FAIL %', msg;
end $$;
grant execute on function pg_temp.fail(text) to authenticated, service_role;

-- ---- fixtures (as superuser) ----
insert into auth.users (id, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '{"full_name":"Alice"}');
insert into public.products (id, name, slug, price, stock)
values ('22222222-2222-2222-2222-222222222222', 'Phone', 'phone', 100000, 10);

-- ---- act as a normal signed-in customer ----
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);

-- Regression: normal checkout through place_order still works.
insert into public.carts (user_id) values (auth.uid());
insert into public.cart_items (cart_id, product_id, quantity)
select id, '22222222-2222-2222-2222-222222222222', 2 from public.carts where user_id = auth.uid();
select set_config('test.order_id',
  public.place_order('Alice', '0901234567', '1 Le Loi, Q1', null)::text, false);

do $$
declare o record; s int;
begin
  select status, total_amount into o from public.orders where id = current_setting('test.order_id')::uuid;
  select stock into s from public.products where id = '22222222-2222-2222-2222-222222222222';
  if o.status = 'pending' and o.total_amount = 200000 and s = 8 then
    raise notice 'PASS place_order creates a pending order with DB prices and decrements stock';
  else
    perform pg_temp.fail(format('place_order: status=%s total=%s stock=%s', o.status, o.total_amount, s));
  end if;
end $$;

-- Regression: a user can still edit their own display name.
do $$
declare n int;
begin
  update public.profiles set full_name = 'Alice B' where id = auth.uid();
  get diagnostics n = row_count;
  if n = 1 then raise notice 'PASS user can update own full_name';
  else perform pg_temp.fail('user cannot update own full_name'); end if;
exception when insufficient_privilege then
  perform pg_temp.fail('user cannot update own full_name (permission denied)');
end $$;

-- C-1: self-promotion to admin.
do $$
begin
  update public.profiles set role = 'admin' where id = auth.uid();
  perform pg_temp.fail('C-1 user set own role to admin');
exception when insufficient_privilege then
  raise notice 'PASS C-1 user cannot change own role';
end $$;

-- C-2a: forged order inserted directly as already paid.
do $$
begin
  insert into public.orders (user_id, status, total_amount, recipient_name, phone, address)
  values (auth.uid(), 'paid', 0, 'x', '0900000000', 'x');
  perform pg_temp.fail('C-2 user inserted an order with status=paid, total=0');
exception when insufficient_privilege then
  raise notice 'PASS C-2 user cannot insert orders directly';
end $$;

-- C-2b: extra free line item added to an existing order.
do $$
begin
  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  values (current_setting('test.order_id')::uuid, '22222222-2222-2222-2222-222222222222', 'Phone', 0, 5, 0);
  perform pg_temp.fail('C-2 user inserted a 0-price order_item');
exception when insufficient_privilege then
  raise notice 'PASS C-2 user cannot insert order_items directly';
end $$;

-- H-1: fake successful payment record.
do $$
begin
  insert into public.payments (order_id, amount, status, txn_ref, transaction_no)
  values (current_setting('test.order_id')::uuid, 1, 'success', 'FAKE-1', '14012345');
  perform pg_temp.fail('H-1 user inserted a payment with status=success');
exception when insufficient_privilege then
  raise notice 'PASS H-1 user cannot insert payments';
end $$;

-- Regression: the server (service role) can still record a pending payment.
reset role;
set role service_role;
do $$
begin
  insert into public.payments (order_id, amount, status, txn_ref)
  values (current_setting('test.order_id')::uuid, 200000, 'pending', 'TXN-OK-1');
  raise notice 'PASS service role can insert a pending payment';
exception when others then
  perform pg_temp.fail('service role cannot insert payment: ' || sqlerrm);
end $$;

-- ============================================================
-- 0004: payment confirmation, order expiry, status rules (H-2, M-1, M-2)
-- Every block catches all errors so a missing function counts as a FAIL.
-- ============================================================

-- H-2: confirm_vnpay_payment (service role). Payment TXN-OK-1 = 200000 for test.order_id.
do $$
declare r text; st text;
begin
  r := public.confirm_vnpay_payment('NO-SUCH-TXN', 200000, true, 'T0', '{}'::jsonb);
  if r = 'not_found' then raise notice 'PASS confirm: unknown txn -> not_found';
  else perform pg_temp.fail('confirm unknown txn returned ' || r); end if;

  r := public.confirm_vnpay_payment('TXN-OK-1', 1000, true, 'T1', '{}'::jsonb);
  select status into st from public.orders where id = current_setting('test.order_id')::uuid;
  if r = 'invalid_amount' and st = 'pending' then raise notice 'PASS confirm: wrong amount -> invalid_amount, order stays pending';
  else perform pg_temp.fail(format('confirm wrong amount returned %s, order %s', r, st)); end if;

  r := public.confirm_vnpay_payment('TXN-OK-1', 200000, true, 'T2', '{"vnp_ResponseCode":"00"}'::jsonb);
  select status into st from public.orders where id = current_setting('test.order_id')::uuid;
  if r = 'paid' and st = 'paid' then raise notice 'PASS confirm: valid payment -> order paid';
  else perform pg_temp.fail(format('confirm valid returned %s, order %s', r, st)); end if;

  r := public.confirm_vnpay_payment('TXN-OK-1', 200000, true, 'T2', '{}'::jsonb);
  if r = 'already_confirmed' then raise notice 'PASS confirm: second call (IPN + return) -> already_confirmed';
  else perform pg_temp.fail('confirm second call returned ' || r); end if;
exception when others then
  perform pg_temp.fail('confirm_vnpay_payment: ' || sqlerrm);
end $$;

-- Customer places a second order (stock 8 -> 6) and a third (6 -> 5).
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
do $$
begin
  insert into public.cart_items (cart_id, product_id, quantity)
  select id, '22222222-2222-2222-2222-222222222222', 2 from public.carts where user_id = auth.uid();
  perform set_config('test.order2', public.place_order('Alice', '0901234567', '1 Le Loi, Q1', null)::text, false);
  insert into public.cart_items (cart_id, product_id, quantity)
  select id, '22222222-2222-2222-2222-222222222222', 1 from public.carts where user_id = auth.uid();
  perform set_config('test.order3', public.place_order('Alice', '0901234567', '1 Le Loi, Q1', null)::text, false);
exception when others then
  perform pg_temp.fail('setup extra orders: ' || sqlerrm);
end $$;

-- Customers cannot call the server-only functions.
do $$
begin
  perform public.confirm_vnpay_payment('TXN-OK-1', 200000, true, 'X', '{}'::jsonb);
  perform pg_temp.fail('customer called confirm_vnpay_payment');
exception when insufficient_privilege then
  raise notice 'PASS customer cannot call confirm_vnpay_payment';
when others then perform pg_temp.fail('confirm as customer: ' || sqlerrm);
end $$;
do $$
begin
  perform public.expire_pending_orders();
  perform pg_temp.fail('customer called expire_pending_orders');
exception when insufficient_privilege then
  raise notice 'PASS customer cannot call expire_pending_orders';
when others then perform pg_temp.fail('expire as customer: ' || sqlerrm);
end $$;

-- M-2: customer cannot change order status, directly or via RPC.
do $$
begin
  perform public.set_order_status(current_setting('test.order3')::uuid, 'cancelled');
  perform pg_temp.fail('customer changed order status via set_order_status');
exception when insufficient_privilege then
  raise notice 'PASS customer cannot call set_order_status';
when others then perform pg_temp.fail('set_order_status as customer: ' || sqlerrm);
end $$;

-- M-1: cart line quantity is capped at 99.
do $$
begin
  insert into public.cart_items (cart_id, product_id, quantity)
  select id, '22222222-2222-2222-2222-222222222222', 100 from public.carts where user_id = auth.uid();
  perform pg_temp.fail('cart line accepted quantity 100');
exception when check_violation then
  raise notice 'PASS cart line quantity capped at 99';
when others then perform pg_temp.fail('cart cap: ' || sqlerrm);
end $$;

-- M-1: expire_pending_orders cancels stale orders and restocks.
reset role;
update public.orders set created_at = now() - interval '1 hour'
where id = nullif(current_setting('test.order2', true), '')::uuid;
insert into public.payments (order_id, amount, status, txn_ref)
select id, total_amount, 'pending', 'TXN-STALE-1' from public.orders
where id = nullif(current_setting('test.order2', true), '')::uuid;
set role service_role;
do $$
declare n int; st text; ps text; s int;
begin
  n := public.expire_pending_orders();
  select status into st from public.orders where id = current_setting('test.order2')::uuid;
  select status into ps from public.payments where txn_ref = 'TXN-STALE-1';
  select stock into s from public.products where id = '22222222-2222-2222-2222-222222222222';
  if n = 1 and st = 'cancelled' and ps = 'failed' and s = 7 then
    raise notice 'PASS expire: stale order cancelled, payment failed, stock restored (5 -> 7)';
  else
    perform pg_temp.fail(format('expire: n=%s order=%s payment=%s stock=%s', n, st, ps, s));
  end if;
exception when others then
  perform pg_temp.fail('expire_pending_orders: ' || sqlerrm);
end $$;

-- M-1/M-2: staff status rules.
reset role;
insert into auth.users (id, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', '{"full_name":"Bob"}');
update public.profiles set role = 'staff' where id = '33333333-3333-3333-3333-333333333333';
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);

do $$
begin
  update public.orders set status = 'shipped' where id = current_setting('test.order3')::uuid;
  perform pg_temp.fail('staff updated orders directly');
exception when insufficient_privilege then
  raise notice 'PASS staff cannot update orders directly';
when others then perform pg_temp.fail('staff direct update: ' || sqlerrm);
end $$;

do $$
begin
  perform public.set_order_status(current_setting('test.order3')::uuid, 'paid');
  perform pg_temp.fail('staff moved pending -> paid');
exception when others then
  if sqlerrm like 'INVALID_TRANSITION%' then raise notice 'PASS staff cannot mark pending order as paid';
  else perform pg_temp.fail('pending->paid: ' || sqlerrm); end if;
end $$;

do $$
declare st text; s int;
begin
  perform public.set_order_status(current_setting('test.order_id')::uuid, 'shipped');
  select status into st from public.orders where id = current_setting('test.order_id')::uuid;
  if st = 'shipped' then raise notice 'PASS staff paid -> shipped';
  else perform pg_temp.fail('paid->shipped left status ' || st); end if;

  perform public.set_order_status(current_setting('test.order3')::uuid, 'cancelled');
  select status into st from public.orders where id = current_setting('test.order3')::uuid;
  select stock into s from public.products where id = '22222222-2222-2222-2222-222222222222';
  if st = 'cancelled' and s = 8 then raise notice 'PASS staff pending -> cancelled restocks (7 -> 8)';
  else perform pg_temp.fail(format('pending->cancelled: status=%s stock=%s', st, s)); end if;
exception when others then
  perform pg_temp.fail('staff transitions: ' || sqlerrm);
end $$;

reset role;
do $$
begin
  if current_setting('test.failures')::int > 0 then
    raise exception '% check(s) failed', current_setting('test.failures');
  end if;
  raise notice 'ALL CHECKS PASSED';
end $$;
