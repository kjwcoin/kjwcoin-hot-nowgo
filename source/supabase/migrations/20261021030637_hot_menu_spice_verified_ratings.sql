-- Menu-specific community spice ratings. No payment or entitlement changes.
-- Menu IDs come from the canonical HOT catalog, which combines public experience
-- menus and owner menus. A single table FK cannot represent that union.
-- Owner-declared heat remains in the catalog; this table stores member ratings.

create schema if not exists nowgo_hot_private;
revoke all on schema nowgo_hot_private from public, anon, authenticated;
grant usage on schema nowgo_hot_private to anon, authenticated, service_role;

create table if not exists public.hot_menu_spice_ratings (
  menu_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  level smallint not null check (level between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (menu_id, user_id)
);
create index if not exists hot_menu_spice_ratings_user_idx
  on public.hot_menu_spice_ratings(user_id);
alter table public.hot_menu_spice_ratings enable row level security;

-- Do not silently retain an unreviewed permissive SELECT policy if the table
-- changed after the schema snapshot; RLS policies combine with OR by default.
do $policies$
begin
  if exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='hot_menu_spice_ratings'
      and policyname not in (
        'hot_member_insert_own_rating',
        'hot_member_update_own_rating',
        'hot_member_read_own_rating'
      )
  ) then raise exception 'unexpected_hot_spice_rating_policy'; end if;
end;
$policies$;

-- Client writes are exclusively through the validated RPC. Authenticated users
-- can read their own saved row to verify the application round trip.
revoke all on table public.hot_menu_spice_ratings from public, anon, authenticated;
grant select on table public.hot_menu_spice_ratings to authenticated;
drop policy if exists hot_member_insert_own_rating on public.hot_menu_spice_ratings;
drop policy if exists hot_member_update_own_rating on public.hot_menu_spice_ratings;
drop policy if exists hot_member_read_own_rating on public.hot_menu_spice_ratings;
create policy hot_member_read_own_rating on public.hot_menu_spice_ratings
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false)
  );

-- Fail closed if another upsert signature appeared after review. PostgREST must
-- resolve one public (uuid, integer) signature for the JSON-number API argument.
do $signatures$
begin
  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='hot_menu_spice_upsert'
      and p.oid is distinct from to_regprocedure('public.hot_menu_spice_upsert(uuid,integer)')
  ) then
    raise exception 'unexpected_hot_spice_upsert_overload';
  end if;
end;
$signatures$;

-- Privileged table access stays in a dedicated, unexposed schema. The public
-- wrapper below is SECURITY INVOKER, and the helper still checks the JWT caller.
create or replace function nowgo_hot_private.hot_menu_spice_upsert(
  p_menu_id uuid,
  p_level integer
) returns void
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null
    or (auth.jwt()->>'role') is distinct from 'authenticated'
    or coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
  then
    raise exception 'registered_member_required' using errcode='42501';
  end if;
  if p_menu_id is null or p_level is null or p_level not between 1 and 7 then
    raise exception 'invalid_spice_rating' using errcode='22023';
  end if;
  if not exists(
    select 1 from public.ng_map_hot_menu_catalog c where c.id=p_menu_id
  ) then
    raise exception 'public_hot_menu_required' using errcode='22023';
  end if;

  insert into public.hot_menu_spice_ratings(menu_id,user_id,level,created_at,updated_at)
  values(p_menu_id,v_user,p_level::smallint,now(),now())
  on conflict(menu_id,user_id) do update
    set level=excluded.level, updated_at=excluded.updated_at;
end;
$function$;

create or replace function public.hot_menu_spice_upsert(
  p_menu_id uuid,
  p_level integer
) returns void
language sql
security invoker
set search_path=''
as $function$
  select nowgo_hot_private.hot_menu_spice_upsert(p_menu_id,p_level);
$function$;

-- Aggregation never reads owner-declared heat and never exposes user IDs.
-- An unknown, removed, or hidden menu returns one empty-summary row, preserving
-- the .single() API contract while withholding historical hidden-menu ratings.
create or replace function nowgo_hot_private.hot_menu_spice_summary_for(
  p_menu_id uuid
) returns table(median_level double precision, rating_count bigint)
language sql
stable
security definer
set search_path=''
as $function$
  select
    percentile_cont(0.5) within group(order by r.level)::double precision,
    count(*)::bigint
  from public.hot_menu_spice_ratings r
  where r.menu_id=p_menu_id
    and exists(select 1 from public.ng_map_hot_menu_catalog c where c.id=p_menu_id);
$function$;

create or replace function public.hot_menu_spice_summary_for(
  p_menu_id uuid
) returns table(median_level double precision, rating_count bigint)
language sql
stable
security invoker
set search_path=''
as $function$
  select * from nowgo_hot_private.hot_menu_spice_summary_for(p_menu_id);
$function$;

revoke all on function nowgo_hot_private.hot_menu_spice_upsert(uuid,integer)
  from public, anon, authenticated, service_role;
revoke all on function public.hot_menu_spice_upsert(uuid,integer)
  from public, anon, authenticated, service_role;
grant execute on function nowgo_hot_private.hot_menu_spice_upsert(uuid,integer)
  to authenticated;
grant execute on function public.hot_menu_spice_upsert(uuid,integer)
  to authenticated;

revoke all on function nowgo_hot_private.hot_menu_spice_summary_for(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.hot_menu_spice_summary_for(uuid)
  from public, anon, authenticated, service_role;
grant execute on function nowgo_hot_private.hot_menu_spice_summary_for(uuid)
  to anon, authenticated, service_role;
grant execute on function public.hot_menu_spice_summary_for(uuid)
  to anon, authenticated, service_role;

comment on table public.hot_menu_spice_ratings is
  'One community spice rating per public HOT catalog menu and registered member; separate from owner-declared heat.';
comment on function public.hot_menu_spice_upsert(uuid,integer) is
  'Registered-member-only HOT catalog rating upsert; validates auth.uid(), non-anonymous JWT, and 1..7 level.';
notify pgrst, 'reload schema';
