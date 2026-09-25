-- RICH shares NOWGO auth.users and verified store ownership with HOT.
-- Its reports, saved menus, consent and photos have their own access boundary.
create table public.rich_menu_saves (like public.hot_menu_saves including all);
alter table public.rich_menu_saves add foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.rich_menu_saves enable row level security;
create policy rich_saves_read on public.rich_menu_saves for select to authenticated using (user_id = (select auth.uid()));
create policy rich_saves_add on public.rich_menu_saves for insert to authenticated with check (user_id = (select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false) = false);
create policy rich_saves_remove on public.rich_menu_saves for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.rich_menu_saves from public, anon, authenticated;
grant select, insert, delete on public.rich_menu_saves to authenticated;

create table public.rich_member_consents (like public.hot_member_consents including all);
alter table public.rich_member_consents add foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.rich_member_consents enable row level security;
create policy rich_consent_read on public.rich_member_consents for select to authenticated using (user_id = (select auth.uid()));
create policy rich_consent_add on public.rich_member_consents for insert to authenticated with check (user_id = (select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false) = false);
create policy rich_consent_edit on public.rich_member_consents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.rich_member_consents from public, anon, authenticated;
grant select, insert, update on public.rich_member_consents to authenticated;

create table public.rich_taste_observations (like public.hot_taste_observations including all);
alter table public.rich_taste_observations
 add foreign key (user_id) references auth.users(id) on delete cascade,
 add foreign key (nowgo_store_id) references public.stores(id),
 drop constraint hot_taste_observations_flavor_check,
 add constraint rich_flavor check (flavor in ('고소한','크리미한','버터 풍미','치즈 풍미','기름진')),
 drop constraint hot_taste_observations_category_check,
 add constraint rich_category check (category in ('파스타','치즈·그라탱','베이커리','디저트','고기·튀김','기타'));
alter table public.rich_taste_observations enable row level security;
create policy rich_reports_read on public.rich_taste_observations for select to authenticated using (user_id = (select auth.uid()));
create policy rich_reports_add on public.rich_taste_observations for insert to authenticated with check (
 user_id = (select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false) = false
 and status = 'draft' and publication_key is null and photo_path = id::text
);
create policy rich_reports_delete on public.rich_taste_observations for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.rich_taste_observations from public, anon, authenticated;
grant select, insert, delete on public.rich_taste_observations to authenticated;

-- Rate limit by NOWGO member without trusting timestamps submitted by the browser.
create function public.rich_limit_report_insert() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
 new.created_at := now();
 if (select count(*) from public.rich_taste_observations r where r.user_id = new.user_id and r.created_at > now() - interval '1 hour') >= 10 then
  raise exception 'RICH report limit exceeded' using errcode = 'P0001';
 end if;
 return new;
end; $$;
revoke all on function public.rich_limit_report_insert() from public, anon, authenticated;
create trigger rich_limit_reports before insert on public.rich_taste_observations for each row execute function public.rich_limit_report_insert();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('rich-report-photos','rich-report-photos',false,2000000,array['image/jpeg','image/png','image/webp']);
create policy rich_photo_upload on storage.objects for insert to authenticated
with check (bucket_id = 'rich-report-photos' and owner_id = (select auth.uid())::text
 and exists(select 1 from public.rich_taste_observations r where r.photo_path = name and r.user_id = (select auth.uid())
  and r.status = 'draft' and r.created_at > now() - interval '15 minutes'));
create schema if not exists rich_private;
revoke all on schema rich_private from public;
grant usage on schema rich_private to anon, authenticated;
create function rich_private.is_published_photo(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.rich_taste_observations r where r.photo_path = object_name and r.status = 'published_unverified');
$$;
revoke all on function rich_private.is_published_photo(text) from public, anon, authenticated;
grant execute on function rich_private.is_published_photo(text) to anon, authenticated;
create policy rich_photo_read on storage.objects for select to anon, authenticated
using (bucket_id = 'rich-report-photos' and (owner_id = (select auth.uid())::text or rich_private.is_published_photo(name)));
create policy rich_photo_delete on storage.objects for delete to authenticated
using (bucket_id = 'rich-report-photos' and owner_id = (select auth.uid())::text);

create function public.rich_publish_report(report_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare report public.rich_taste_observations%rowtype;
begin
 if (select auth.uid()) is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
  raise exception 'integrated membership required' using errcode = 'P0001';
 end if;
 select * into report from public.rich_taste_observations where id = report_id and user_id = (select auth.uid()) and status = 'draft' for update;
 if not found then raise exception 'report not found' using errcode = 'P0002'; end if;
 if not exists(select 1 from storage.objects where bucket_id = 'rich-report-photos' and name = report.photo_path) then
  raise exception 'photo required' using errcode = 'P0001';
 end if;
 if not exists(select 1 from public.rich_member_consents where user_id = report.user_id and essential_version = '2026-09-25-rich-v1') then
  raise exception 'membership consent required' using errcode = 'P0001';
 end if;
 if report.role = 'owner' and not exists (
  select 1 from public.ng_store_claims c
  join public.ng_business_verifications b on b.id = c.business_verification_id and b.user_id = c.user_id
  join public.stores s on s.id = c.store_id and s.owner_id = c.user_id
  join public.owners o on o.id = c.user_id
  where c.user_id = (select auth.uid()) and c.store_id = report.nowgo_store_id
   and c.status = 'approved' and b.status = 'verified' and o.status = 'active'
   and s.archived_at is null and s.name = report.shop and s.address = report.address
 ) then raise exception 'verified store membership required' using errcode = 'P0001'; end if;
 update public.rich_taste_observations set status = 'published_unverified' where id = report_id;
 return 'published_unverified';
end; $$;
revoke all on function public.rich_publish_report(uuid) from public, anon, authenticated;
grant execute on function public.rich_publish_report(uuid) to authenticated;

create view public.rich_public_menus with (security_barrier = true) as
 select r.id, r.place_id, r.menu, r.shop, r.address, r.price, r.heat, r.flavor, r.category,
  r.observed_at, r.lat, r.lng, r.id::text as photo_path, r.created_at,
  (select s.slug from public.stores s
   join public.ng_store_claims c on c.store_id=s.id and c.user_id=r.user_id and c.status='approved'
   join public.ng_business_verifications b on b.id=c.business_verification_id and b.user_id=r.user_id and b.status='verified'
   join public.owners o on o.id=r.user_id and o.status='active'
   where s.id = r.nowgo_store_id and s.owner_id=r.user_id and s.archived_at is null limit 1) as nowgo_slug,
  (r.role = 'owner' and exists(
   select 1 from public.ng_store_claims c join public.ng_business_verifications b on b.id=c.business_verification_id and b.user_id=c.user_id
   join public.stores s on s.id=c.store_id and s.owner_id=c.user_id
   join public.owners o on o.id=c.user_id
   where c.user_id=r.user_id and c.store_id=r.nowgo_store_id and c.status='approved' and b.status='verified' and o.status='active' and s.archived_at is null
  )) as verified_owner
 from public.rich_taste_observations r where r.status = 'published_unverified';
revoke all on public.rich_public_menus from public, anon, authenticated;
grant select on public.rich_public_menus to anon, authenticated;
