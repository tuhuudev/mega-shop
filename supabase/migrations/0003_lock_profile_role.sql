-- ============================================================
-- 0003: chan khach tu nang quyen qua profiles.role
--
-- Lo hong o 0001: policy "profiles self update" chi co USING (id = auth.uid()), khong gioi han cot.
-- Khach dang nhap goi thang PostgREST:  update profiles set role = 'admin' where id = <minh>
-- -> is_staff() = true -> ghi duoc products/categories, doc/sua moi orders (RLS staff).
--
-- Sua 2 lop:
--  1. Quyen cot: authenticated chi duoc UPDATE cot full_name (role/id/created_at bi tu choi).
--  2. Policy WITH CHECK: role sau khi sua phai bang role hien tai (phong khi ai do grant lai ca bang).
-- Doi role cho staff/admin: lam bang service role / SQL Editor (bypass RLS + grant).
-- ============================================================

revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );
