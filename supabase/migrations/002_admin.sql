-- Frood admin & lifetime premium
-- Run AFTER 001_initial.sql.
-- To make a user admin (SQL editor, Supabase dashboard):
--   update public.profiles set is_admin = true where id = '<user-uuid>';

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists premium_lifetime boolean not null default false;

-- Helper used by RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Admins can read and update every profile (user management, premium grants).
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());