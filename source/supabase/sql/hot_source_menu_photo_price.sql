-- Source menu photos and prices remain customer facts, separate from the public catalog.
alter table hot_source_community.taste_reports add column if not exists price integer check(price between 0 and 10000000);
alter table hot_source_community.taste_reports add column if not exists photo_path text;
insert into storage.buckets(id,name,public,allowed_mime_types) values('hot-source-menu-photos','hot-source-menu-photos',false,array['image/webp']) on conflict(id) do nothing;
create or replace function hot_source_community.published_photo(p_path text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from hot_source_community.taste_reports where photo_path=p_path)$$;
revoke all on function hot_source_community.published_photo(text) from public;
grant execute on function hot_source_community.published_photo(text) to anon,authenticated;
create policy hot_source_photo_upload on storage.objects for insert to authenticated with check(bucket_id='hot-source-menu-photos' and (storage.foldername(name))[1]=auth.uid()::text and name ~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy hot_source_photo_read on storage.objects for select to anon,authenticated using(bucket_id='hot-source-menu-photos' and (owner_id=auth.uid()::text or hot_source_community.published_photo(name)));
create policy hot_source_photo_cleanup on storage.objects for delete to authenticated using(bucket_id='hot-source-menu-photos' and owner_id=auth.uid()::text and not hot_source_community.published_photo(name));
create or replace function hot_source_community.state(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if not exists(select 1 from hot_source_community.stores where id=p_store) then raise exception 'source_store_not_found'; end if;
 select jsonb_build_object(
  'ownerRequests',(select count(*) from hot_source_community.owner_requests where store_id=p_store),
  'requested',exists(select 1 from hot_source_community.owner_requests where store_id=p_store and user_id=auth.uid()),
  'menus',coalesce((select jsonb_agg(q.summary order by q.menu_name) from (
   select min(menu_name) menu_name,jsonb_build_object('menu',min(menu_name),'count',count(*),'heat',percentile_cont(0.5) within group(order by heat),'flavor',mode() within group(order by flavor),'price',(array_agg(price order by updated_at desc) filter(where price is not null))[1],'photoPath',(array_agg(photo_path order by updated_at desc) filter(where photo_path is not null))[1]) summary
   from hot_source_community.taste_reports where store_id=p_store group by menu_key
  ) q),'[]'::jsonb),
  'myReports',coalesce((select jsonb_agg(jsonb_build_object('menu',menu_name,'heat',heat,'flavor',flavor,'note',note)) from hot_source_community.taste_reports where store_id=p_store and user_id=auth.uid()),'[]'::jsonb)
 ) into v_result;
 return v_result;
end $$;
revoke all on function hot_source_community.state(uuid) from public;
grant execute on function hot_source_community.state(uuid) to anon,authenticated;


create or replace function public.ng_hot_source_menu_submit(p_store uuid,p_menu text,p_heat integer,p_flavor text,p_price integer,p_photo text,p_consent boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;v_key text:=lower(regexp_replace(btrim(p_menu),'\s+',' ','g'));
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and coalesce(is_anonymous,false)=false) then raise exception 'login_required'; end if;
 if p_consent is distinct from true or p_price is null or p_price not between 0 and 10000000 or p_photo is null or p_photo not like auth.uid()::text||'/'||p_store::text||'/%' or not exists(select 1 from storage.objects where bucket_id='hot-source-menu-photos' and name=p_photo and owner_id=auth.uid()::text) then raise exception 'invalid_menu_photo_price';end if;
 v_result:=hot_source_community.submit(p_store,'taste',p_menu,p_heat,p_flavor,'',p_consent);
 update hot_source_community.taste_reports set price=p_price,photo_path=p_photo,consent_version='hot-source-menu-photo-v1' where store_id=p_store and user_id=auth.uid() and menu_key=v_key;
 return hot_source_community.state(p_store)||jsonb_build_object('awardedExp',v_result->'awardedExp');
end $$;
revoke all on function public.ng_hot_source_menu_submit(uuid,text,integer,text,integer,text,boolean) from public,anon;
grant execute on function public.ng_hot_source_menu_submit(uuid,text,integer,text,integer,text,boolean) to authenticated;
notify pgrst,'reload schema';

-- Legacy public taste submission must use the photo-and-price receipt flow.
create or replace function public.ng_hot_source_community_submit(p_store uuid,p_action text,p_menu text default '',p_heat integer default null,p_flavor text default '',p_note text default '',p_consent boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$begin if p_action='taste' then raise exception 'invalid_menu_photo_price'; end if; return hot_source_community.submit(p_store,p_action,p_menu,p_heat,p_flavor,p_note,p_consent);end $$;
