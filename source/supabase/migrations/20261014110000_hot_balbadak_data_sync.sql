-- The Balbadak ID is a footprint ID, not a physical-shop ID. Keep rows separate.
create table if not exists public.hot_partner_stores (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'balbadak'),
  source_store_id text not null check (char_length(source_store_id) between 1 and 120),
  store_name text not null check (char_length(store_name) between 1 and 160),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source_created_at timestamptz not null,
  source_updated_at timestamptz not null,
  derived_address text check (derived_address is null or char_length(derived_address) <= 300),
  match_status text not null default 'unmatched' check (match_status in ('unmatched','candidate','confirmed','rejected')),
  received_at timestamptz not null default now(),
  unique (source, source_store_id)
);
create index if not exists hot_partner_stores_name_location_idx
 on public.hot_partner_stores (store_name, latitude, longitude);
create table if not exists public.hot_partner_store_metrics (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'balbadak'),
  source_store_id text not null check (char_length(source_store_id) between 1 and 120),
  metric_date date not null,
  like_count integer not null check (like_count >= 0),
  save_count integer not null check (save_count >= 0),
  unique_interest_count integer not null check (unique_interest_count >= 0),
  view_count integer check (view_count is null or view_count >= 0),
  source_updated_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (source, source_store_id, metric_date)
);
create index if not exists hot_partner_store_metrics_date_idx on public.hot_partner_store_metrics (metric_date desc, source_store_id);
alter table public.hot_partner_stores enable row level security;
alter table public.hot_partner_store_metrics enable row level security;
revoke all on public.hot_partner_stores, public.hot_partner_store_metrics from public, anon, authenticated;
grant all on public.hot_partner_stores, public.hot_partner_store_metrics to service_role;

-- Ignore out-of-order partner webhook deliveries so stale snapshots cannot roll data back.
create or replace function public.hot_partner_keep_latest_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (to_jsonb(new)->>'source_updated_at')::timestamptz < (to_jsonb(old)->>'source_updated_at')::timestamptz then
    return null;
  end if;
  return new;
end; $$;
revoke all on function public.hot_partner_keep_latest_snapshot() from public, anon, authenticated;
create trigger hot_partner_stores_latest_snapshot before update on public.hot_partner_stores
for each row execute function public.hot_partner_keep_latest_snapshot();
create trigger hot_partner_metrics_latest_snapshot before update on public.hot_partner_store_metrics
for each row execute function public.hot_partner_keep_latest_snapshot();
