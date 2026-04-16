-- Migration: Add watchlist table for saved stock lookups
-- Run in Supabase SQL Editor

create table if not exists watchlist (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  ticker       text not null,
  company_name text,
  analysis     jsonb not null default '{}', -- { thesis, risk, note, funds, sc }
  price_at_add numeric(10, 2),
  added_at     timestamptz default now()
);

alter table watchlist enable row level security;
create policy "own_data" on watchlist for all using (auth.uid() = user_id);

-- Unique per user per ticker (one saved analysis per stock)
create unique index if not exists watchlist_user_ticker
  on watchlist (user_id, ticker);
