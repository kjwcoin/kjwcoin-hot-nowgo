-- Private, durable demand records; requesters are never exposed in public counts.
create table public.ng_map_owner_join_requests (
 place_id text not null check (length(place_id) between 1 and 100),
 user_id uuid not null references auth.users(id) on delete cascade,
 planet text not null check (planet in ('hot','sweet','rich')),
 menu_id uuid not null,
 shop text not null,
 address text not null,
 created_at timestamptz not null default now(),
 primary key(place_id,user_id)
);
create index ng_map_owner_join_requests_user_idx on public.ng_map_owner_join_requests(user_id);
alter table public.ng_map_owner_join_requests enable row level security;
revoke all on public.ng_map_owner_join_requests from public,anon,authenticated;
grant select on public.ng_map_owner_join_requests to authenticated;
create policy owner_join_request_self_read on public.ng_map_owner_join_requests for select to authenticated using (user_id=(select auth.uid()));

create schema if not exists taste_private;
revoke all on schema taste_private from public;
grant usage on schema taste_private to anon,authenticated;
-- Privileged helper reads only a validated public menu and aggregate count.
create function taste_private.owner_join_request(p_planet text,p_menu uuid,p_submit boolean)
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
 if p_submit then
  if v_owner then raise exception 'owner_already_registered';end if;
  insert into public.ng_map_owner_join_requests(place_id,user_id,planet,menu_id,shop,address)
  values(v_menu.place_id,auth.uid(),p_planet,p_menu,v_menu.shop,v_menu.address) on conflict(place_id,user_id) do nothing;
 end if;
 select count(*),coalesce(bool_or(user_id=auth.uid()),false) into v_count,v_requested from public.ng_map_owner_join_requests where place_id=v_menu.place_id;
 return jsonb_build_object('count',v_count,'requested',v_requested,'ownerRegistered',v_owner);
end;
$$;
revoke all on function taste_private.owner_join_request(text,uuid,boolean) from public,anon,authenticated;
-- Unauthenticated callers may obtain counts; the helper itself rejects writes without a real user.
grant execute on function taste_private.owner_join_request(text,uuid,boolean) to anon,authenticated;
create function public.ng_map_owner_join_request_state(p_planet text,p_menu uuid)
returns jsonb language sql security invoker set search_path='' as $$select taste_private.owner_join_request(p_planet,p_menu,false)$$;
create function public.ng_map_request_owner_join(p_planet text,p_menu uuid)
returns jsonb language sql security invoker set search_path='' as $$select taste_private.owner_join_request(p_planet,p_menu,true)$$;
revoke all on function public.ng_map_owner_join_request_state(text,uuid) from public;
revoke all on function public.ng_map_request_owner_join(text,uuid) from public,anon;
grant execute on function public.ng_map_owner_join_request_state(text,uuid) to anon,authenticated;
grant execute on function public.ng_map_request_owner_join(text,uuid) to authenticated;
