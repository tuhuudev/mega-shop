-- Minimal stand-in for the parts of Supabase the migrations rely on, so RLS can be
-- tested on a plain postgres:16 container (no Supabase CLI needed).
-- Mirrors Supabase: API roles, auth.users, auth.uid() from JWT claims, and the
-- default grants Supabase gives anon/authenticated/service_role on schema public.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id                 uuid primary key,
  raw_user_meta_data jsonb
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
