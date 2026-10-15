-- ============================================================
-- Mega Shop — setup database (chay 1 lan trong Supabase SQL Editor)
-- Gom: 0001_init.sql (schema + RLS + RPC) ROI seed.sql (du lieu mau) ROI 0003_lockdown_rls.sql ROI 0004_payments_orders.sql
-- ============================================================

-- ============================================================
-- mega-shop schema + RLS  (Supabase / Postgres)
-- Tien luu INTEGER (dong VND) de tranh sai so floating point.
-- ============================================================
create extension if not exists "pgcrypto";

-- ---- profiles: 1-1 voi auth.users, giu role ----
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'customer' check (role in ('customer','staff','admin')),
  created_at  timestamptz not null default now()
);

-- Tu tao profile khi co user moi (Supabase Auth).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: kiem tra role staff/admin (dung trong RLS policy).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'));
$$;

-- ---- categories ----
create table public.categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text not null unique
);

-- ---- products ----
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text,
  price        integer not null check (price >= 0),
  stock        integer not null default 0 check (stock >= 0),
  image_url    text,
  category_id  uuid references public.categories (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_products_category on public.products (category_id);
create index idx_products_created on public.products (created_at desc);

-- ---- carts + cart_items (gio theo user) ----
create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create table public.cart_items (
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  primary key (cart_id, product_id)
);

-- ---- orders + order_items ----
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','paid','shipped','cancelled')),
  total_amount   integer not null check (total_amount >= 0),
  recipient_name text not null,
  phone          text not null,
  address        text not null,
  note           text,
  created_at     timestamptz not null default now()
);
create index idx_orders_user on public.orders (user_id);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price   integer not null,
  quantity     integer not null check (quantity > 0),
  line_total   integer not null
);
create index idx_order_items_order on public.order_items (order_id);

-- ---- payments (giao dich VNPay) ----
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  provider     text not null default 'vnpay',
  amount       integer not null,
  status       text not null default 'pending' check (status in ('pending','success','failed')),
  txn_ref      text not null unique,         -- vnp_TxnRef
  transaction_no text,                        -- vnp_TransactionNo
  raw          jsonb,                         -- luu nguyen response de doi soat
  created_at   timestamptz not null default now()
);
create index idx_payments_order on public.payments (order_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.carts       enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.payments    enable row level security;

-- profiles: chu so huu doc/sua chinh minh; staff doc tat ca.
create policy "profiles self read"  on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles self update" on public.profiles for update using (id = auth.uid());

-- catalog: ai cung DOC duoc; chi staff GHI.
create policy "categories read" on public.categories for select using (true);
create policy "categories write" on public.categories for all using (public.is_staff()) with check (public.is_staff());
create policy "products read" on public.products for select using (true);
create policy "products write" on public.products for all using (public.is_staff()) with check (public.is_staff());

-- cart: chi chu so huu.
create policy "carts owner" on public.carts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items owner" on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- orders: chu so huu doc cua minh; staff doc tat ca; tao boi chu so huu.
create policy "orders read" on public.orders for select using (user_id = auth.uid() or public.is_staff());
create policy "orders insert" on public.orders for insert with check (user_id = auth.uid());
create policy "orders staff update" on public.orders for update using (public.is_staff());
create policy "order_items read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
create policy "order_items insert" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- payments: chu don doc; UPDATE do SERVICE ROLE (return/IPN handler) bypass RLS.
create policy "payments read" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
-- Chu don duoc INSERT payment pending cho don PENDING cua chinh minh (route create chay bang client user).
create policy "payments insert own order" on public.payments for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid() and o.status = 'pending'
  ));

-- ============================================================
-- RPC: dat hang nguyen tu (tru ton kho + tao order + items) - goi tu Server Action.
-- ============================================================
create or replace function public.place_order(
  p_recipient text, p_phone text, p_address text, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cart_id uuid;
  v_order_id uuid;
  v_total integer := 0;
  r record;
begin
  select id into v_cart_id from carts where user_id = auth.uid();
  if v_cart_id is null then raise exception 'CART_EMPTY'; end if;

  -- Khoa cac dong san pham trong gio de tru ton an toan.
  for r in
    select ci.product_id, ci.quantity, p.name, p.price, p.stock
    from cart_items ci join products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id
    for update of p
  loop
    if r.stock < r.quantity then raise exception 'OUT_OF_STOCK:%', r.name; end if;
    v_total := v_total + r.price * r.quantity;
  end loop;
  if v_total = 0 then raise exception 'CART_EMPTY'; end if;

  insert into orders (user_id, status, total_amount, recipient_name, phone, address, note)
  values (auth.uid(), 'pending', v_total, p_recipient, p_phone, p_address, p_note)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  select v_order_id, ci.product_id, p.name, p.price, ci.quantity, p.price * ci.quantity
  from cart_items ci join products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  update products p set stock = stock - ci.quantity
  from cart_items ci where ci.cart_id = v_cart_id and ci.product_id = p.id;

  delete from cart_items where cart_id = v_cart_id;
  return v_order_id;
end; $$;

-- ================== SEED ==================
-- Du lieu mau (chay sau migration de co san pham hien thi).
insert into public.categories (name, slug) values
  ('Cà phê', 'ca-phe'), ('Trà', 'tra'), ('Phụ kiện', 'phu-kien')
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, stock, category_id)
select v.name, v.slug, v.description, v.price, v.stock,
       (select id from public.categories where slug = v.cat)
from (values
  ('Cà phê Arabica 250g', 'ca-phe-arabica-250g', 'Hạt rang vừa, hương hoa.', 145000, 40, 'ca-phe'),
  ('Cà phê Robusta 500g', 'ca-phe-robusta-500g', 'Đậm, mạnh, phù hợp phin.', 165000, 25, 'ca-phe'),
  ('Trà ô long thượng hạng', 'tra-o-long', 'Hậu ngọt, hương lan.', 210000, 15, 'tra'),
  ('Phin pha cà phê inox', 'phin-inox', 'Inox 304, giữ nhiệt tốt.', 89000, 60, 'phu-kien')
) as v(name, slug, description, price, stock, cat)
on conflict (slug) do nothing;

-- ================== SECURITY LOCKDOWN (= migrations/0003_lockdown_rls.sql) ==================
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

-- ================== PAYMENTS + ORDERS INTEGRITY (= migrations/0004_payments_orders.sql) ==================
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
