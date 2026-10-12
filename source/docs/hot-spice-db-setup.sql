-- HOT 8-stage spice rating schema; applied only in Nowgo-dev.
-- Do NOT alter legacy 1-5 taste observations.
create table if not exists public.hot_menu_spice_ratings (
  menu_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  level smallint not null check (level between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (menu_id,user_id)
);
create index if not exists hot_menu_spice_ratings_menu_idx on public.hot_menu_spice_ratings(menu_id);
alter table public.hot_menu_spice_ratings enable row level security;
revoke all on public.hot_menu_spice_ratings from anon,authenticated;
grant select,insert,update on public.hot_menu_spice_ratings to authenticated;

create policy "hot_member_read_own_rating" on public.hot_menu_spice_ratings
for select to authenticated using ((select auth.uid())=user_id);
create policy "hot_member_insert_own_rating" on public.hot_menu_spice_ratings
for insert to authenticated with check ((select auth.uid())=user_id);
create policy "hot_member_update_own_rating" on public.hot_menu_spice_ratings
for update to authenticated using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

-- Restricted aggregate-only interface. Does not expose user IDs/individual scores.
create or replace function public.hot_menu_spice_summary_for(p_menu_id uuid)
returns table(median_level double precision,rating_count bigint)
language sql stable security definer
set search_path=''
as $$
 select percentile_cont(0.5) within group(order by r.level)::double precision,
        count(*)::bigint
 from public.hot_menu_spice_ratings r where r.menu_id=p_menu_id
$$;
revoke all on function public.hot_menu_spice_summary_for(uuid) from public;
grant execute on function public.hot_menu_spice_summary_for(uuid) to anon,authenticated;

-- Before production: review access controls, menu identifier integrity,
-- NOWGO login E2E, rate limits, and verification of the real Vercel target.
