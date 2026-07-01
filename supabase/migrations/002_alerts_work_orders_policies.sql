-- ── alerts table ─────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id              uuid primary key default gen_random_uuid(),
  meter_id        text not null,
  score           float not null,
  threshold       float not null,
  severity        text not null check (severity in ('low','medium','high')),
  timestamp       timestamptz not null,
  status          text not null default 'active'
                    check (status in ('active','pending_approval','approved','resolved')),
  recommendation  text default '',
  needs_approval  boolean not null default false,
  message         text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.alerts enable row level security;

create policy "alerts: authenticated read"
  on public.alerts for select
  to authenticated using (true);

create policy "alerts: authenticated update status"
  on public.alerts for update
  to authenticated using (true) with check (true);

-- ── work_orders: frontend insert/update policies ──────────────────────────────
create policy "work_orders: authenticated insert"
  on public.work_orders for insert
  to authenticated with check (true);

create policy "work_orders: authenticated update status"
  on public.work_orders for update
  to authenticated using (true) with check (true);
