create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  date         date not null,
  description  text not null,
  amount       numeric(10,2) not null,
  category     text not null,
  notes        text,
  created_at   timestamptz default now()
);

alter table expenses enable row level security;

create policy "Users manage own expenses"
  on expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists expenses_user_date on expenses (user_id, date desc);
