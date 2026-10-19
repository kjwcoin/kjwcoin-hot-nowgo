-- Development-only HOT owner and visitor authorization rollout.
-- Source of truth: HOT heat 1..7; stage 7 is "극강의 매운맛".
-- Never apply automatically to production.

-- Keep unverified candidate rows inaccessible through the Data API.
revoke all on table public.hot_unverified_spicy_menu_candidates from anon, authenticated;
drop policy if exists hot_unverified_candidates_public_read
  on public.hot_unverified_spicy_menu_candidates;

-- Replace the retired KRW 1,900 map entitlement with the reviewed HOT KRW 8,000 ledger contract.
-- The table is webhook/service-role managed; app clients have no direct grants.
alter table public.ng_map_subscription_access
  drop constraint if exists ng_map_subscription_access_amount_krw_check,
  drop constraint if exists ng_map_subscription_access_price_code_check,
  drop constraint if exists ng_map_subscription_access_product_code_check;
alter table public.ng_map_subscription_access
  add constraint ng_map_subscription_access_amount_krw_check
    check (amount_krw = 8000),
  add constraint ng_map_subscription_access_price_code_check
    check (price_code = 'KRW_8000_MONTHLY_V1'),
  add constraint ng_map_subscription_access_product_code_check
    check (product_code = 'NOWGO_HOT_MONTHLY');

create table if not exists public.ng_map_owner_menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  planet text not null check (planet in ('hot','sweet','rich')),
  name text not null check (length(btrim(name)) between 1 and 100),
  price integer not null check (price between 100 and 1000000),
  taste_level smallint not null,
  flavor text not null check (length(btrim(flavor)) between 1 and 40),
  category text not null check (length(btrim(category)) between 1 and 80),
  photo_path text not null check (length(photo_path) between 10 and 500),
  photo_mime text not null default 'image/webp'
    check (photo_mime in ('image/jpeg','image/png','image/webp')),
  soldout boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ng_map_owner_menus_taste_level_check check (
    taste_level >= 1
    and taste_level <= case when planet='hot' then 7 else 5 end
  ),
  unique (store_id, id)
);
create index if not exists ng_map_owner_menus_store_planet_idx
  on public.ng_map_owner_menus(store_id, planet) where active;
alter table public.ng_map_owner_menus enable row level security;
revoke all on table public.ng_map_owner_menus from anon, authenticated;

