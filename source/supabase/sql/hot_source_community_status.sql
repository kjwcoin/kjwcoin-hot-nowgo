create table if not exists hot_source_community.status_reports(
 store_id uuid not null references hot_source_community.stores(id),user_id uuid not null references auth.users(id) on delete cascade,
 status text not null check(status in ('permanent_closed','temporary_closed','ingredients_soldout')),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 primary key(store_id,user_id)
);
alter table hot_source_community.status_reports enable row level security;
revoke all on hot_source_community.status_reports from public,anon,authenticated;
create index if not exists hot_source_status_user_time on hot_source_community.status_reports(user_id,created_at);
create or replace function hot_source_community.status_state(p_store uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('status',status,'count',count,'reportedAt',reported_at,'expiresAt',expires_at,'confirmed',count>=3) order by reported_at desc),'[]'::jsonb)
 from (select status,count(*) count,max(created_at) reported_at,max(expires_at) expires_at from hot_source_community.status_reports where store_id=p_store and expires_at>now() group by status) q
$$;
revoke all on function hot_source_community.status_state(uuid) from public;
grant execute on function hot_source_community.status_state(uuid) to anon,authenticated;
create or replace function hot_source_community.submit_status(p_store uuid,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_owned uuid;v_old text;v_old_at timestamptz;v_value text;v_expiry timestamptz;v_awarded integer:=0;v_inserted integer;v_reporter uuid;v_points integer;
begin
 if v_user is null or not exists(select 1 from auth.users where id=v_user and coalesce(is_anonymous,false)=false) then raise exception 'login_required'; end if;
 if p_status is null or p_status not in ('permanent_closed','temporary_closed','ingredients_soldout') then raise exception 'invalid_source_status'; end if;
 if not exists(select 1 from hot_source_community.stores where id=p_store) then raise exception 'source_store_not_found'; end if;
 if exists(select 1 from public.stores s join hot_source_community.stores c on c.id=p_store where s.owner_id=v_user and s.archived_at is null and regexp_replace(lower(s.name),'[[:space:]]','','g')=regexp_replace(lower(c.name),'[[:space:]]','','g') and regexp_replace(lower(s.address),'[[:space:]]','','g')=regexp_replace(lower(c.address),'[[:space:]]','','g')) then raise exception 'owner_report_requires_dashboard';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,731));
 select status,created_at into v_old,v_old_at from hot_source_community.status_reports where store_id=p_store and user_id=v_user;
 if v_old_at>now()-interval '30 seconds' then raise exception 'request_rate_limited'; end if;
 if (select count(*) from hot_source_community.status_reports where user_id=v_user and created_at>now()-interval '24 hours')>=100 then raise exception 'request_rate_limited'; end if;
 v_expiry:=now()+case when p_status='permanent_closed' then interval '24 hours' else interval '2 hours' end;
 insert into hot_source_community.status_reports(store_id,user_id,status,expires_at) values(p_store,v_user,p_status,v_expiry)
 on conflict(store_id,user_id) do update set status=excluded.status,created_at=now(),expires_at=excluded.expires_at;
 -- A source identity is not an owned-store UUID. Match a unique verified existing
 -- store before forwarding a customer signal to SPACE's established trust trigger.
 select case when count(*)=1 then (array_agg(s.id))[1] end into v_owned
 from public.stores s join public.owners o on o.id=s.owner_id and o.status='active' join hot_source_community.stores c on c.id=p_store
 where s.owner_id is not null and s.owner_id<>v_user and s.archived_at is null and s.trust_disabled_at is null
 and regexp_replace(lower(s.name),'[[:space:]]','','g')=regexp_replace(lower(c.name),'[[:space:]]','','g')
 and regexp_replace(lower(s.address),'[[:space:]]','','g')=regexp_replace(lower(c.address),'[[:space:]]','','g');
 if v_owned is not null and p_status<>'permanent_closed' and (v_old is distinct from p_status or v_old_at<now()-interval '2 hours') then
  v_value:=case when p_status='temporary_closed' then 'closed_for_day' else 'ingredients_soldout' end;
  insert into public.reports(store_id,kind,value,reporter_id,expires_at) values(v_owned,'open_status',to_jsonb(v_value),v_user,v_expiry);
 end if;
 -- Status signals become rewardable after three distinct current customer reports agree.
 if (select count(*) from hot_source_community.status_reports where store_id=p_store and status=p_status and expires_at>now())>=3 then
  for v_reporter in select user_id from hot_source_community.status_reports where store_id=p_store and status=p_status and expires_at>now() order by user_id loop
   v_points:=hot_source_community.reward(v_reporter,'status','source-status:'||p_store::text||':'||(now() at time zone 'Asia/Seoul')::date::text,'매장 영업상태 제보');
   if v_reporter=v_user then v_awarded:=v_points;end if;
  end loop;
 end if;
 return jsonb_build_object('statuses',hot_source_community.status_state(p_store),'awardedExp',v_awarded);
end $$;
revoke all on function hot_source_community.submit_status(uuid,text) from public;
grant execute on function hot_source_community.submit_status(uuid,text) to authenticated;
create or replace function public.ng_hot_source_status_state(p_store uuid) returns jsonb language sql stable security invoker set search_path='' as $$select hot_source_community.status_state(p_store)$$;
create or replace function public.ng_hot_source_status_submit(p_store uuid,p_status text) returns jsonb language sql security invoker set search_path='' as $$select hot_source_community.submit_status(p_store,p_status)$$;
revoke all on function public.ng_hot_source_status_state(uuid) from public;
revoke all on function public.ng_hot_source_status_submit(uuid,text) from public,anon;
grant execute on function public.ng_hot_source_status_state(uuid) to anon,authenticated;
grant execute on function public.ng_hot_source_status_submit(uuid,text) to authenticated;
-- Only owner-verified matching stores are subject to the SPACE visibility policy.
create or replace function hot_source_community.hidden_stores() returns uuid[] language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(c.id),'{}'::uuid[]) from hot_source_community.stores c
 where exists(select 1 from public.stores s join public.owners o on o.id=s.owner_id and o.status='active' where s.owner_id is not null and regexp_replace(lower(s.name),'[[:space:]]','','g')=regexp_replace(lower(c.name),'[[:space:]]','','g') and regexp_replace(lower(s.address),'[[:space:]]','','g')=regexp_replace(lower(c.address),'[[:space:]]','','g'))
 and not exists(select 1 from public.stores s join public.owners o on o.id=s.owner_id and o.status='active' where s.owner_id is not null and s.archived_at is null and s.trust_disabled_at is null and coalesce(s.owner_penalty_points,0)<30 and regexp_replace(lower(s.name),'[[:space:]]','','g')=regexp_replace(lower(c.name),'[[:space:]]','','g') and regexp_replace(lower(s.address),'[[:space:]]','','g')=regexp_replace(lower(c.address),'[[:space:]]','','g'))
$$;
revoke all on function hot_source_community.hidden_stores() from public;
grant execute on function hot_source_community.hidden_stores() to anon,authenticated;
create or replace function public.ng_hot_source_hidden_stores() returns uuid[] language sql stable security invoker set search_path='' as $$select hot_source_community.hidden_stores()$$;
revoke all on function public.ng_hot_source_hidden_stores() from public;
grant execute on function public.ng_hot_source_hidden_stores() to anon,authenticated;
notify pgrst,'reload schema';
