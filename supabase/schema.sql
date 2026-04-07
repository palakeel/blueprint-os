-- Blueprint OS — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Net worth entries
create table if not exists net_worth_entries (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  entry_date       date not null,
  accounts         jsonb not null default '{}',
  total_assets     numeric(14, 2) not null default 0,
  total_liabilities numeric(14, 2) not null default 0,
  net_worth        numeric(14, 2) not null default 0,
  notes            text,
  created_at       timestamptz default now()
);

-- Budget entries
create table if not exists budget_entries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  week_start    date not null,
  week_end      date not null,
  categories    jsonb not null default '{}',
  total_spent   numeric(10, 2) not null default 0,
  weekly_score  int,
  notes         text,
  created_at    timestamptz default now()
);

-- Milestones
create table if not exists milestones (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  target_amount  numeric(14, 2) not null,
  current_amount numeric(14, 2) not null default 0,
  is_achieved    boolean not null default false,
  achieved_date  date,
  created_at     timestamptz default now()
);

-- Receivables
create table if not exists receivables (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  person_name   text not null,
  amount        numeric(10, 2) not null,
  description   text,
  created_date  date not null default current_date,
  received_date date,
  is_received   boolean not null default false
);

-- Portfolio positions
create table if not exists portfolio_positions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  ticker            text not null,
  shares            numeric(10, 4) not null default 0,
  avg_cost          numeric(10, 2) not null default 0,
  target_allocation numeric(5, 2),
  dca_biweekly      numeric(8, 2),
  notes             text,
  updated_at        timestamptz default now()
);

-- DCA confirmations
create table if not exists dca_confirmations (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  period_start date not null,
  all_fired    boolean not null default false,
  notes        text,
  created_at   timestamptz default now()
);

-- Gamification
create table if not exists gamification (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null unique,
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  last_entry_date  date,
  badges_earned    jsonb not null default '[]',
  weekly_scores    jsonb not null default '{}',
  created_at       timestamptz default now()
);

-- Row Level Security
alter table net_worth_entries   enable row level security;
alter table budget_entries      enable row level security;
alter table milestones          enable row level security;
alter table receivables         enable row level security;
alter table portfolio_positions enable row level security;
alter table dca_confirmations   enable row level security;
alter table gamification        enable row level security;

-- RLS Policies (users can only access their own data)
create policy "own_data" on net_worth_entries   for all using (auth.uid() = user_id);
create policy "own_data" on budget_entries      for all using (auth.uid() = user_id);
create policy "own_data" on milestones          for all using (auth.uid() = user_id);
create policy "own_data" on receivables         for all using (auth.uid() = user_id);
create policy "own_data" on portfolio_positions for all using (auth.uid() = user_id);
create policy "own_data" on dca_confirmations   for all using (auth.uid() = user_id);
create policy "own_data" on gamification        for all using (auth.uid() = user_id);

-- Seed milestones for a new user (call via Supabase Edge Function or manually)
-- insert into milestones (user_id, name, target_amount) values
--   ($USER_ID, 'Runway',          47000),
--   ($USER_ID, 'Foundation',      100000),
--   ($USER_ID, 'Freedom Starter', 500000),
--   ($USER_ID, 'FI Number',       1175000),
--   ($USER_ID, 'Trading FT',      3000000),
--   ($USER_ID, 'Generational',    10000000);
