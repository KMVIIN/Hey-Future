-- Future MVP: Day 1 schema, ready for Supabase/Postgres on Day 2.
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('person','preference','important_date','trip','note')),
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done','cancelled')),
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  delivered_at timestamptz,
  raw_text text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks(user_id, due_at);
create index if not exists events_user_starts_idx on public.events(user_id, starts_at);
create index if not exists reminders_user_remind_idx on public.reminders(user_id, remind_at);
create index if not exists memories_user_kind_idx on public.memories(user_id, kind);

alter table public.memories enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.reminders enable row level security;
