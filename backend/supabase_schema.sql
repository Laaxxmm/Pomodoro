-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- TASKS TABLE
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  deadline text,
  estimated_minutes integer default 25,
  category text default 'general',
  source text default 'manual',
  source_id text,
  priority_score integer default 0,
  priority_reason text default '',
  completed boolean default false,
  started_at timestamptz,
  completed_at timestamptz,
  time_spent_seconds integer default 0,
  created_at timestamptz default now(),
  scheduled_date date default current_date,
  rollover_count integer default 0
);

-- DAILY PLANS TABLE
create table public.daily_plans (
  id uuid primary key default uuid_generate_v4(),
  date date unique not null,
  task_ids uuid[] default '{}',
  prioritization_reason text default '',
  created_at timestamptz default now()
);

-- POMODORO SESSIONS TABLE
create table public.pomodoro_sessions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds integer default 0,
  session_type text default 'work',
  completed boolean default false
);

-- SETTINGS TABLE
create table public.settings (
  id text primary key default 'user_settings',
  pomodoro_work_minutes integer default 25,
  pomodoro_short_break integer default 5,
  pomodoro_long_break integer default 15,
  daily_task_limit integer default 4,
  auto_rollover boolean default true,
  google_calendar_connected boolean default false,
  gmail_connected boolean default false,
  google_access_token text,
  google_refresh_token text,
  google_token_expiry timestamptz,
  google_email text,
  dark_mode boolean default false
);

-- Initialize default settings
insert into public.settings (id) values ('user_settings') on conflict (id) do nothing;
