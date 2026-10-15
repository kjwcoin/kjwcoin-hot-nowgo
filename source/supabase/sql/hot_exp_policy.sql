-- Existing EXP ledger, new event rewards only. No historical XP reset.
create or replace function planet_private.emit(p_user uuid,p_planet text,p_kind text,p_key text,p_title text,p_status text default 'recorded',p_xp integer default 0,p_store uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid;cnt integer;daily_xp integer;
begin
 perform planet_private.ensure_profile(p_user,p_planet);
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_planet,0));
 if p_xp>0 and p_kind in ('report','status') then p_xp:=50;end if;
 if p_xp>0 and p_kind not like 'quest_%' then
  select count(*) into cnt from public.ng_planet_events where user_id=p_user and planet=p_planet and kind=p_kind and xp>0 and status<>'revoked' and (occurred_at at time zone 'Asia/Seoul')::date=(now() at time zone 'Asia/Seoul')::date;
  if cnt>=3 then p_xp:=0;end if;
 end if;
 select coalesce(sum(xp),0) into daily_xp from public.ng_planet_events where user_id=p_user and planet=p_planet and status<>'revoked' and (occurred_at at time zone 'Asia/Seoul')::date=(now() at time zone 'Asia/Seoul')::date;
 if daily_xp+p_xp>100 then p_xp:=0;end if;
 insert into public.ng_planet_events(user_id,planet,kind,source_key,title,status,xp,store_id) values(p_user,p_planet,p_kind,left(p_key,180),left(p_title,180),p_status,p_xp,p_store)
 on conflict(user_id,planet,kind,source_key) do nothing returning id into eid;
 if eid is null then select id into eid from public.ng_planet_events where user_id=p_user and planet=p_planet and kind=p_kind and source_key=left(p_key,180);end if;
 return eid;
end $$;
create or replace function hot_source_community.reward(p_user uuid,p_kind text,p_key text,p_title text) returns integer language plpgsql security definer set search_path='' as $$
declare v_before integer;v_after integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||'hot',0));
 if exists(select 1 from public.ng_planet_events where user_id=p_user and planet='hot' and kind=p_kind and source_key=p_key) then return 0;end if;
 select coalesce(sum(xp),0) into v_before from public.ng_planet_events where user_id=p_user and planet='hot' and status<>'revoked';
 perform planet_private.emit(p_user,'hot',p_kind,p_key,p_title,case when p_kind='status' then 'accepted' else 'published' end,50,null);
 perform planet_private.quest(p_user,'hot',p_kind);
 perform planet_private.evaluate(p_user,'hot');
 select coalesce(sum(xp),0) into v_after from public.ng_planet_events where user_id=p_user and planet='hot' and status<>'revoked';
 return v_after-v_before;
end $$;
revoke all on function hot_source_community.reward(uuid,text,text,text) from public,anon,authenticated;
