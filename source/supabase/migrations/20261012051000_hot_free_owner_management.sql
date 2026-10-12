-- HOT opening/menu/sold-out management is free; the separate ad auction is paid.
-- Preserve the deployed ownership, withdrawal, trust and other-planet checks.
-- Requires the map owner workspace migrations; fail explicitly if it is absent.
do $$
declare v_oid regprocedure:=to_regprocedure('public.ng_map_can_publish(uuid,text)');v_source text;v_updated text;
begin
 if v_oid is null then raise exception 'map_owner_workspace_required';end if;
 select pg_get_functiondef(v_oid) into v_source;
 if position('and (p_planet=''hot'' or exists(select 1 from public.ng_paddle_subscriptions' in v_source)>0 then return;end if;
 if position('and (exists(select 1 from public.ng_paddle_subscriptions' in v_source)=0
  or position('public.ng_store_claims' in v_source)=0
  or position('public.ng_account_withdrawals' in v_source)=0 then raise exception 'map_owner_policy_requires_review';end if;
 v_updated:=replace(v_source,'and (exists(select 1 from public.ng_paddle_subscriptions','and (p_planet=''hot'' or exists(select 1 from public.ng_paddle_subscriptions');
 execute v_updated;
end $$;

-- A HOT owner updates the canonical featured item instead of creating more items.
do $$
declare v_oid regprocedure:=to_regprocedure('public.ng_map_save_menu(uuid,text,uuid,text,integer,integer,text,text,text)');v_source text;
begin
 if v_oid is null then raise exception 'map_owner_workspace_required';end if;
 select pg_get_functiondef(v_oid) into v_source;
 if position('hot_single_representative_required' in v_source)>0 then return;end if;
 if position(' if p_menu is not null then' in v_source)=0 or position('pg_advisory_xact_lock' in v_source)=0 then raise exception 'map_menu_policy_requires_review';end if;
 v_source:=replace(v_source,'declare ','declare v_featured uuid;');
 v_source:=replace(v_source,' if p_menu is not null then',E' if p_planet=''hot'' then\n  select f.menu_item_id into v_featured from public.ng_owner_featured_menus f where f.store_id=p_store and f.planet=''hot'';\n  if v_featured is null or (p_menu is not null and p_menu<>v_featured) then raise exception ''hot_single_representative_required'';end if;\n  p_menu:=v_featured;\n end if;\n if p_menu is not null then');
 execute v_source;
end $$;
