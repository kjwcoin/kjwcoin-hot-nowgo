-- Only confirmed GPS + payment visits count; personal diary entries never auto-register a regular.
create or replace function planet_private.auto_regular_after_visit() returns trigger language plpgsql security definer set search_path='' as $$
declare count_days integer;added uuid;
begin
 if new.status<>'verified' or new.store_id is null or new.gps_id is null or new.payment_id is null then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text||new.store_id::text,744));
 if not exists(select 1 from public.stores where id=new.store_id and archived_at is null and trust_disabled_at is null) or exists(select 1 from public.regular_home_hidden where user_id=new.user_id and store_id=new.store_id) then return new;end if;
 select count(distinct v.visited_on) into count_days from public.ng_planet_visits v join public.ng_planet_gps_checks g on g.id=v.gps_id and g.user_id=v.user_id and g.store_id=v.store_id join public.ng_planet_payments p on p.id=v.payment_id and p.user_id=v.user_id and p.store_id=v.store_id and p.state='confirmed' where v.user_id=new.user_id and v.store_id=new.store_id and v.status='verified';
 if count_days>=2 then
 insert into public.store_favorites(store_id,user_id) values(new.store_id,new.user_id) on conflict do nothing returning store_id into added;
 if added is not null then perform planet_private.emit(new.user_id,new.planet,'regular',new.store_id::text,new.shop||' 두 번째 방문 · 단골 등록','recorded',0,new.store_id);end if;
 end if;return new;
end $$;
revoke all on function planet_private.auto_regular_after_visit() from public,anon,authenticated;
create trigger planet_second_visit_regular after insert or update of status,gps_id,payment_id on public.ng_planet_visits for each row execute function planet_private.auto_regular_after_visit();
-- Existing authenticated repeat visitors receive the same rule, respecting explicit removals.
insert into public.store_favorites(store_id,user_id)
select v.store_id,v.user_id from public.ng_planet_visits v join public.ng_planet_gps_checks g on g.id=v.gps_id and g.user_id=v.user_id and g.store_id=v.store_id join public.ng_planet_payments p on p.id=v.payment_id and p.user_id=v.user_id and p.store_id=v.store_id and p.state='confirmed' join public.stores s on s.id=v.store_id and s.archived_at is null and s.trust_disabled_at is null where v.status='verified' and not exists(select 1 from public.regular_home_hidden h where h.store_id=v.store_id and h.user_id=v.user_id) group by v.store_id,v.user_id having count(distinct v.visited_on)>=2 on conflict do nothing;
