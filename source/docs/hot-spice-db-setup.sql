-- DRAFT ONLY: review on a staging project before running.
-- Legacy hot_taste_observations.heat uses a different 1-5 workflow; do NOT alter it.
create table if not exists public.hot_menu_spice_ratings (
  menu_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  level smallint not null check (level between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (menu_id, user_id)
);

create index if not exists hot_menu_spice_ratings_menu_id_idx
  on public.hot_menu_spice_ratings(menu_id);

alter table public.hot_menu_spice_ratings enable row level security;

-- Reading ratings is public; users may write ONLY their own ratings.
-- The GET endpoint returns aggregate summaries rather than raw user records.
drop policy if exists "hot spice ratings public read" on public.hot_menu_spice_ratings;
create policy "hot spice ratings public read"
on public.hot_menu_spice_ratings for select to anon, authenticated using (true);

drop policy if exists "hot spice ratings member insert" on public.hot_menu_spice_ratings;
create policy "hot spice ratings member insert"
on public.hot_menu_spice_ratings for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "hot spice ratings member update" on public.hot_menu_spice_ratings;
create policy "hot spice ratings member update"
on public.hot_menu_spice_ratings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.hot_menu_spice_ratings to anon, authenticated;
grant insert, update on public.hot_menu_spice_ratings to authenticated;

-- SECURITY INVOKER ensures existing RLS policies remain in force.
create or replace view public.hot_menu_spice_summary
with (security_invoker = true) as
select menu_id,
       count(*)::integer as rating_count,
       percentile_cont(0.5) within group (order by level) as median_level
from public.hot_menu_spice_ratings
group by menu_id;

grant select on public.hot_menu_spice_summary to anon, authenticated;
