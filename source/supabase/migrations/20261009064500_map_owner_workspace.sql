-- Map owner workspace. Existing Space billing and canonical store data stay authoritative.
create table public.ng_map_menu_details (
 menu_item_id uuid primary key references public.store_menu_items(id) on delete cascade,
 planet text not null check(planet in ('hot','sweet','rich')),
 taste_level smallint not null check(taste_level between 1 and 5),
 flavor text not null check(length(flavor) between 1 and 40),
 category text not null check(length(category) between 1 and 40),
 price integer not null check(price between 100 and 1000000),
 photo_path text not null,
 updated_at timestamptz not null default now()
);
create index ng_map_menu_details_planet on public.ng_map_menu_details(planet,updated_at desc);
alter table public.ng_map_menu_details enable row level security;
revoke all on public.ng_map_menu_details from public,anon,authenticated;
grant select on public.ng_map_menu_details to anon,authenticated;
grant all on public.ng_map_menu_details to service_role;

create function public.ng_map_can_publish(p_store uuid,p_planet text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
 and p_planet in ('hot','sweet','rich') and exists(
  select 1 from public.stores s join public.owners o on o.id=s.owner_id
  where s.id=p_store and s.owner_id=auth.uid() and s.archived_at is null and o.status='active'
   and s.trust_disabled_at is null and coalesce(s.owner_penalty_points,0)<30
   and exists(select 1 from public.ng_store_claims c where c.store_id=s.id and c.user_id=auth.uid() and c.status='approved')
   and not exists(select 1 from public.ng_account_withdrawals w where w.user_id=auth.uid())
   and (exists(select 1 from public.ng_paddle_subscriptions p where p.owner_id=auth.uid() and p.product=p_planet
    and not p.archived and not p.refunded and p.status in ('active','canceled') and p.paid_until>now()
    and p.verified_at between now()-interval '24 hours' and now()
    and p.price_id=case p_planet when 'hot' then 'pri_01m4d46kazt8e590qejkz7d9wa' when 'sweet' then 'pri_01m4d46km9peen4fp9v1xvret0' else 'pri_01m4d46kxkqpery8jwfpw73kfq' end)
   or exists(select 1 from public.ng_paypal_subscriptions p where p.owner_id=auth.uid() and p.product=p_planet
    and not p.archived and p.status in ('ACTIVE','CANCELLED') and p.paid_until>now() and p.verified_at between now()-interval '24 hours' and now()))
 );
$$;
revoke all on function public.ng_map_can_publish(uuid,text) from public,anon;
grant execute on function public.ng_map_can_publish(uuid,text) to authenticated,service_role;

create policy ng_map_menu_public_read on public.ng_map_menu_details for select to anon,authenticated using(
 exists(select 1 from public.store_menu_items m join public.stores s on s.id=m.store_id
 where m.id=menu_item_id and m.active and s.archived_at is null and s.trust_disabled_at is null and coalesce(s.owner_penalty_points,0)<30)
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ng-map-menu-photos','ng-map-menu-photos',true,5242880,array['image/webp']) on conflict(id) do nothing;
create policy ng_map_menu_photo_insert on storage.objects for insert to authenticated with check(
 bucket_id='ng-map-menu-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and (storage.foldername(name))[2]~'^[0-9a-f-]{36}$'
 and public.ng_map_can_publish(((storage.foldername(name))[2])::uuid,(storage.foldername(name))[3])
);
create policy ng_map_menu_photo_cleanup on storage.objects for delete to authenticated using(
 bucket_id='ng-map-menu-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.ng_map_menu_details d where d.photo_path=name)
);

create function public.ng_map_validate_taste(p_planet text,p_level integer,p_flavor text,p_category text) returns boolean
language sql immutable set search_path='' as $$
 select p_level between 1 and 5 and case p_planet
 when 'hot' then p_flavor=any(array['얼큰한','칼칼한','달콤매콤한','알싸한']) and p_category=any(array['분식','국물·면','고기·볶음','닭발','족발','해산물','기타'])
 when 'sweet' then p_flavor=any(array['크리미한','버터리한','프루티한','초콜릿한','고소한']) and p_category=any(array['카페','베이커리','케이크','도넛·쿠키','아이스크림·빙수','초콜릿·캔디','전통 디저트','기타'])
 when 'rich' then p_flavor=any(array['고소한','크리미한','버터 풍미','치즈 풍미','기름진']) and p_category=any(array['파스타','치즈·그라탱','베이커리','디저트','고기·튀김','기타']) else false end;
$$;
revoke all on function public.ng_map_validate_taste(text,integer,text,text) from public;

create function public.ng_map_save_menu(p_store uuid,p_planet text,p_menu uuid,p_name text,p_price integer,p_level integer,p_flavor text,p_category text,p_photo text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_path text;v_position integer;
begin
 if not public.ng_map_can_publish(p_store,p_planet) then raise exception 'map_subscription_required' using errcode='42501';end if;
 if length(btrim(p_name)) not between 1 and 100 or p_price not between 100 and 1000000 or not coalesce(public.ng_map_validate_taste(p_planet,p_level,p_flavor,p_category),false) then raise exception 'invalid_menu';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_store::text,9102026));
 if p_menu is not null then
  select m.id,d.photo_path into v_id,v_path from public.store_menu_items m join public.ng_map_menu_details d on d.menu_item_id=m.id
  where m.id=p_menu and m.store_id=p_store and d.planet=p_planet;
  if v_id is null then raise exception 'menu_not_found';end if;
 end if;
 v_path:=coalesce(nullif(p_photo,''),v_path);
 if v_path is null or v_path !~ ('^'||auth.uid()::text||'/'||p_store::text||'/'||p_planet||'/[0-9a-f-]{36}\.webp$')
  or not exists(select 1 from storage.objects where bucket_id='ng-map-menu-photos' and name=v_path) then raise exception 'photo_required';end if;
 if exists(select 1 from public.store_menu_items m where m.store_id=p_store and lower(btrim(m.name))=lower(btrim(p_name)) and m.id is distinct from p_menu) then raise exception 'duplicate_menu';end if;
 if v_id is null then
  select coalesce(max(position),-1)+1 into v_position from public.store_menu_items where store_id=p_store;
  insert into public.store_menu_items(store_id,name,price_text,position,active) values(p_store,btrim(p_name),p_price::text||'원',v_position,true) returning id into v_id;
 else update public.store_menu_items set name=btrim(p_name),price_text=p_price::text||'원',updated_at=now() where id=v_id;end if;
 insert into public.ng_map_menu_details(menu_item_id,planet,taste_level,flavor,category,price,photo_path)
 values(v_id,p_planet,p_level,p_flavor,p_category,p_price,v_path)
 on conflict(menu_item_id) do update set taste_level=excluded.taste_level,flavor=excluded.flavor,category=excluded.category,price=excluded.price,photo_path=excluded.photo_path,updated_at=now();
 return v_id;
end $$;
create function public.ng_map_set_menu_soldout(p_store uuid,p_planet text,p_menu uuid,p_soldout boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_name text;
begin
 if not public.ng_map_can_publish(p_store,p_planet) then raise exception 'map_subscription_required' using errcode='42501';end if;
 if p_soldout is null then raise exception 'invalid_soldout';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_store::text,9102026));
 select m.name into v_name from public.store_menu_items m where m.id=p_menu and m.store_id=p_store and m.active
  and (exists(select 1 from public.ng_map_menu_details d where d.menu_item_id=m.id and d.planet=p_planet)
   or exists(select 1 from public.ng_owner_featured_menus f where f.menu_item_id=m.id and f.planet=p_planet));
 if v_name is null then raise exception 'menu_not_found';end if;
 update public.soldout_menus set active=false,updated_at=now() where store_id=p_store and lower(btrim(name))=lower(btrim(v_name)) and active;
 if p_soldout then insert into public.soldout_menus(store_id,name,active) values(p_store,v_name,true);end if;
