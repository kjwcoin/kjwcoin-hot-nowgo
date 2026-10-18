create table if not exists public.hot_partner_conversions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'balbadak'),
  referral_store_id text not null check (char_length(referral_store_id) between 1 and 120),
  hot_store_id uuid not null references public.stores(id) on delete restrict,
  status text not null default 'approved' check (status in ('approved', 'reversed')),
  converted_at timestamptz not null default now(),
  unique (source, hot_store_id)
);
create index if not exists hot_partner_conversions_month_idx
  on public.hot_partner_conversions (source, converted_at) where status = 'approved';
alter table public.hot_partner_conversions enable row level security;
revoke all on public.hot_partner_conversions from public, anon, authenticated;
grant all on public.hot_partner_conversions to service_role;
