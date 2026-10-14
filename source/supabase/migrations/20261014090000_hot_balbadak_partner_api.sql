-- Partner submissions are kept separate from member-authored HOT observations.
create table if not exists public.hot_partner_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'balbadak'),
  source_event_id text not null check (char_length(source_event_id) between 1 and 120),
  source_store_id text not null check (char_length(source_store_id) between 1 and 120),
  hot_store_id uuid references public.stores(id) on delete set null,
  store_name text check (store_name is null or char_length(store_name) <= 160),
  report_type text not null check (report_type in ('menu', 'spice', 'operating_status', 'visit')),
  menu_name text check (menu_name is null or char_length(menu_name) <= 120),
  spicy_level smallint check (spicy_level between 1 and 5),
  status_signal text check (status_signal in ('open', 'closed', 'sold_out')),
  reported_at timestamptz not null,
  report_count integer not null default 1 check (report_count between 1 and 1000000),
  review_status text not null default 'pending' check (review_status in ('pending', 'accepted', 'rejected')),
  received_at timestamptz not null default now(),
  unique (source, source_event_id),
  check (report_type <> 'spice' or (menu_name is not null and spicy_level is not null)),
  check (report_type <> 'menu' or menu_name is not null),
  check (report_type <> 'operating_status' or status_signal is not null)
);
create index if not exists hot_partner_reports_store_time_idx
  on public.hot_partner_reports (source_store_id, reported_at desc);
create index if not exists hot_partner_reports_pending_idx
  on public.hot_partner_reports (received_at desc) where review_status = 'pending';
alter table public.hot_partner_reports enable row level security;
revoke all on public.hot_partner_reports from public, anon, authenticated;
grant all on public.hot_partner_reports to service_role;
-- Only a server runtime holding the Supabase service-role key can insert or review partner rows.
