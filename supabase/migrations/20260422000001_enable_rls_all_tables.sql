-- Enable RLS and add user-scoped policies on all tables that were
-- created before the migrations system enforced it.

-- net_worth_entries
alter table net_worth_entries enable row level security;
create policy "Users manage own net_worth_entries"
  on net_worth_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- budget_entries
alter table budget_entries enable row level security;
create policy "Users manage own budget_entries"
  on budget_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- milestones
alter table milestones enable row level security;
create policy "Users manage own milestones"
  on milestones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- receivables
alter table receivables enable row level security;
create policy "Users manage own receivables"
  on receivables for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- portfolio_positions
alter table portfolio_positions enable row level security;
create policy "Users manage own portfolio_positions"
  on portfolio_positions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- gamification
alter table gamification enable row level security;
create policy "Users manage own gamification"
  on gamification for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
