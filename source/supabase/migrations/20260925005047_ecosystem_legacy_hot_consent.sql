-- Keep prior HOT consent valid during transition. New RICH/SWEET contributions
-- always require their own 2026-09-25-ecosystem-v1 consent.
create or replace function public.hot_publish_report(report_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare report public.hot_taste_observations%rowtype;
begin
  if (select auth.uid()) is null
     or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'integrated membership required' using errcode = 'P0001';
  end if;
  select * into report from public.hot_taste_observations
  where id = report_id and user_id = (select auth.uid()) and status = 'draft'
  for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from storage.objects
    where bucket_id = 'hot-report-photos' and name = report.photo_path) then
    raise exception 'photo required' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.hot_member_consents c
    where c.user_id = report.user_id
      and c.experience_key = report.experience_key
      and (c.essential_version = '2026-09-25-ecosystem-v1'
        or (report.experience_key = 'hot' and c.essential_version = '2026-09-24-hot-v1'))) then
    raise exception 'membership consent required' using errcode = 'P0001';
  end if;
  if report.role = 'owner' and not exists (
    select 1 from public.ng_store_claims c
    join public.ng_business_verifications b
      on b.id = c.business_verification_id and b.user_id = c.user_id
    join public.stores s on s.id = c.store_id and s.owner_id = c.user_id
    join public.owners o on o.id = c.user_id
    where c.user_id = (select auth.uid()) and c.store_id = report.nowgo_store_id
      and c.status = 'approved' and b.status = 'verified' and o.status = 'active'
      and s.archived_at is null and s.name = report.shop and s.address = report.address
  ) then
    raise exception 'verified store membership required' using errcode = 'P0001';
  end if;
  update public.hot_taste_observations set status = 'published_unverified'
  where id = report_id and user_id = (select auth.uid());
  return 'published_unverified';
end; $$;
revoke all on function public.hot_publish_report(uuid) from public, anon;
grant execute on function public.hot_publish_report(uuid) to authenticated;
