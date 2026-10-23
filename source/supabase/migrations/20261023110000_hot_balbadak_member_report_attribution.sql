begin;

create table if not exists public.hot_partner_member_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'balbadak'),
  referral_store_id text not null check (char_length(referral_store_id) between 1 and 120),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null,
  hot_store_id uuid null,
  created_at timestamptz not null default now(),
  unique (source, report_id)
);

comment on table public.hot_partner_member_reports is
  '발바닥 서명 유입을 통해 HOT 통합회원이 완료한 제보 귀속. 내부 회원 ID만 보관하며 파트너에 제공하지 않는다.';

create index if not exists hot_partner_member_reports_source_created_idx
  on public.hot_partner_member_reports (source, created_at desc);

create index if not exists hot_partner_member_reports_referral_store_idx
  on public.hot_partner_member_reports (source, referral_store_id, created_at desc);

alter table public.hot_partner_member_reports enable row level security;
revoke all on table public.hot_partner_member_reports from anon, authenticated;

commit;
