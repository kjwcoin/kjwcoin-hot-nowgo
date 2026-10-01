-- Narrow RPCs share NOWGO's owner_overrides and trust ledger. No duplicate
-- status store, fake scores, user-supplied actor IDs, or new penalty trigger.
create table public.ng_map_subscription_access (
  owner_id uuid primary key references public.owners(id),
  subscription_id bigint unique not null,
  product_code text not null check (product_code = 'product_imaqLBf8q'),
  price_code text not null check (price_code = 'price_NZ6mkW2nM'),
  amount_krw integer not null check (amount_krw = 1900),
  status text not null check (status in ('ACTIVE','CANCELED','EXPIRED','REFUNDED','PAST_DUE')),
  paid_until timestamptz not null,
  verified_at timestamptz not null default now()
);
alter table public.ng_map_subscription_access enable row level security;
revoke all on public.ng_map_subscription_access from public, anon, authenticated;
grant all on public.ng_map_subscription_access to service_role;
-- Only a server-verified, paid StepPay contract may be inserted. This table
-- deliberately has no map trial and no authenticated write policy.

create schema if not exists taste_private;
revoke all on schema taste_private from public;
create or replace function taste_private.map_status_access(p_store uuid, p_owner uuid)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
begin
 -- The map product bills on subscription with no trial. SPACE entitlements
 -- are separate and must never silently grant this paid map capability.
 return exists (select 1 from public.owners o
   join public.ng_map_subscription_access m on m.owner_id=o.id
   where o.id=p_owner and o.status='active'
     and m.status in ('ACTIVE','CANCELED') and m.paid_until>now());
end; $$;
revoke all on function taste_private.map_status_access(uuid,uuid) from public,anon,authenticated;

-- SECURITY DEFINER is necessary to project private incident fields without
-- granting raw customer-report/owner/ledger table access to the browser.
create or replace function public.ng_map_owner_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); result jsonb;
begin
 if actor is null or not exists(select 1 from auth.users u where u.id=actor and not coalesce(u.is_anonymous,false)) then
   raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from public.owners o where o.id=actor and o.status='active') then
   return jsonb_build_object('isOwner',false,'stores','[]'::jsonb,'checkedAt',now()); end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',s.id,'name',s.name,'address',s.address,'slug',s.slug,'hours',s.default_hours,
   'penaltyPoints',s.owner_penalty_points,
   'disabled',s.trust_disabled_at is not null or s.owner_penalty_points>=30,
   'canPublish',s.trust_disabled_at is null and s.owner_penalty_points<30 and taste_private.map_status_access(s.id,actor),
   'overrides',(select coalesce(jsonb_agg(jsonb_build_object('kind',x.kind,'value',x.value,'setAt',x.set_at,'expiresAt',x.expires_at) order by x.set_at desc),'[]'::jsonb)
     from public.owner_overrides x where x.store_id=s.id and x.active and x.kind in ('open_status','congestion')
       and x.set_at<=now() and x.expires_at>now() and x.set_at>now()-interval '24 hours'),
   'incidents',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'detectedAt',i.detected_at,'penaltyPoints',i.penalty_points,'consensusCount',i.consensus_count) order by i.detected_at desc),'[]'::jsonb)
     from (select a.id,a.kind,a.detected_at,a.penalty_points,a.consensus_count from public.owner_trust_incidents a
       where a.store_id=s.id order by a.detected_at desc limit 5) i)
 ) order by s.name),'[]'::jsonb) into result from public.stores s where s.owner_id=actor and s.archived_at is null;
 return jsonb_build_object('isOwner',true,'stores',result,'checkedAt',now());
end; $$;
revoke all on function public.ng_map_owner_snapshot() from public,anon;
grant execute on function public.ng_map_owner_snapshot() to authenticated;

create or replace function public.ng_map_set_owner_status(p_store uuid,p_kind text,p_value text,p_active boolean,p_expiry_mode text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); shop public.stores%rowtype;
begin
 if actor is null or not exists(select 1 from auth.users u where u.id=actor and not coalesce(u.is_anonymous,false))
   or not exists(select 1 from public.owners o where o.id=actor and o.status='active') then
   raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
 select * into shop from public.stores s where s.id=p_store and s.owner_id=actor and s.archived_at is null for update;
 if not found then raise exception 'OWNED_STORE_REQUIRED' using errcode='42501'; end if;
 if shop.trust_disabled_at is not null or shop.owner_penalty_points>=30 then raise exception 'OWNER_TRUST_SUSPENDED' using errcode='42501'; end if;
 if not taste_private.map_status_access(p_store,actor) then raise exception 'SUBSCRIPTION_REQUIRED' using errcode='42501'; end if;
 if p_kind is null or p_value is null or p_active is null or p_request_id is null or p_expiry_mode is null
   or p_expiry_mode not in ('manual','business_day')
   or not ((p_kind='open_status' and p_value in ('open','closed_for_day','ingredients_soldout','temporary_closed','break_time','permanently_closed'))
       or (p_kind='congestion' and p_value in ('full','available'))) then
   raise exception 'INVALID_STATUS' using errcode='22023'; end if;
 -- Reuse the audited, idempotent NOWGO command. The actor and timestamp are
 -- server-derived; both operating states and crowding expire within 24 hours.
 return public.replace_owner_status_v2(p_store,actor,p_kind::public.report_kind,to_jsonb(p_value),p_active,
   case when p_value='permanently_closed' then 'manual' else p_expiry_mode end,p_request_id,clock_timestamp(),false,false,'prompted');
end; $$;
revoke all on function public.ng_map_set_owner_status(uuid,text,text,boolean,text,uuid) from public,anon;
grant execute on function public.ng_map_set_owner_status(uuid,text,text,boolean,text,uuid) to authenticated;

-- Public projection excludes all private IDs, incident details and user data.
-- Consumers only receive a live, non-suspended owner signal for the menu's
-- actual NOWGO store. This reads the same status row written above.
create or replace function public.ng_map_public_owner_status(p_store uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('place_id',s.id,'minihome_url','https://nowgo.space/p/'||s.slug,
   'owner_verified',true,'source','owner','status',o.value,'observed_at',o.set_at,
   'expires_at',o.expires_at,'crowding',case when c.set_at<=now() and c.expires_at>now()
       and c.set_at>now()-interval '24 hours' then c.value else null end)
 from public.stores s join public.owners a on a.id=s.owner_id and a.status='active'
 join lateral (select x.value,x.set_at,x.expires_at from public.owner_overrides x
   where x.store_id=s.id and x.kind='open_status' and x.active and x.set_at<=now()
     and x.expires_at>now() and x.set_at>now()-interval '24 hours' order by x.set_at desc limit 1) o on true
 left join lateral (select x.value,x.set_at,x.expires_at from public.owner_overrides x
   where x.store_id=s.id and x.kind='congestion' and x.active order by x.set_at desc limit 1) c on true
 where s.id=p_store and s.archived_at is null and s.trust_disabled_at is null and s.owner_penalty_points<30
   and s.publication_state in ('PUBLISHED','NOINDEX');
$$;
revoke all on function public.ng_map_public_owner_status(uuid) from public;
grant execute on function public.ng_map_public_owner_status(uuid) to anon,authenticated;
