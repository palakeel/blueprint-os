-- Migration: Add account column to portfolio_positions and trade_history
-- Run this in your Supabase SQL Editor

-- Add account column with default 'Blueprint' for all existing rows
alter table portfolio_positions
  add column if not exists account text not null default 'Blueprint';

alter table trade_history
  add column if not exists account text not null default 'Blueprint';

-- Backfill existing rows (already handled by default, but explicit for clarity)
update portfolio_positions set account = 'Blueprint' where account = 'Blueprint';
update trade_history       set account = 'Blueprint' where account = 'Blueprint';
