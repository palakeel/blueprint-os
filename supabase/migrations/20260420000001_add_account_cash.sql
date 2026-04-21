-- Cash balances per investment account (separate from positions)
create table if not exists account_cash (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  account    text not null,
  balance    numeric(12, 2) not null default 0,
  updated_at timestamptz default now()
);

alter table account_cash enable row level security;
create policy "own_data" on account_cash for all using (auth.uid() = user_id);

-- One cash balance entry per user per account
create unique index if not exists account_cash_user_account on account_cash (user_id, account);
