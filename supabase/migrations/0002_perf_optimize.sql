-- ============================================================
-- 0002 perf optimize (theo Supabase performance advisor):
--  (a) Boc auth.uid() trong (select ...) -> Postgres eval 1 lan, khong lap moi dong (initplan)
--  (b) Them index cho FK con thieu
--  (c) Tach policy 'for all' (write) thanh insert/update/delete -> tranh trung permissive SELECT
-- ============================================================

-- (b) FK indexes con thieu
create index if not exists idx_cart_items_product  on public.cart_items  (product_id);
create index if not exists idx_order_items_product on public.order_items (product_id);

-- (a)+(c) profiles
drop policy "profiles self read"   on public.profiles;
drop policy "profiles self update" on public.profiles;
create policy "profiles self read"   on public.profiles for select
  using (id = (select auth.uid()) or public.is_staff());
create policy "profiles self update" on public.profiles for update
  using (id = (select auth.uid()));

-- (c) categories: tach write thanh insert/update/delete
drop policy "categories write" on public.categories;
create policy "categories insert" on public.categories for insert with check (public.is_staff());
create policy "categories update" on public.categories for update using (public.is_staff()) with check (public.is_staff());
create policy "categories delete" on public.categories for delete using (public.is_staff());

-- (c) products: tach write thanh insert/update/delete
drop policy "products write" on public.products;
create policy "products insert" on public.products for insert with check (public.is_staff());
create policy "products update" on public.products for update using (public.is_staff()) with check (public.is_staff());
create policy "products delete" on public.products for delete using (public.is_staff());

-- (a) carts
drop policy "carts owner" on public.carts;
create policy "carts owner" on public.carts for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- (a) cart_items
drop policy "cart_items owner" on public.cart_items;
create policy "cart_items owner" on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

-- (a) orders
drop policy "orders read"   on public.orders;
drop policy "orders insert" on public.orders;
create policy "orders read"   on public.orders for select using (user_id = (select auth.uid()) or public.is_staff());
create policy "orders insert" on public.orders for insert with check (user_id = (select auth.uid()));

-- (a) order_items
drop policy "order_items read"   on public.order_items;
drop policy "order_items insert" on public.order_items;
create policy "order_items read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_staff())));
create policy "order_items insert" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- (a) payments
drop policy "payments read"             on public.payments;
drop policy "payments insert own order" on public.payments;
create policy "payments read" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_staff())));
create policy "payments insert own order" on public.payments for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = (select auth.uid()) and o.status = 'pending'
  ));
