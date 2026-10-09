-- A link identifies an owner's store and map; it never grants access by itself.
create table public.ng_map_owner_dashboard_links(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.stores(id) on delete cascade,
 planet text not null check(planet in ('hot','sweet','rich')),
 created_at timestamptz not null default now(),
 unique(owner_id,store_id,planet)
);
alter table public.ng_map_owner_dashboard_links enable row level security;
revoke all on public.ng_map_owner_dashboard_links from public,anon,authenticated;
grant select on public.ng_map_owner_dashboard_links to authenticated;
grant all on public.ng_map_owner_dashboard_links to service_role;
create policy ng_map_dashboard_link_read_own on public.ng_map_owner_dashboard_links for select to authenticated using(owner_id=(select auth.uid()));

create function public.ng_map_issue_dashboard_link(p_store uuid,p_planet text) returns text
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or p_planet is null or p_planet not in ('hot','sweet','rich') then raise exception 'login_required' using errcode='42501';end if;
 if not exists(select 1 from public.stores s join public.owners o on o.id=s.owner_id
  where s.id=p_store and s.owner_id=auth.uid() and s.archived_at is null and o.status='active'
   and exists(select 1 from public.ng_store_claims c where c.store_id=s.id and c.user_id=auth.uid() and c.status='approved')
   and not exists(select 1 from public.ng_account_withdrawals w where w.user_id=auth.uid())) then raise exception 'owned_store_required' using errcode='42501';end if;
 insert into public.ng_map_owner_dashboard_links(owner_id,store_id,planet) values(auth.uid(),p_store,p_planet) on conflict(owner_id,store_id,planet) do nothing;
 select id into v_id from public.ng_map_owner_dashboard_links where owner_id=auth.uid() and store_id=p_store and planet=p_planet;
 return 'https://'||p_planet||'.nowgo.space/owner/dashboard/'||v_id::text;
end $$;

create function public.ng_map_dashboard_access(p_planet text,p_link uuid default null,p_store uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_store uuid:=p_store;v_state jsonb;v_url text;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or p_planet is null or p_planet not in ('hot','sweet','rich') then raise exception 'login_required' using errcode='42501';end if;
 if p_link is not null then
  select l.store_id into v_store from public.ng_map_owner_dashboard_links l join public.stores s on s.id=l.store_id
  where l.id=p_link and l.planet=p_planet and l.owner_id=auth.uid() and s.owner_id=auth.uid() and s.archived_at is null;
  if v_store is null or (p_store is not null and p_store<>v_store) then raise exception 'owned_store_required' using errcode='42501';end if;
 end if;
 v_state:=public.ng_map_owner_dashboard(p_planet,v_store);
 v_store:=(v_state->>'storeId')::uuid;
 if v_store is not null then
  if not exists(select 1 from public.ng_store_claims c where c.store_id=v_store and c.user_id=auth.uid() and c.status='approved') then
   return jsonb_set(v_state,'{access}',jsonb_build_object('enabled',false,'code','approval_required'));
  end if;
  v_url:=public.ng_map_issue_dashboard_link(v_store,p_planet);
  v_state:=v_state||jsonb_build_object('managementUrl',v_url);
 end if;
 return v_state;
end $$;

create or replace function public.ng_map_register_contact(p_phone text,p_planet text,p_store uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_phone text:=regexp_replace(p_phone,'[-\s]','','g');v_url text;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'login_required' using errcode='42501';end if;
 if v_phone !~ '^01(0[0-9]{8}|[16789][0-9]{7,8})$' or v_phone is null or p_planet is null or p_planet not in ('hot','sweet','rich') then raise exception 'invalid_contact';end if;
 if p_store is not null then v_url:=public.ng_map_issue_dashboard_link(p_store,p_planet);end if;
 insert into public.ng_owner_contacts(owner_id,representative_phone) values(auth.uid(),v_phone)
 on conflict(owner_id) do update set representative_phone=excluded.representative_phone,updated_at=now();
 return jsonb_build_object('managementUrl',v_url);
end $$;
revoke all on function public.ng_map_issue_dashboard_link(uuid,text),public.ng_map_dashboard_access(text,uuid,uuid) from public,anon;
grant execute on function public.ng_map_issue_dashboard_link(uuid,text),public.ng_map_dashboard_access(text,uuid,uuid) to authenticated,service_role;
