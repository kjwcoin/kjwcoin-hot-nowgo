-- Register one photo-backed first menu before paid dashboard use.
create function public.ng_map_can_register_menu(p_store uuid,p_planet text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and p_planet in ('hot','sweet','rich') and exists(
  select 1 from public.stores s join public.owners o on o.id=s.owner_id
  where s.id=p_store and s.owner_id=auth.uid() and s.archived_at is null and o.status='active'
   and s.trust_disabled_at is null and s.owner_penalty_points<30
   and exists(select 1 from public.ng_store_claims c where c.store_id=s.id and c.user_id=auth.uid() and c.status='approved')
   and not exists(select 1 from public.ng_account_withdrawals w where w.user_id=auth.uid())
   and exists(select 1 from public.ng_owner_featured_menus f where f.store_id=s.id and f.planet=p_planet
     and not exists(select 1 from public.ng_map_menu_details d where d.menu_item_id=f.menu_item_id))
 );
$$;
revoke all on function public.ng_map_can_register_menu(uuid,text) from public,anon;
grant execute on function public.ng_map_can_register_menu(uuid,text) to authenticated,service_role;
create policy ng_map_signup_photo_insert on storage.objects for insert to authenticated with check(
 bucket_id='ng-map-menu-photos' and name~('^'||auth.uid()::text||'/[0-9a-f-]{36}/(hot|sweet|rich)/signup/[0-9a-f-]{36}\.webp$')
 and public.ng_map_can_register_menu(((storage.foldername(name))[2])::uuid,(storage.foldername(name))[3])
);
create function public.ng_map_confirm_signup_location(p_store uuid,p_lat double precision,p_lng double precision) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not exists(
  select 1 from public.stores s join public.owners o on o.id=s.owner_id where s.id=p_store and s.owner_id=auth.uid()
   and s.archived_at is null and o.status='active' and s.trust_disabled_at is null and s.owner_penalty_points<30
   and exists(select 1 from public.ng_store_claims c where c.store_id=s.id and c.user_id=auth.uid() and c.status='approved')
   and not exists(select 1 from public.ng_account_withdrawals w where w.user_id=auth.uid())
 ) then raise exception 'owned_store_required' using errcode='42501';end if;
 if p_lat is null or p_lng is null or p_lat not between 33 and 39 or p_lng not between 124 and 132 then raise exception 'invalid_location';end if;
 update public.stores set lat=p_lat,lon=p_lng,coordinate_source='owner_pin',owner_confirmed_at=now()
 where id=p_store and (lat is null or (lat=p_lat and lon=p_lng));
 if not found then raise exception 'location_already_confirmed';end if;
end $$;
create function public.ng_map_adopt_signup_menu(p_store uuid,p_planet text,p_menu uuid,p_price integer,p_level integer,p_flavor text,p_category text,p_photo text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_store::text,9102026));
 if not coalesce(public.ng_map_can_register_menu(p_store,p_planet),false) then raise exception 'owned_store_required' using errcode='42501';end if;
 if not exists(select 1 from public.ng_owner_featured_menus f join public.store_menu_items m on m.id=f.menu_item_id
  where f.store_id=p_store and f.planet=p_planet and f.menu_item_id=p_menu and m.store_id=p_store and m.active)
  then raise exception 'menu_not_found';end if;
 if p_price is null or p_price not between 100 and 1000000 or not coalesce(public.ng_map_validate_taste(p_planet,p_level,p_flavor,p_category),false) then raise exception 'invalid_taste';end if;
 if p_photo is null or p_photo !~ ('^'||auth.uid()::text||'/'||p_store::text||'/'||p_planet||'/signup/[0-9a-f-]{36}\.webp$')
  or not exists(select 1 from storage.objects where bucket_id='ng-map-menu-photos' and name=p_photo) then raise exception 'photo_required';end if;
 insert into public.ng_map_menu_details(menu_item_id,planet,taste_level,flavor,category,price,photo_path)
 values(p_menu,p_planet,p_level,p_flavor,p_category,p_price,p_photo);
 return p_menu;
end $$;
revoke all on function public.ng_map_confirm_signup_location(uuid,double precision,double precision),public.ng_map_adopt_signup_menu(uuid,text,uuid,integer,integer,text,text,text) from public,anon;
grant execute on function public.ng_map_confirm_signup_location(uuid,double precision,double precision),public.ng_map_adopt_signup_menu(uuid,text,uuid,integer,integer,text,text,text) to authenticated,service_role;

create or replace function public.ng_map_register_contact(p_phone text,p_planet text,p_store uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_phone text:=regexp_replace(p_phone,'[-\s]','','g');v_url text;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'login_required' using errcode='42501';end if;
 if v_phone !~ '^01(0[0-9]{8}|[16789][0-9]{7,8})$' or v_phone is null or p_planet is null or p_planet not in ('hot','sweet','rich') then raise exception 'invalid_contact';end if;
 if p_store is not null and not exists(select 1 from public.stores s join public.ng_store_claims c on c.store_id=s.id where s.id=p_store and s.owner_id=auth.uid() and s.archived_at is null and c.user_id=auth.uid() and c.status='approved') then raise exception 'owned_store_required' using errcode='42501';end if;
 insert into public.ng_owner_contacts(owner_id,representative_phone) values(auth.uid(),v_phone)
 on conflict(owner_id) do update set representative_phone=excluded.representative_phone,updated_at=now();
 v_url:='https://'||p_planet||'.nowgo.space/owner/dashboard';
 if p_store is not null then insert into public.ng_map_owner_link_messages(owner_id,store_id,planet,management_url) values(auth.uid(),p_store,p_planet,v_url) on conflict(owner_id,store_id,planet) do nothing;end if;
 return jsonb_build_object('managementUrl',v_url,'deliveryStatus','awaiting_provider');
end $$;
update public.ng_map_owner_link_messages set management_url='https://'||planet||'.nowgo.space/owner/dashboard' where status='awaiting_provider';
