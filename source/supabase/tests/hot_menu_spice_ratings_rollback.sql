-- Caller must target Nowgo-dev (zohvqtmfxwubivbmkfhl).
-- Different fixture prefix from the SPACE/featured-menu rehearsal.
-- Full script = this prelude + reviewed HOT ratings migration + assertions.
-- No production writes, provider calls, storage uploads, or payment fixtures.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';

do $environment$
begin
  if to_regclass('public.hot_menu_spice_ratings') is null
    or to_regclass('public.ng_map_menu_details') is not null
  then raise exception 'unexpected_environment: inspected Nowgo-dev schema required'; end if;
  if exists(select 1 from auth.users where id::text like 'a0312026-%') then
    raise exception 'rating_fixture_uuid_collision';
  end if;
end;
$environment$;

create temporary table hot_rating_assertions(
  test_name text primary key,
  passed boolean not null,
  detail jsonb not null default '{}'::jsonb
) on commit drop;
grant select,insert on pg_temp.hot_rating_assertions to anon,authenticated,service_role;

create function pg_temp.rating_assert(p_name text,p_ok boolean,p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security invoker set search_path=''
as $assert$
begin
  if p_ok is not true then raise exception 'rating_assertion_failed: %',p_name; end if;
  insert into pg_temp.hot_rating_assertions(test_name,passed,detail) values(p_name,true,p_detail);
end;
$assert$;

insert into auth.users(id,aud,role,is_anonymous) values
('a0312026-0000-4000-8000-000000000001','authenticated','authenticated',false),
('a0312026-0000-4000-8000-000000000002','authenticated','authenticated',false),
('a0312026-0000-4000-8000-000000000003','authenticated','authenticated',false),
('a0312026-0000-4000-8000-000000000004','authenticated','authenticated',true);
insert into public.owners(id,status) values
('a0312026-0000-4000-8000-000000000001','active');
insert into public.stores(id,owner_id,name,category,address,slug,publication_state,
  lat,lon,coordinate_source,owner_confirmed_at) values
('a0312026-0000-4000-8000-000000000101','a0312026-0000-4000-8000-000000000001',
 'HOT rating rollback fixture','food','평가 검증용 가상 주소','hot-rating-rollback-20261021',
 'NOINDEX',37.5,127.0,'owner_pin',now()),
('a0312026-0000-4000-8000-000000000102','a0312026-0000-4000-8000-000000000001',
 'SWEET rating boundary fixture','food','평가 검증용 가상 주소','sweet-rating-rollback-20261021',
 'NOINDEX',37.5,127.0,'owner_pin',now());
insert into public.ng_business_verifications(id,user_id,business_number_hash,status) values
('a0312026-0000-4000-8000-000000000201','a0312026-0000-4000-8000-000000000001',
 'hot-rating-rollback-20261021','verified');
insert into public.ng_store_claims(user_id,store_id,business_verification_id,status,reviewed_at) values
('a0312026-0000-4000-8000-000000000001','a0312026-0000-4000-8000-000000000101',
 'a0312026-0000-4000-8000-000000000201','approved',now()),
('a0312026-0000-4000-8000-000000000001','a0312026-0000-4000-8000-000000000102',
 'a0312026-0000-4000-8000-000000000201','approved',now());
insert into public.store_menu_items(id,store_id,name,price_text,active) values
('a0312026-0000-4000-8000-000000000511','a0312026-0000-4000-8000-000000000101',
 'HOT canonical rating fixture','17000원',true),
('a0312026-0000-4000-8000-000000000512','a0312026-0000-4000-8000-000000000102',
 'SWEET out-of-catalog fixture','15000원',true);
insert into public.ng_owner_featured_menus(store_id,menu_item_id,planet,taste_level,photo_path,photo_mime)
values
('a0312026-0000-4000-8000-000000000101','a0312026-0000-4000-8000-000000000511',
 'hot',7,'featured/a0312026-0000-4000-8000-000000000101/a0312026-0000-4000-8000-000000000611','image/webp'),
('a0312026-0000-4000-8000-000000000102','a0312026-0000-4000-8000-000000000512',
 'sweet',5,'featured/a0312026-0000-4000-8000-000000000102/a0312026-0000-4000-8000-000000000612','image/webp');

-- Insert the reviewed migration here, within this same transaction.


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


do $ratings$
declare
  hot_menu constant uuid := 'a0312026-0000-4000-8000-000000000511';
  sweet_menu constant uuid := 'a0312026-0000-4000-8000-000000000512';
  member_a constant uuid := 'a0312026-0000-4000-8000-000000000001';
  member_b constant uuid := 'a0312026-0000-4000-8000-000000000002';
  member_c constant uuid := 'a0312026-0000-4000-8000-000000000003';
  anonymous_member constant uuid := 'a0312026-0000-4000-8000-000000000004';
  v_summary record; v_rejected boolean; v_count bigint; v_level integer;
begin
  perform pg_temp.rating_assert('catalog.hot_fixture_present',
    exists(select 1 from public.ng_map_hot_menu_catalog where id=hot_menu and heat=7));
  perform pg_temp.rating_assert('catalog.other_planet_absent',
    not exists(select 1 from public.ng_map_hot_menu_catalog where id=sweet_menu));
  perform pg_temp.rating_assert('rpc.single_integer_signature',
    (select count(*)=1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='hot_menu_spice_upsert')
    and to_regprocedure('public.hot_menu_spice_upsert(uuid,integer)') is not null
    and to_regprocedure('public.hot_menu_spice_upsert(uuid,smallint)') is null);
  perform pg_temp.rating_assert('rpc.public_wrappers_are_invoker',
    not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('hot_menu_spice_upsert','hot_menu_spice_summary_for')
        and p.prosecdef));

  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claim.role','anon',true);
  set local role anon;
  select * into strict v_summary from public.hot_menu_spice_summary_for(hot_menu);
  perform pg_temp.rating_assert('summary.empty_single_row',
    v_summary.median_level is null and v_summary.rating_count=0);
  v_rejected:=false;
  begin perform public.hot_menu_spice_upsert(hot_menu,4);
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('anonymous.rpc_denied',v_rejected);
  v_rejected:=false;
  begin perform 1 from public.hot_menu_spice_ratings;
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('anonymous.individual_rows_denied',v_rejected);
  v_rejected:=false;
  begin insert into public.hot_menu_spice_ratings(menu_id,user_id,level) values(hot_menu,member_a,4);
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('anonymous.direct_insert_denied',v_rejected);
  reset role;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_a,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',member_a::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;
  perform public.hot_menu_spice_upsert(hot_menu,2);
  select level into strict v_level from public.hot_menu_spice_ratings
    where menu_id=hot_menu and user_id=member_a;
  perform pg_temp.rating_assert('save.own_row_readback',v_level=2);
  select * into strict v_summary from public.hot_menu_spice_summary_for(hot_menu);
  perform pg_temp.rating_assert('summary.one_rating',v_summary.rating_count=1 and v_summary.median_level=2);

  perform public.hot_menu_spice_upsert(hot_menu,6);
  perform public.hot_menu_spice_upsert(hot_menu,6);
  select count(*),min(level) into v_count,v_level from public.hot_menu_spice_ratings
    where menu_id=hot_menu and user_id=member_a;
  perform pg_temp.rating_assert('save.update_and_retry_no_duplicate',v_count=1 and v_level=6);
  select * into strict v_summary from public.hot_menu_spice_summary_for(hot_menu);
  perform pg_temp.rating_assert('summary.updated_rating_not_extra_vote',v_summary.rating_count=1 and v_summary.median_level=6);

  v_rejected:=false;
  begin insert into public.hot_menu_spice_ratings(menu_id,user_id,level) values(hot_menu,member_a,4);
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('authenticated.direct_insert_denied',v_rejected);
  v_rejected:=false;
  begin update public.hot_menu_spice_ratings set level=4 where menu_id=hot_menu and user_id=member_a;
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('authenticated.direct_update_denied',v_rejected);
  v_rejected:=false;
  begin delete from public.hot_menu_spice_ratings where menu_id=hot_menu and user_id=member_a;
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('authenticated.direct_delete_denied',v_rejected);

  foreach v_level in array array[0,8,-1] loop
    v_rejected:=false;
    begin perform public.hot_menu_spice_upsert(hot_menu,v_level);
    exception when invalid_parameter_value then v_rejected:=true; end;
    perform pg_temp.rating_assert('bounds.reject_'||v_level::text,v_rejected);
  end loop;
  v_rejected:=false;
  begin perform public.hot_menu_spice_upsert(hot_menu,null);
  exception when invalid_parameter_value then v_rejected:=true; end;
  perform pg_temp.rating_assert('bounds.reject_null',v_rejected);
  v_rejected:=false;
  begin perform public.hot_menu_spice_upsert('a0312026-0000-4000-8000-000000000999',4);
  exception when invalid_parameter_value then v_rejected:=true; end;
  perform pg_temp.rating_assert('catalog.unknown_uuid_denied',v_rejected);
  v_rejected:=false;
  begin perform public.hot_menu_spice_upsert(sweet_menu,4);
  exception when invalid_parameter_value then v_rejected:=true; end;
  perform pg_temp.rating_assert('catalog.sweet_menu_denied',v_rejected);
  reset role;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_b,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',member_b::text,true);
  set local role authenticated;
  perform public.hot_menu_spice_upsert(hot_menu,3);
  perform pg_temp.rating_assert('rls.other_member_row_hidden',
    (select count(*)=0 from public.hot_menu_spice_ratings where menu_id=hot_menu and user_id=member_a));
  perform pg_temp.rating_assert('rls.only_own_row_visible',
    (select count(*)=1 and min(user_id::text)=member_b::text from public.hot_menu_spice_ratings where menu_id=hot_menu));
  select * into strict v_summary from public.hot_menu_spice_summary_for(hot_menu);
  perform pg_temp.rating_assert('summary.even_median',v_summary.rating_count=2 and v_summary.median_level=4.5);
  reset role;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_c,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',member_c::text,true);
  set local role authenticated;
  perform public.hot_menu_spice_upsert(hot_menu,7);
  select * into strict v_summary from public.hot_menu_spice_summary_for(hot_menu);
  perform pg_temp.rating_assert('summary.odd_median_and_level_7',v_summary.rating_count=3 and v_summary.median_level=6);
  perform pg_temp.rating_assert('owner_declared_heat_unchanged',
    (select heat=7 from public.ng_map_hot_menu_catalog where id=hot_menu));
  reset role;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',anonymous_member,'role','authenticated','is_anonymous',true)::text,true);
  perform set_config('request.jwt.claim.sub',anonymous_member::text,true);
  set local role authenticated;
  v_rejected:=false;
  begin perform public.hot_menu_spice_upsert(hot_menu,4);
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('anonymous_auth_user.rpc_denied',v_rejected);
  perform pg_temp.rating_assert('anonymous_auth_user.rows_hidden',
    (select count(*)=0 from public.hot_menu_spice_ratings where menu_id=hot_menu));
  reset role;

  perform set_config('request.jwt.claims','{"role":"authenticated","is_anonymous":false}',true);
  perform set_config('request.jwt.claim.sub','',true);
  set local role authenticated;
  v_rejected:=false;
  begin perform public.hot_menu_spice_upsert(hot_menu,4);
  exception when insufficient_privilege then v_rejected:=true; end;
  perform pg_temp.rating_assert('missing_subject.rpc_denied',v_rejected);
  reset role;

  -- A member rating remains historical data when the menu is hidden, but cannot
  -- be exposed through the public summary or accept another vote.
  update public.store_menu_items set active=false where id=hot_menu;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform set_config('request.jwt.claim.role','anon',true);
  set local role anon;
  select * into strict v_summary from public.hot_menu_spice_summary_for(hot_menu);
  perform pg_temp.rating_assert('summary.hidden_menu_empty',v_summary.rating_count=0 and v_summary.median_level is null);
  select * into strict v_summary from public.hot_menu_spice_summary_for('a0312026-0000-4000-8000-000000000999');
  perform pg_temp.rating_assert('summary.unknown_menu_empty',v_summary.rating_count=0 and v_summary.median_level is null);
  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_a,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',member_a::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;
  v_rejected:=false;
  begin perform public.hot_menu_spice_upsert(hot_menu,1);
  exception when invalid_parameter_value then v_rejected:=true; end;
  perform pg_temp.rating_assert('catalog.hidden_menu_write_denied',v_rejected);
  reset role;

  perform pg_temp.rating_assert('storage.exactly_three_distinct_member_votes',
    (select count(*)=3 and count(distinct user_id)=3 from public.hot_menu_spice_ratings where menu_id=hot_menu));
  perform pg_temp.rating_assert('storage.no_sweet_or_unknown_menu_votes',
    not exists(select 1 from public.hot_menu_spice_ratings
      where menu_id in (sweet_menu,'a0312026-0000-4000-8000-000000000999')));
end;
$ratings$;

select jsonb_build_object(
  'test_suite','hot_ratings_dev_all_rollback',
  'checked_at',clock_timestamp(),
  'project_ref','zohvqtmfxwubivbmkfhl',
  'assertion_count',count(*),
  'all_passed',bool_and(passed),
  'assertions',jsonb_agg(jsonb_build_object('name',test_name,'passed',passed,'detail',detail) order by test_name),
  'limitations',jsonb_build_array(
    'SQL role/JWT simulation tests PostgreSQL RLS and RPC behavior; it is not a real Auth login or browser session.',
    'Canonical fixture uses the existing development featured-menu branch; production-owned-menu branch parity is a separate test.',
    'No provider integration, paid entitlement, external image storage, or production deployment is exercised.',
    'Independent concurrent-session behavior is not claimed.'
  )
) as result from pg_temp.hot_rating_assertions;
rollback;

