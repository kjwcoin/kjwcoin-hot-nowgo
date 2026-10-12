-- Expand HOT only. Keep existing values, data, policies and RPC grants intact.
alter table public.hot_taste_observations drop constraint hot_taste_observations_heat_check;
alter table public.hot_taste_observations add constraint hot_taste_observations_heat_check check (heat between 1 and 8);
alter table public.ng_owner_featured_menus drop constraint ng_owner_featured_menus_taste_level_check;
alter table public.ng_owner_featured_menus add constraint ng_owner_featured_menus_taste_level_check
 check (taste_level between 1 and case when planet='hot' then 8 else 5 end);
do $$
declare v_oid regprocedure; v_source text; v_changed text;
begin
 if to_regclass('public.ng_map_menu_details') is not null then
  alter table public.ng_map_menu_details drop constraint ng_map_menu_details_taste_level_check;
  alter table public.ng_map_menu_details add constraint ng_map_menu_details_taste_level_check
   check (taste_level between 1 and case when planet='hot' then 8 else 5 end);
 end if;
 v_oid:=to_regprocedure('public.ng_set_owner_featured_menu(uuid,uuid,uuid,text,text,text,smallint,text,text)');
 if v_oid is not null then
  v_source:=pg_get_functiondef(v_oid);
  v_changed:=replace(v_source,'p_level not between 1 and 5','p_level not between 1 and (case when p_planet=''hot'' then 8 else 5 end)');
  if v_source=v_changed and position('p_level not between 1 and (case when p_planet=''hot'' then 8 else 5 end)' in v_source)=0 then raise exception 'Unexpected featured-menu validator; review before migration';end if;
  execute v_changed;
 end if;
 v_oid:=to_regprocedure('public.ng_map_validate_taste(text,integer,text,text)');
 if v_oid is not null then
  v_source:=pg_get_functiondef(v_oid);
  v_changed:=replace(v_source,'p_level between 1 and 5','p_level between 1 and (case when p_planet=''hot'' then 8 else 5 end)');
  if v_source=v_changed and position('p_level between 1 and (case when p_planet=''hot'' then 8 else 5 end)' in v_source)=0 then raise exception 'Unexpected map taste validator; review before migration';end if;
  execute v_changed;
 end if;
end $$;