create table if not exists public.ng_map_owner_audit_log (
  id bigint generated always as identity primary key,
  request_id uuid not null default gen_random_uuid(),
  actor_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  menu_id uuid,
  action text not null,
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ng_map_owner_audit_store_created_idx
  on public.ng_map_owner_audit_log(store_id, created_at desc);
alter table public.ng_map_owner_audit_log enable row level security;
revoke all on table public.ng_map_owner_audit_log from anon, authenticated;

-- Owner-created HOT menus join the public canonical catalog without replacing
-- owner-declared heat by visitor median data.
create or replace view public.ng_hot_combined_menus as
select p.id,p.place_id,p.menu,p.shop,p.address,p.price,p.heat,p.flavor,p.category,
       p.observed_at,p.lat,p.lng,p.photo_path,p.created_at,p.nowgo_slug,
       p.verified_owner,null::uuid as owner_store_id
from public.hot_public_menus p
union all
select f.id,f.place_id,f.menu,f.shop,f.address,f.price,f.heat,f.flavor,f.category,
       f.observed_at,f.lat,f.lng,null::text as photo_path,f.created_at,f.nowgo_slug,
       f.verified_owner,f.owner_store_id
from public.ng_owner_featured_taste_menus f
where f.planet='hot'
union all
select m.id,'nowgo-'||s.id::text,m.name,s.name,s.address,m.price,m.taste_level,
       m.flavor,m.category,m.updated_at::date,s.lat,s.lon,m.photo_path,m.created_at,
       s.slug,true,s.id
from public.ng_map_owner_menus m
join public.stores s on s.id=m.store_id
where m.planet='hot' and m.active and s.archived_at is null
  and s.trust_disabled_at is null and s.owner_penalty_points<30;

create or replace function public.ng_map_can_publish(p_store uuid, p_planet text)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select p_planet='hot'
    and (select auth.uid()) is not null
    and exists (
      select 1
      from auth.users u
      join public.owners o on o.id=u.id and o.status='active'
      join public.stores s on s.owner_id=o.id and s.id=p_store
      join public.ng_store_claims c on c.store_id=s.id and c.user_id=o.id and c.status='approved'
      join public.ng_business_verifications b
        on b.id=c.business_verification_id and b.user_id=o.id and b.status='verified'
      join public.ng_map_subscription_access a on a.owner_id=o.id
      where u.id=(select auth.uid()) and not coalesce(u.is_anonymous,false)
        and s.archived_at is null and s.trust_disabled_at is null
        and s.owner_penalty_points<30 and s.publication_state not in ('CLOSED','REMOVED')
        and a.product_code='NOWGO_HOT_MONTHLY'
        and a.price_code='KRW_8000_MONTHLY_V1'
        and a.amount_krw=8000 and a.status='ACTIVE' and a.paid_until>now()
    );
$$;
revoke all on function public.ng_map_can_publish(uuid,text) from public;
grant execute on function public.ng_map_can_publish(uuid,text) to authenticated;

create or replace function public.ng_map_dashboard_access(
  p_planet text, p_store uuid default null, p_link uuid default null
) returns jsonb
language plpgsql stable security definer
set search_path=''
as $$
declare
  actor uuid := (select auth.uid());
  target uuid := p_store;
  enabled boolean := false;
  status_value text;
  menus jsonb := '[]'::jsonb;
begin
  if actor is null or not exists (
    select 1 from auth.users u where u.id=actor and not coalesce(u.is_anonymous,false)
  ) then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_planet<>'hot' or p_link is not null then
    return jsonb_build_object('storeId',target,'access',jsonb_build_object('enabled',false,'code','INVALID_SCOPE'),'state',jsonb_build_object('status',null,'menus',menus));
  end if;
  if target is null then
    select s.id into target from public.stores s
      where s.owner_id=actor and s.archived_at is null order by s.created_at limit 1;
  end if;
  if target is null or not exists (
    select 1 from public.stores s where s.id=target and s.owner_id=actor and s.archived_at is null
  ) then raise exception 'OWNED_STORE_REQUIRED' using errcode='42501'; end if;
  enabled := public.ng_map_can_publish(target,p_planet);
  select o.value #>> '{}' into status_value
  from public.owner_overrides o
  where o.store_id=target and o.kind='open_status' and o.active
    and o.set_at<=now() and o.expires_at>now() and o.set_at>now()-interval '24 hours'
  order by o.set_at desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.id,'name',m.name,'price',m.price,'level',m.taste_level,
    'flavor',m.flavor,'category',m.category,'photoPath',m.photo_path,
    'soldout',m.soldout) order by m.created_at,m.id),'[]'::jsonb)
  into menus from public.ng_map_owner_menus m
  where m.store_id=target and m.planet='hot' and m.active;
  return jsonb_build_object(
    'storeId',target,
    'access',jsonb_build_object('enabled',enabled,'code',case when enabled then 'ACTIVE' else 'SUBSCRIPTION_REQUIRED' end),
    'state',jsonb_build_object('status',jsonb_build_object('value',coalesce(status_value,'closed_for_day')),'menus',menus)
  );
end;
$$;
revoke all on function public.ng_map_dashboard_access(text,uuid,uuid) from public;
grant execute on function public.ng_map_dashboard_access(text,uuid,uuid) to authenticated;