end $$;
create function public.ng_map_set_menu_taste(p_store uuid,p_planet text,p_menu uuid,p_level integer,p_flavor text,p_category text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.ng_map_can_publish(p_store,p_planet) then raise exception 'map_subscription_required' using errcode='42501';end if;
 if not coalesce(public.ng_map_validate_taste(p_planet,p_level,p_flavor,p_category),false) then raise exception 'invalid_taste';end if;
 update public.ng_map_menu_details d set taste_level=p_level,flavor=p_flavor,category=p_category,updated_at=now()
 where d.menu_item_id=p_menu and d.planet=p_planet and exists(select 1 from public.store_menu_items m where m.id=p_menu and m.store_id=p_store);
 if not found then raise exception 'menu_photo_required';end if;
end $$;
create function public.ng_map_set_status(p_store uuid,p_planet text,p_value text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.ng_map_can_publish(p_store,p_planet) then raise exception 'map_subscription_required' using errcode='42501';end if;
 if p_value not in ('open','temporary_closed','closed_for_day','ingredients_soldout','permanently_closed','break_time') or p_value is null then raise exception 'invalid_status';end if;
 return public.replace_owner_status(p_store,auth.uid(),'open_status',to_jsonb(p_value),true,case when p_value='permanently_closed' then 'manual' else 'business_day' end);
end $$;

create function public.ng_map_owner_dashboard(p_planet text,p_store uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_store uuid;v_stores jsonb;v_menus jsonb;v_status jsonb;v_enabled boolean;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or p_planet not in ('hot','sweet','rich') then raise exception 'login_required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by created_at),'[]'::jsonb) into v_stores
 from public.stores where owner_id=auth.uid() and archived_at is null;
 if p_store is not null and not exists(select 1 from public.stores where id=p_store and owner_id=auth.uid() and archived_at is null) then raise exception 'owned_store_required' using errcode='42501';end if;
 select id into v_store from public.stores where owner_id=auth.uid() and archived_at is null and (p_store is null or id=p_store) order by created_at limit 1;
 v_enabled:=coalesce(public.ng_map_can_publish(v_store,p_planet),false);
 if not v_enabled then return jsonb_build_object('stores',v_stores,'storeId',v_store,'access',jsonb_build_object('enabled',false,'code',case when v_store is null then 'approval_required' else 'map_subscription_required' end),'state',null);end if;
 select jsonb_build_object('value',value#>>'{}','set_at',set_at,'expires_at',expires_at) into v_status
 from public.owner_overrides where store_id=v_store and kind='open_status' and active and set_at<=now() and least(coalesce(expires_at,set_at+interval '24 hours'),set_at+interval '24 hours')>now() order by set_at desc limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'price',d.price,'level',d.taste_level,'flavor',d.flavor,'category',d.category,'photoPath',d.photo_path,
 'soldout',exists(select 1 from public.soldout_menus so where so.store_id=v_store and so.active and lower(btrim(so.name))=lower(btrim(m.name)))) order by m.position),'[]'::jsonb) into v_menus
 from public.store_menu_items m join public.ng_map_menu_details d on d.menu_item_id=m.id where m.store_id=v_store and m.active and d.planet=p_planet;
 return jsonb_build_object('stores',v_stores,'storeId',v_store,'access',jsonb_build_object('enabled',true),'state',jsonb_build_object('checkedAt',now(),'status',v_status,'menus',v_menus));
end $$;

create table public.ng_map_owner_link_messages (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.stores(id) on delete cascade,planet text not null check(planet in ('hot','sweet','rich')),
 management_url text not null,status text not null default 'awaiting_provider' check(status in ('awaiting_provider','pending','sending','sent','failed')),
 created_at timestamptz not null default now(),sent_at timestamptz,unique(owner_id,store_id,planet)
);
alter table public.ng_map_owner_link_messages enable row level security;
revoke all on public.ng_map_owner_link_messages from public,anon,authenticated;
grant select on public.ng_map_owner_link_messages to authenticated;
grant all on public.ng_map_owner_link_messages to service_role;
create policy ng_map_owner_link_read_own on public.ng_map_owner_link_messages for select to authenticated using(owner_id=(select auth.uid()));
create function public.ng_map_register_contact(p_phone text,p_planet text,p_store uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_phone text:=regexp_replace(p_phone,'[-\s]','','g');v_url text;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'login_required' using errcode='42501';end if;
 if v_phone !~ '^01(0[0-9]{8}|[16789][0-9]{7,8})$' or v_phone is null or p_planet not in ('hot','sweet','rich') then raise exception 'invalid_contact';end if;
 if p_store is not null and not exists(select 1 from public.stores s join public.ng_store_claims c on c.store_id=s.id where s.id=p_store and s.owner_id=auth.uid() and s.archived_at is null and c.user_id=auth.uid() and c.status='approved') then raise exception 'owned_store_required' using errcode='42501';end if;
 insert into public.ng_owner_contacts(owner_id,representative_phone) values(auth.uid(),v_phone)
 on conflict(owner_id) do update set representative_phone=excluded.representative_phone,updated_at=now();
 v_url:='https://'||p_planet||'.nowgo.space/owner';
 if p_store is not null then insert into public.ng_map_owner_link_messages(owner_id,store_id,planet,management_url) values(auth.uid(),p_store,p_planet,v_url) on conflict(owner_id,store_id,planet) do nothing;end if;
 return jsonb_build_object('managementUrl',v_url,'deliveryStatus','awaiting_provider');
end $$;

revoke all on function public.ng_map_save_menu(uuid,text,uuid,text,integer,integer,text,text,text),public.ng_map_set_menu_soldout(uuid,text,uuid,boolean),public.ng_map_set_menu_taste(uuid,text,uuid,integer,text,text),public.ng_map_set_status(uuid,text,text),public.ng_map_owner_dashboard(text,uuid),public.ng_map_register_contact(text,text,uuid) from public,anon;
grant execute on function public.ng_map_save_menu(uuid,text,uuid,text,integer,integer,text,text,text),public.ng_map_set_menu_soldout(uuid,text,uuid,boolean),public.ng_map_set_menu_taste(uuid,text,uuid,integer,text,text),public.ng_map_set_status(uuid,text,text),public.ng_map_owner_dashboard(text,uuid),public.ng_map_register_contact(text,text,uuid) to authenticated,service_role;

create view public.ng_map_owned_menu_catalog as
select m.id,'nowgo-'||s.id::text as place_id,m.name as menu,s.name as shop,s.address,d.price,d.taste_level as heat,d.flavor,d.category,
 (d.updated_at at time zone 'Asia/Seoul')::date as observed_at,s.lat,s.lon as lng,d.photo_path,m.created_at,s.slug as nowgo_slug,true as verified_owner,s.id as owner_store_id,
 exists(select 1 from public.soldout_menus so where so.store_id=s.id and so.active and lower(btrim(so.name))=lower(btrim(m.name))) as soldout,d.planet
from public.ng_map_menu_details d join public.store_menu_items m on m.id=d.menu_item_id join public.stores s on s.id=m.store_id join public.owners o on o.id=s.owner_id
where m.active and s.archived_at is null and o.status='active' and s.trust_disabled_at is null and coalesce(s.owner_penalty_points,0)<30
 and exists(select 1 from public.ng_store_claims c where c.store_id=s.id and c.user_id=s.owner_id and c.status='approved');
revoke all on public.ng_map_owned_menu_catalog from public;
grant select on public.ng_map_owned_menu_catalog to anon,authenticated,service_role;
do $$ declare p text;begin foreach p in array array['hot','sweet','rich'] loop
 execute format('create view public.ng_map_%I_menu_catalog as select b.*,false as soldout,false as map_menu_photo from public.ng_%I_combined_menus b where not exists(select 1 from public.ng_map_owned_menu_catalog n where n.id=b.id) union all select id,place_id,menu,shop,address,price,heat,flavor,category,observed_at,lat,lng,photo_path,created_at,nowgo_slug,verified_owner,owner_store_id,soldout,true as map_menu_photo from public.ng_map_owned_menu_catalog where planet=%L',p,p,p);
 execute format('grant select on public.ng_map_%I_menu_catalog to anon,authenticated,service_role',p);
end loop;end $$;
