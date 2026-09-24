-- The existing NOWGO project grants EXECUTE to anon/authenticated by default.
-- Revoke it explicitly for privileged HOT functions, then allow only necessary callers.
revoke all on function public.hot_limit_report_insert() from public, anon, authenticated;
revoke all on function public.hot_owned_stores() from public, anon, authenticated;
grant execute on function public.hot_owned_stores() to authenticated;
revoke all on function public.hot_publish_report(uuid) from public, anon, authenticated;
grant execute on function public.hot_publish_report(uuid) to authenticated;

-- Storage policy helper lives outside the exposed Data API schema.
create schema if not exists hot_private;
revoke all on schema hot_private from public;
grant usage on schema hot_private to anon, authenticated;
create function hot_private.is_published_photo(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.hot_taste_observations r where r.photo_path = object_name and r.status = 'published_unverified');
$$;
revoke all on function hot_private.is_published_photo(text) from public, anon, authenticated;
grant execute on function hot_private.is_published_photo(text) to anon, authenticated;
drop policy hot_photo_owner_or_published_read on storage.objects;
create policy hot_photo_owner_or_published_read on storage.objects for select to anon, authenticated
using (bucket_id = 'hot-report-photos' and (
  (storage.foldername(name))[1] = (select auth.uid())::text or hot_private.is_published_photo(name)
));
drop function public.hot_is_published_photo(text);

-- Authenticated Supabase anonymous guests are not integrated NOWGO members.
drop policy hot_observations_submit on public.hot_taste_observations;
create policy hot_observations_submit on public.hot_taste_observations for insert to authenticated with check (
  (select auth.uid()) = user_id and coalesce((auth.jwt()->>'is_anonymous')::boolean,false) = false
  and status = 'draft' and publication_key is null and photo_path = user_id::text || '/' || id::text
);
create or replace function public.hot_publish_report(report_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare report public.hot_taste_observations%rowtype;
begin
 if (select auth.uid()) is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
  raise exception 'integrated membership required' using errcode = 'P0001';
 end if;
 select * into report from public.hot_taste_observations where id = report_id and user_id = (select auth.uid()) and status = 'draft' for update;
 if not found then raise exception 'report not found' using errcode = 'P0002'; end if;
 if not exists(select 1 from storage.objects where bucket_id = 'hot-report-photos' and name = report.photo_path) then
  raise exception 'photo required' using errcode = 'P0001';
 end if;
 if not exists(select 1 from public.hot_member_consents where user_id = report.user_id and essential_version = '2026-09-24-hot-v1') then
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
 update public.hot_taste_observations set status = 'published_unverified' where id = report_id;
 return 'published_unverified';
end; $$;
revoke all on function public.hot_publish_report(uuid) from public, anon;
grant execute on function public.hot_publish_report(uuid) to authenticated;