create or replace function public.ng_map_save_menu(
  p_store uuid,p_planet text,p_menu uuid,p_name text,p_price integer,
  p_level smallint,p_flavor text,p_category text,p_photo text
) returns uuid
language plpgsql security definer
set search_path=''
as $$
declare actor uuid := (select auth.uid()); saved uuid; before_row jsonb;
begin
  if not public.ng_map_can_publish(p_store,p_planet) then
    raise exception 'SUBSCRIPTION_REQUIRED' using errcode='42501'; end if;
  if p_planet<>'hot' or p_level not between 1 and 7
    or length(btrim(p_name)) not between 1 and 100
    or p_price not between 100 and 1000000
    or p_flavor not in ('얼큰한','칼칼한','달콤매콤한','알싸한')
    or length(btrim(p_category)) not between 1 and 80
    or p_photo !~* ('^'||actor::text||'/'||p_store::text||'/hot/[0-9a-f-]{36}\\.webp$')
  then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if p_menu is null then
    insert into public.ng_map_owner_menus(store_id,planet,name,price,taste_level,flavor,category,photo_path)
    values(p_store,'hot',btrim(p_name),p_price,p_level,p_flavor,btrim(p_category),p_photo)
    returning id into saved;
  else
    select to_jsonb(m) into before_row from public.ng_map_owner_menus m
      where m.id=p_menu and m.store_id=p_store and m.planet='hot' and m.active for update;
    if before_row is null then raise exception 'MENU_NOT_FOUND' using errcode='P0002'; end if;
    update public.ng_map_owner_menus set name=btrim(p_name),price=p_price,taste_level=p_level,
      flavor=p_flavor,category=btrim(p_category),photo_path=p_photo,updated_at=now()
      where id=p_menu and store_id=p_store returning id into saved;
  end if;
  insert into public.ng_map_owner_audit_log(actor_id,store_id,menu_id,action,previous_value,next_value)
  select actor,p_store,saved,case when p_menu is null then 'menu.create' else 'menu.update' end,
    before_row,to_jsonb(m) from public.ng_map_owner_menus m where m.id=saved;
  return saved;
end;
$$;
revoke all on function public.ng_map_save_menu(uuid,text,uuid,text,integer,smallint,text,text,text) from public;
grant execute on function public.ng_map_save_menu(uuid,text,uuid,text,integer,smallint,text,text,text) to authenticated;

create or replace function public.ng_map_set_menu_taste(
  p_store uuid,p_planet text,p_menu uuid,p_level smallint,p_flavor text,p_category text
) returns boolean
language plpgsql security definer
set search_path=''
as $$
declare actor uuid := (select auth.uid()); before_row jsonb; after_row jsonb;
begin
  if not public.ng_map_can_publish(p_store,p_planet) then raise exception 'SUBSCRIPTION_REQUIRED' using errcode='42501'; end if;
  if p_planet<>'hot' or p_level not between 1 and 7
    or p_flavor not in ('얼큰한','칼칼한','달콤매콤한','알싸한')
    or length(btrim(p_category)) not between 1 and 80
  then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  select to_jsonb(m) into before_row from public.ng_map_owner_menus m
    where m.id=p_menu and m.store_id=p_store and m.planet='hot' and m.active for update;
  if before_row is null then raise exception 'MENU_NOT_FOUND' using errcode='P0002'; end if;
  update public.ng_map_owner_menus set taste_level=p_level,flavor=p_flavor,
    category=btrim(p_category),updated_at=now()
    where id=p_menu and store_id=p_store;
  select to_jsonb(m) into after_row from public.ng_map_owner_menus m where m.id=p_menu;
  insert into public.ng_map_owner_audit_log(actor_id,store_id,menu_id,action,previous_value,next_value)
    values(actor,p_store,p_menu,'menu.taste',before_row,after_row);
  return true;
end;
$$;
revoke all on function public.ng_map_set_menu_taste(uuid,text,uuid,smallint,text,text) from public;
grant execute on function public.ng_map_set_menu_taste(uuid,text,uuid,smallint,text,text) to authenticated;

