-- Resolve only public reported menus to one approved, active owner at the same name/address.
create or replace function public.ng_map_matched_report_owners(p_planet text,p_menus uuid[])
returns table(menu_id uuid,store_id uuid,slug text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_planet not in ('hot','sweet','rich') or p_planet is null or coalesce(array_length(p_menus,1),0)>101 then raise exception 'invalid_match_request';end if;
 return query execute format(
 'select r.id, linked.store_id, linked.slug
 from public.%I r
 join lateral(
 select (array_agg(s.id))[1] store_id,(array_agg(s.slug))[1] slug
 from public.stores s join public.owners o on o.id=s.owner_id
 where s.archived_at is null and o.status=''active'' and s.trust_disabled_at is null and coalesce(s.owner_penalty_points,0)<30
 and length(trim(r.shop))>0 and length(trim(r.address))>0
 and lower(regexp_replace(trim(s.name),''\s'','''',''g''))=lower(regexp_replace(trim(r.shop),''\s'','''',''g''))
 and lower(regexp_replace(trim(s.address),''\s'','''',''g''))=lower(regexp_replace(trim(r.address),''\s'','''',''g''))
 and exists(select 1 from public.ng_store_claims c where c.store_id=s.id and c.user_id=s.owner_id and c.status=''approved'')
 having count(*)=1
 ) linked on linked.store_id is not null
 where r.id=any($1) and r.place_id like ''reported-%%''',
 'ng_map_'||p_planet||'_menu_catalog') using p_menus;
end;
$$;
revoke all on function public.ng_map_matched_report_owners(text,uuid[]) from public;
grant execute on function public.ng_map_matched_report_owners(text,uuid[]) to anon,authenticated;
