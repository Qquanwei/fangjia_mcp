create table public.housing_filings (
  id text primary key,
  presale_permit text not null,
  building_no text,
  unit_no text,
  room_no text,
  filing_price_cny numeric(14, 2),
  house_code text,
  source_loaded_at timestamptz,
  synced_at timestamptz not null default now()
);

comment on table public.housing_filings is
  '杭州商品住房一房一价。filing_price_cny 是备案总价（元），不是单价或成交价。';

create index housing_filings_permit_idx
  on public.housing_filings (presale_permit);

create index housing_filings_house_code_idx
  on public.housing_filings (house_code);

create table public.sync_state (
  interface_id text primary key,
  next_page integer not null default 1,
  page_size integer not null default 100,
  rows_upserted bigint not null default 0,
  status text not null default 'idle',
  last_error text,
  last_success_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.housing_filings enable row level security;
alter table public.sync_state enable row level security;

create or replace function public.summarize_presale_permit(permit text)
returns table (
  unit_count bigint,
  min_price numeric,
  max_price numeric,
  avg_price numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint,
    min(filing_price_cny),
    max(filing_price_cny),
    round(avg(filing_price_cny), 2)
  from public.housing_filings
  where presale_permit = permit;
$$;

revoke all on function public.summarize_presale_permit(text) from public;
revoke all on function public.summarize_presale_permit(text) from anon, authenticated;
grant execute on function public.summarize_presale_permit(text) to service_role;
