-- Future 4.1: 30-day Pro trial support
-- Run once in Supabase SQL Editor after launch-schema.sql.
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
