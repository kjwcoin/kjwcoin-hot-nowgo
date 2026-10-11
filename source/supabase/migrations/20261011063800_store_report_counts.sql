create or replace function public.ng_map_store_report_counts(p_planet text)
returns table(shop_key text,address_key text,report_count bigint)
language sql stable security invoker set search_path=public
as $$
 select lower(trim(shop)),lower(regexp_replace(address,'\s','','g')),count(distinct id)
 from (
 select id,shop,address from public.ng_map_hot_menu_catalog where p_planet='hot' and not verified_owner
 union all select id,shop,address from public.ng_map_sweet_menu_catalog where p_planet='sweet' and not verified_owner
 union all select id,shop,address from public.ng_map_rich_menu_catalog where p_planet='rich' and not verified_owner
 ) reports group by 1,2;
$$;
revoke all on function public.ng_map_store_report_counts(text) from public;
grant execute on function public.ng_map_store_report_counts(text) to anon,authenticated;
