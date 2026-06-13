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
