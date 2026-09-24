-- Public photo object names must never contain member IDs.
alter table public.hot_taste_observations drop constraint if exists hot_taste_observations_photo_path_check;
alter table public.hot_taste_observations add constraint hot_photo_path_matches_report
 check (photo_path = id::text);
drop policy hot_observations_submit on public.hot_taste_observations;
create policy hot_observations_submit on public.hot_taste_observations for insert to authenticated with check (
 (select auth.uid()) = user_id and coalesce((auth.jwt()->>'is_anonymous')::boolean,false) = false
 and status = 'draft' and publication_key is null and photo_path = id::text
);

create or replace view public.hot_public_menus with (security_barrier = true) as
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
 from public.hot_taste_observations r where r.status = 'published_unverified';
revoke all on public.hot_public_menus from public, anon, authenticated;
grant select on public.hot_public_menus to anon, authenticated;

-- Storage sets owner_id to the authenticated member on upload. It remains after a report is deleted.
drop policy hot_photo_owner_upload on storage.objects;
create policy hot_photo_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'hot-report-photos' and owner_id = (select auth.uid())::text
 and exists(select 1 from public.hot_taste_observations r where r.photo_path = name and r.user_id = (select auth.uid())
 and r.status = 'draft' and r.created_at > now() - interval '15 minutes'));
drop policy hot_photo_owner_or_published_read on storage.objects;
create policy hot_photo_owner_or_published_read on storage.objects for select to anon, authenticated
using (bucket_id = 'hot-report-photos' and (owner_id = (select auth.uid())::text or hot_private.is_published_photo(name)));
drop policy hot_photo_owner_delete on storage.objects;
create policy hot_photo_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'hot-report-photos' and owner_id = (select auth.uid())::text);
