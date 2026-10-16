-- Public source facts stay immutable. Customer reports and owner requests are separate records.
create schema if not exists hot_source_community;
revoke all on schema hot_source_community from public;
grant usage on schema hot_source_community to anon, authenticated;
create table if not exists hot_source_community.stores (
 id uuid primary key, source_ref text not null unique, name text not null, address text not null
);
create table if not exists hot_source_community.taste_reports (
 store_id uuid not null references hot_source_community.stores(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 menu_key text not null, menu_name text not null check(char_length(menu_name) between 1 and 100),
 heat smallint not null check(heat between 1 and 7),
 flavor text not null check(flavor in ('얼큰한','칼칼한','달콤매콤한','알싸한')),
 note text not null default '' check(char_length(note)<=500),
 consent_version text not null default 'hot-source-taste-v1',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(store_id,user_id,menu_key)
);
create table if not exists hot_source_community.owner_requests (
 store_id uuid not null references hot_source_community.stores(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(store_id,user_id)
);
create index if not exists hot_source_taste_user_time on hot_source_community.taste_reports(user_id,created_at);
create index if not exists hot_source_request_user_time on hot_source_community.owner_requests(user_id,created_at);
alter table hot_source_community.stores enable row level security;
alter table hot_source_community.taste_reports enable row level security;
alter table hot_source_community.owner_requests enable row level security;
revoke all on all tables in schema hot_source_community from public,anon,authenticated;

create or replace function hot_source_community.state(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if not exists(select 1 from hot_source_community.stores where id=p_store) then raise exception 'source_store_not_found'; end if;
 select jsonb_build_object(
  'ownerRequests',(select count(*) from hot_source_community.owner_requests where store_id=p_store),
  'requested',exists(select 1 from hot_source_community.owner_requests where store_id=p_store and user_id=auth.uid()),
  'menus',coalesce((select jsonb_agg(q.summary order by q.menu_name) from (
   select min(menu_name) menu_name,jsonb_build_object('menu',min(menu_name),'count',count(*),'heat',percentile_cont(0.5) within group(order by heat),'flavor',mode() within group(order by flavor)) summary
   from hot_source_community.taste_reports where store_id=p_store group by menu_key
  ) q),'[]'::jsonb),
  'myReports',coalesce((select jsonb_agg(jsonb_build_object('menu',menu_name,'heat',heat,'flavor',flavor,'note',note)) from hot_source_community.taste_reports where store_id=p_store and user_id=auth.uid()),'[]'::jsonb)
 ) into v_result;
 return v_result;
end $$;
revoke all on function hot_source_community.state(uuid) from public;
grant execute on function hot_source_community.state(uuid) to anon,authenticated;

create or replace function hot_source_community.submit(p_store uuid,p_action text,p_menu text default '',p_heat integer default null,p_flavor text default '',p_note text default '',p_consent boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_menu text;v_key text;v_awarded integer:=0;v_inserted integer;
begin
 if v_user is null or not exists(select 1 from auth.users where id=v_user and coalesce(is_anonymous,false)=false) then raise exception 'login_required'; end if;
 if not exists(select 1 from hot_source_community.stores where id=p_store) then raise exception 'source_store_not_found'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,731));
 if p_action='owner-request' then
  if not exists(select 1 from hot_source_community.owner_requests where store_id=p_store and user_id=v_user) and (select count(*) from hot_source_community.owner_requests where user_id=v_user and created_at>now()-interval '24 hours')>=100 then raise exception 'request_rate_limited'; end if;
  insert into hot_source_community.owner_requests(store_id,user_id) values(p_store,v_user) on conflict do nothing;
 elsif p_action='taste' then
  v_menu:=regexp_replace(btrim(p_menu),'\s+',' ','g');v_key:=lower(v_menu);
  if v_menu is null or char_length(v_menu) not between 1 and 100 or p_heat is null or p_heat not between 1 and 7 or p_flavor is null or p_flavor not in ('얼큰한','칼칼한','달콤매콤한','알싸한') or p_note is null or char_length(p_note)>500 or p_consent is distinct from true then raise exception 'invalid_taste_report'; end if;
  if (select count(*) from hot_source_community.taste_reports where user_id=v_user and updated_at>now()-interval '24 hours')>=100 then raise exception 'request_rate_limited'; end if;
  insert into hot_source_community.taste_reports(store_id,user_id,menu_key,menu_name,heat,flavor,note)
  values(p_store,v_user,v_key,v_menu,p_heat,p_flavor,btrim(p_note))
  on conflict(store_id,user_id,menu_key) do update set heat=excluded.heat,flavor=excluded.flavor,note=excluded.note,updated_at=now();
  v_awarded:=hot_source_community.reward(v_user,'report','source-taste:'||p_store::text||':'||md5(v_key),v_menu||' 맛 제보');
 else raise exception 'invalid_source_action'; end if;
 return hot_source_community.state(p_store)||jsonb_build_object('awardedExp',v_awarded);
end $$;
revoke all on function hot_source_community.submit(uuid,text,text,integer,text,text,boolean) from public;
grant execute on function hot_source_community.submit(uuid,text,text,integer,text,text,boolean) to authenticated;
create or replace function public.ng_hot_source_community_state(p_store uuid) returns jsonb language sql stable security invoker set search_path='' as $$select hot_source_community.state(p_store)$$;
create or replace function public.ng_hot_source_community_submit(p_store uuid,p_action text,p_menu text default '',p_heat integer default null,p_flavor text default '',p_note text default '',p_consent boolean default false) returns jsonb language sql security invoker set search_path='' as $$select hot_source_community.submit(p_store,p_action,p_menu,p_heat,p_flavor,p_note,p_consent)$$;
revoke all on function public.ng_hot_source_community_state(uuid) from public;
revoke all on function public.ng_hot_source_community_submit(uuid,text,text,integer,text,text,boolean) from public,anon;
grant execute on function public.ng_hot_source_community_state(uuid) to anon,authenticated;
grant execute on function public.ng_hot_source_community_submit(uuid,text,text,integer,text,text,boolean) to authenticated;
notify pgrst,'reload schema';
