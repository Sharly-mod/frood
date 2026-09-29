-- Frood initial schema
-- Set up: create a Supabase project, run this file in the SQL editor (or via supabase CLI),
-- then enable Google + email/password providers in Authentication settings.

-- ------------------------- profiles -------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'premium', 'trialing', 'canceled', 'incomplete')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id);

-- ------------------------- favorites -------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

alter table public.favorites enable row level security;

create policy "Favorites are viewable by their owner"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Favorites are insertable by their owner"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Favorites are deletable by their owner"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ------------------------- tournaments -------------------------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  winner_restaurant_id text not null,
  participant_ids text[] not null,
  budget text,
  created_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

create policy "Tournaments are viewable by their owner"
  on public.tournaments for select
  using (auth.uid() = user_id);

create policy "Tournaments are insertable by their owner"
  on public.tournaments for insert
  with check (auth.uid() = user_id);

create policy "Tournaments are deletable by their owner"
  on public.tournaments for delete
  using (auth.uid() = user_id);

-- ------------------------- subscriptions -------------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'incomplete',
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Subscriptions are viewable by their owner"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Subscriptions are updatable by their owner"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- ------------------------- triggers -------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'displayName', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();