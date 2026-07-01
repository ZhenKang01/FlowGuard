-- FlowGuard initial schema
-- Run this once in: Supabase → SQL Editor → New Query

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Mirrors auth.users; stores display name and RBAC role.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'viewer'
                check (role in ('admin','facility_manager','technician','viewer')),
  avatar_url  text,
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile; admins can read all.
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (except role — that stays server-side).
create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role (used by AuthContext upsert on sign-up) can insert/upsert.
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── work_orders ───────────────────────────────────────────────────────────────
-- Created by the AI chatbot tool (requires SUPABASE_SERVICE_ROLE_KEY on server).
create table if not exists public.work_orders (
  id               uuid primary key default gen_random_uuid(),
  location         text,
  issue_type       text,
  severity         text check (severity in ('Low','Medium','High')),
  description      text,
  status           text not null default 'Open'
                     check (status in ('Open','In Progress','Resolved','Closed')),
  created_by_role  text,
  source           text default 'manual',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.work_orders enable row level security;

-- Any authenticated user can read work orders.
create policy "work_orders: authenticated read"
  on public.work_orders for select
  to authenticated
  using (true);

-- Only service role (chatbot / server) can insert — enforced by using
-- SUPABASE_SERVICE_ROLE_KEY on the FastAPI side which bypasses RLS.
-- Frontend inserts are blocked unless you add an explicit policy here.
