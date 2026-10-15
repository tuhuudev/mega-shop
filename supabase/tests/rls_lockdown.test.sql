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

reset role;
do $$
begin
  if current_setting('test.failures')::int > 0 then
    raise exception '% check(s) failed', current_setting('test.failures');
  end if;
  raise notice 'ALL CHECKS PASSED';
end $$;
