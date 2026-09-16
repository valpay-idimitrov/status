-- Run this in the Supabase SQL editor (or via the Supabase CLI) once,
-- against your project. Row Level Security stays ON (default) — nothing
-- can read or write these tables except the API routes, which use the
-- service role key and therefore bypass RLS entirely.

create table if not exists status_events (
  id bigint generated always as identity primary key,
  component_id text not null,
  status text not null check (status in ('operational', 'degraded_performance', 'partial_outage', 'major_outage')),
  started_at timestamptz not null,
  ended_at timestamptz
);

create index if not exists idx_status_events_component
  on status_events (component_id, started_at);

create table if not exists incidents (
  id bigint generated always as identity primary key,
  title text not null,
  affected_components jsonb not null,
  status text not null check (status in ('investigating', 'identified', 'monitoring', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists incident_updates (
  id bigint generated always as identity primary key,
  incident_id bigint not null references incidents (id),
  status text not null check (status in ('investigating', 'identified', 'monitoring', 'resolved')),
  body text not null,
  created_at timestamptz not null default now()
);

-- Confirm RLS is enabled (it is by default on new Supabase tables, but
-- worth checking explicitly since these tables are otherwise unprotected):
alter table status_events enable row level security;
alter table incidents enable row level security;
alter table incident_updates enable row level security;
-- No policies are added — with RLS on and no policies, only the service
-- role key (used server-side in /api routes) can touch these tables.
