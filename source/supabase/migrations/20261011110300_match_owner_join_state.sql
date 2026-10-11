create or replace function taste_private.owner_join_request(p_planet text,p_menu uuid,p_submit boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_menu record;v_count bigint;v_requested boolean;v_owner boolean;
begin
 if p_planet is null or p_planet not in ('hot','sweet','rich') then raise exception 'invalid_planet';end if;
 if p_submit and (auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) then raise exception 'login_required' using errcode='42501';end if;
 execute format('select place_id,shop,address,owner_store_id,verified_owner from public.%I where id=$1','ng_map_'||p_planet||'_menu_catalog') into v_menu using p_menu;
 if v_menu.place_id is null then raise exception 'store_not_found';end if;
 -- Owner registration may occur through another menu at the same store.
 select exists(select 1 from public.ng_map_hot_menu_catalog where place_id=v_menu.place_id and (owner_store_id is not null or verified_owner)
 union all select 1 from public.ng_map_sweet_menu_catalog where place_id=v_menu.place_id and (owner_store_id is not null or verified_owner)
 union all select 1 from public.ng_map_rich_menu_catalog where place_id=v_menu.place_id and (owner_store_id is not null or verified_owner)) into v_owner;
 v_owner := v_owner or exists(select 1 from public.ng_map_matched_report_owners(p_planet,array[p_menu]));
 if p_submit then
  if v_owner then raise exception 'owner_already_registered';end if;
  perform pg_advisory_xact_lock(hashtextextended(lower(trim(v_menu.shop))||regexp_replace(lower(v_menu.address),'\s','','g')||auth.uid()::text,0));
  if not exists(select 1 from public.ng_map_owner_join_requests where user_id=auth.uid() and lower(trim(shop))=lower(trim(v_menu.shop)) and regexp_replace(lower(address),'\s','','g')=regexp_replace(lower(v_menu.address),'\s','','g')) then
  insert into public.ng_map_owner_join_requests(place_id,user_id,planet,menu_id,shop,address)
  values(v_menu.place_id,auth.uid(),p_planet,p_menu,v_menu.shop,v_menu.address) on conflict(place_id,user_id) do nothing;
  end if;
 end if;
 select count(distinct user_id),coalesce(bool_or(user_id=auth.uid()),false) into v_count,v_requested from public.ng_map_owner_join_requests where lower(trim(shop))=lower(trim(v_menu.shop)) and regexp_replace(lower(address),'\s','','g')=regexp_replace(lower(v_menu.address),'\s','','g');
 return jsonb_build_object('count',v_count,'requested',v_requested,'ownerRegistered',v_owner);
end;
$$;