create or replace function public.ng_map_set_menu_soldout(
  p_store uuid,p_planet text,p_menu uuid,p_soldout boolean
) returns boolean
language plpgsql security definer
set search_path=''
as $$
declare actor uuid := (select auth.uid()); before_row jsonb; after_row jsonb;
begin
  if not public.ng_map_can_publish(p_store,p_planet) then raise exception 'SUBSCRIPTION_REQUIRED' using errcode='42501'; end if;
  if p_planet<>'hot' or p_soldout is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  select to_jsonb(m) into before_row from public.ng_map_owner_menus m
    where m.id=p_menu and m.store_id=p_store and m.planet='hot' and m.active for update;
  if before_row is null then raise exception 'MENU_NOT_FOUND' using errcode='P0002'; end if;
  update public.ng_map_owner_menus set soldout=p_soldout,updated_at=now()
    where id=p_menu and store_id=p_store;
  select to_jsonb(m) into after_row from public.ng_map_owner_menus m where m.id=p_menu;
  insert into public.ng_map_owner_audit_log(actor_id,store_id,menu_id,action,previous_value,next_value)
    values(actor,p_store,p_menu,'menu.soldout',before_row,after_row);
  return p_soldout;
end;
$$;
revoke all on function public.ng_map_set_menu_soldout(uuid,text,uuid,boolean) from public;
grant execute on function public.ng_map_set_menu_soldout(uuid,text,uuid,boolean) to authenticated;

create or replace function public.ng_map_set_status(p_store uuid,p_planet text,p_value text)
returns jsonb
language plpgsql security definer
set search_path=''
as $$
declare actor uuid := (select auth.uid()); result jsonb; req uuid := gen_random_uuid();
begin
  if not public.ng_map_can_publish(p_store,p_planet) then raise exception 'SUBSCRIPTION_REQUIRED' using errcode='42501'; end if;
  if p_planet<>'hot' or p_value not in ('open','closed_for_day','ingredients_soldout','temporary_closed','break_time','permanently_closed')
  then raise exception 'INVALID_STATUS' using errcode='22023'; end if;
  result := public.replace_owner_status_v2(p_store,actor,'open_status'::public.report_kind,
    to_jsonb(p_value),true,case when p_value='permanently_closed' then 'manual' else 'business_day' end,
    req,clock_timestamp(),false,false,'prompted');
  insert into public.ng_map_owner_audit_log(request_id,actor_id,store_id,action,next_value)
    values(req,actor,p_store,'status.set',jsonb_build_object('value',p_value));
  return result;
end;
$$;
revoke all on function public.ng_map_set_status(uuid,text,text) from public;
grant execute on function public.ng_map_set_status(uuid,text,text) to authenticated;

-- Visitor writes go through an RPC so the database verifies the canonical HOT menu.
create or replace function public.hot_menu_spice_upsert(p_menu_id uuid,p_level smallint)
returns jsonb
language plpgsql security definer
set search_path=''
as $$
declare actor uuid := (select auth.uid()); saved smallint;
begin
  if actor is null or not exists(select 1 from auth.users u where u.id=actor and not coalesce(u.is_anonymous,false))
  then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_level not between 1 and 7 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if not exists(select 1 from public.ng_map_hot_menu_catalog m where m.id=p_menu_id)
  then raise exception 'MENU_NOT_FOUND' using errcode='P0002'; end if;
  insert into public.hot_menu_spice_ratings(menu_id,user_id,level,updated_at)
  values(p_menu_id,actor,p_level,now())
  on conflict(menu_id,user_id) do update set level=excluded.level,updated_at=excluded.updated_at
  returning level into saved;
  return jsonb_build_object('menuId',p_menu_id,'level',saved,'saved',true);
end;
$$;
revoke all on function public.hot_menu_spice_upsert(uuid,smallint) from public;
grant execute on function public.hot_menu_spice_upsert(uuid,smallint) to authenticated;
revoke insert,update,delete on table public.hot_menu_spice_ratings from authenticated;
grant select on table public.hot_menu_spice_ratings to authenticated;

