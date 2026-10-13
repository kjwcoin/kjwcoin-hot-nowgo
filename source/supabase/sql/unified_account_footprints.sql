-- Personal footprints share the existing account visit ledger; they never self-award EXP or badges.
alter table public.ng_planet_visits add column if not exists source_store_id uuid references hot_source_community.stores(id);
alter table public.ng_planet_visits add column if not exists challenge_title text not null default '' check(char_length(challenge_title)<=100);
alter table public.ng_planet_visits add column if not exists challenge_result text check(challenge_result in ('attempted','completed','failed'));
create or replace function planet_private.footprint(p_planet text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<footprint>>
declare u uuid:=auth.uid();sid uuid;source hot_source_community.stores;shop text:=btrim(p_data->>'shop');country text:=upper(btrim(p_data->>'country'));day date;rid uuid;begin
 if u is null or not exists(select 1 from auth.users where id=u and coalesce(is_anonymous,false)=false) then raise exception 'LOGIN_REQUIRED';end if;
 perform planet_private.ensure_profile(u,p_planet);perform pg_advisory_xact_lock(hashtextextended(u::text||p_planet,0));
 day:=(p_data->>'date')::date;
 if nullif(p_data->>'sourceStoreId','') is not null then sid:=(p_data->>'sourceStoreId')::uuid;select * into source from hot_source_community.stores where id=sid;if not found then raise exception 'STORE_NOT_FOUND';end if;shop:=source.name;end if;
 if day is null or day>(now() at time zone 'Asia/Seoul')::date or day<'1900-01-01' then raise exception 'BAD_DATE';end if;
 if shop is null or char_length(shop) not between 1 and 100 or country is null or country!~'^[A-Z]{2}$' or char_length(coalesce(p_data->>'region',''))>80 or char_length(coalesce(p_data->>'menu',''))>100 or char_length(coalesce(p_data->>'note',''))>1000 or char_length(coalesce(p_data->>'challengeTitle',''))>100 or (nullif(p_data->>'challengeResult','') is not null and p_data->>'challengeResult' not in ('attempted','completed','failed')) then raise exception 'BAD_FOOTPRINT';end if;
 if (select count(*) from public.ng_planet_visits where user_id=u and created_at>now()-interval '1 day')>=100 then raise exception 'RATE_LIMIT';end if;
 select v.id into rid from public.ng_planet_visits v where v.user_id=u and v.planet=p_planet and v.store_id is null and v.status='pending' and v.country=footprint.country and lower(v.shop)=lower(footprint.shop) and v.visited_on=day order by v.created_at desc limit 1;
 if rid is not null then update public.ng_planet_visits set menu=coalesce(p_data->>'menu',''),note=coalesce(p_data->>'note',''),region=coalesce(p_data->>'region',''),challenge_title=coalesce(p_data->>'challengeTitle',''),challenge_result=nullif(p_data->>'challengeResult','') where id=rid and user_id=u;else
 insert into public.ng_planet_visits(user_id,planet,store_id,source_store_id,shop,country,region,visited_on,menu,note,challenge_title,challenge_result,status)
 values(u,p_planet,null,sid,shop,country,coalesce(p_data->>'region',''),day,coalesce(p_data->>'menu',''),coalesce(p_data->>'note',''),coalesce(p_data->>'challengeTitle',''),nullif(p_data->>'challengeResult',''),'pending')
 returning id into rid;end if;
 perform planet_private.emit(u,p_planet,'footprint',rid::text,shop||' 방문 발자국','recorded',0,null);
 return jsonb_build_object('id',rid,'ok',true);
end $$;
revoke all on function planet_private.footprint(text,jsonb) from public;
grant execute on function planet_private.footprint(text,jsonb) to authenticated;
create or replace function public.ng_planet_footprint(p_planet text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select planet_private.footprint(p_planet,p_data)$$;
revoke all on function public.ng_planet_footprint(text,jsonb) from public,anon;
grant execute on function public.ng_planet_footprint(text,jsonb) to authenticated;
notify pgrst,'reload schema';
