-- Add DCA frequency preference to account_cash
alter table account_cash add column if not exists dca_frequency text not null default 'biweekly';
