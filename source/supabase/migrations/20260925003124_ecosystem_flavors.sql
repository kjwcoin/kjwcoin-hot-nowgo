-- NG-ECOSYSTEM-001
-- Forward-only expansion of the existing HOT contribution tables so HOT,
-- RICH and SWEET share NOWGO auth.users, stores and owner authorization.
-- Physical table names remain unchanged in this release to preserve every
-- existing row and every deployed client while the public contract becomes
-- experience-aware.

alter table public.hot_menu_saves
  add column if not exists experience_key text not null default 'hot';
alter table public.hot_menu_saves
  drop constraint if exists hot_menu_saves_experience_key_check;
alter table public.hot_menu_saves
  add constraint hot_menu_saves_experience_key_check
  check (experience_key in ('hot', 'rich', 'sweet'));
alter table public.hot_menu_saves drop constraint if exists hot_menu_saves_pkey;
alter table public.hot_menu_saves
  add constraint hot_menu_saves_pkey primary key (user_id, experience_key, menu_id);
drop index if exists public.hot_menu_saves_recent;
create index hot_menu_saves_recent
  on public.hot_menu_saves (user_id, experience_key, created_at desc);

alter table public.hot_member_consents
  add column if not exists experience_key text not null default 'hot';
alter table public.hot_member_consents
  drop constraint if exists hot_member_consents_experience_key_check;
alter table public.hot_member_consents
  add constraint hot_member_consents_experience_key_check
  check (experience_key in ('hot', 'rich', 'sweet'));
alter table public.hot_member_consents drop constraint if exists hot_member_consents_pkey;
alter table public.hot_member_consents
  add constraint hot_member_consents_pkey primary key (user_id, experience_key);

alter table public.hot_taste_observations
  add column if not exists experience_key text not null default 'hot';
alter table public.hot_taste_observations
  drop constraint if exists hot_taste_observations_experience_key_check;
alter table public.hot_taste_observations
  add constraint hot_taste_observations_experience_key_check
  check (experience_key in ('hot', 'rich', 'sweet'));
alter table public.hot_taste_observations
  drop constraint if exists hot_taste_observations_flavor_check;
alter table public.hot_taste_observations
  drop constraint if exists hot_taste_observations_category_check;
alter table public.hot_taste_observations
  add constraint hot_taste_observations_flavor_check check (
    (experience_key = 'hot' and flavor in ('얼큰한','칼칼한','달콤매콤한','알싸한')) or
    (experience_key = 'rich' and flavor in ('rich','creamy','buttery','greasy','oily','heavy','heavy&rich')) or
    (experience_key = 'sweet' and flavor in ('달콤한','상큼달콤한','고소달콤한','쌉쌀달콤한'))
  );
alter table public.hot_taste_observations
  add constraint hot_taste_observations_category_check check (
    (experience_key = 'hot' and category in ('분식','국물·면','고기·볶음','닭발','족발','해산물','기타')) or
    (experience_key = 'rich' and category in ('크림파스타','치즈','버거','튀김','고기','소스','기타')) or
    (experience_key = 'sweet' and category in ('케이크','빵·페이스트리','아이스크림','쿠키·구움과자','전통디저트','음료','기타'))
  );
drop index if exists public.hot_observations_public;
create index hot_observations_public
  on public.hot_taste_observations (experience_key, created_at desc)
  where status = 'published_unverified';
drop index if exists public.hot_observations_own;
create index hot_observations_own
  on public.hot_taste_observations (user_id, experience_key, created_at desc);
create index if not exists hot_observations_store_experience
  on public.hot_taste_observations (nowgo_store_id, experience_key, created_at desc)
  where nowgo_store_id is not null;

create or replace function public.hot_limit_report_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  new.created_at := now();
  if (
    select count(*) from public.hot_taste_observations r
    where r.user_id = new.user_id
      and r.experience_key = new.experience_key
      and r.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'experience report limit exceeded' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.hot_taste_observations r
    where r.user_id = new.user_id
      and r.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'ecosystem report limit exceeded' using errcode = 'P0001';
  end if;
  return new;
end; $$;
revoke all on function public.hot_limit_report_insert() from public, anon, authenticated;

create or replace function public.hot_publish_report(report_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare report public.hot_taste_observations%rowtype;
begin
  if (select auth.uid()) is null
     or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'integrated membership required' using errcode = 'P0001';
  end if;
  select * into report
  from public.hot_taste_observations
  where id = report_id and user_id = (select auth.uid()) and status = 'draft'
  for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'hot-report-photos' and name = report.photo_path
  ) then
    raise exception 'photo required' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.hot_member_consents c
    where c.user_id = report.user_id
      and c.experience_key = report.experience_key
      and (c.essential_version = '2026-09-25-ecosystem-v1'
        or (report.experience_key = 'hot' and c.essential_version = '2026-09-24-hot-v1'))
  ) then
    raise exception 'membership consent required' using errcode = 'P0001';
  end if;
  if report.role = 'owner' and not exists (
    select 1 from public.ng_store_claims c
    join public.ng_business_verifications b
      on b.id = c.business_verification_id and b.user_id = c.user_id
    join public.stores s on s.id = c.store_id and s.owner_id = c.user_id
    join public.owners o on o.id = c.user_id
    where c.user_id = (select auth.uid())
      and c.store_id = report.nowgo_store_id
      and c.status = 'approved' and b.status = 'verified' and o.status = 'active'
      and s.archived_at is null and s.name = report.shop and s.address = report.address
  ) then
    raise exception 'verified store membership required' using errcode = 'P0001';
  end if;
  update public.hot_taste_observations
  set status = 'published_unverified'
  where id = report_id and user_id = (select auth.uid());
  return 'published_unverified';
end; $$;
revoke all on function public.hot_publish_report(uuid) from public, anon;
grant execute on function public.hot_publish_report(uuid) to authenticated;

create or replace view public.hot_public_menus
with (security_barrier = true) as
select r.id, r.place_id, r.menu, r.shop, r.address, r.price,
  r.heat, r.flavor, r.category, r.observed_at, r.lat, r.lng,
  r.id::text as photo_path, r.created_at,
  (select s.slug from public.stores s
   join public.ng_store_claims c
     on c.store_id = s.id and c.user_id = r.user_id and c.status = 'approved'
   join public.ng_business_verifications b
     on b.id = c.business_verification_id and b.user_id = r.user_id and b.status = 'verified'
   join public.owners o on o.id = r.user_id and o.status = 'active'
   where s.id = r.nowgo_store_id and s.owner_id = r.user_id
     and s.archived_at is null limit 1) as nowgo_slug,
  (r.role = 'owner' and exists (
   select 1 from public.ng_store_claims c
   join public.ng_business_verifications b
     on b.id = c.business_verification_id and b.user_id = c.user_id
   join public.stores s on s.id = c.store_id and s.owner_id = c.user_id
   join public.owners o on o.id = c.user_id
   where c.user_id = r.user_id and c.store_id = r.nowgo_store_id
     and c.status = 'approved' and b.status = 'verified' and o.status = 'active'
     and s.archived_at is null
  )) as verified_owner,
  r.experience_key
from public.hot_taste_observations r
where r.status = 'published_unverified';
revoke all on public.hot_public_menus from public, anon, authenticated;
grant select on public.hot_public_menus to anon, authenticated;

-- Stable neutral alias used by NOWGO Hub and new clients. The legacy view stays
-- available so the current HOT deployment remains compatible during rollout.
create or replace view public.ng_experience_public_menus
with (security_barrier = true) as
select * from public.hot_public_menus;
revoke all on public.ng_experience_public_menus from public, anon, authenticated;
grant select on public.ng_experience_public_menus to anon, authenticated;

alter table public.store_favorites
  add column if not exists source_experience text not null default 'hub';
alter table public.store_favorites
  drop constraint if exists store_favorites_source_experience_check;
alter table public.store_favorites
  add constraint store_favorites_source_experience_check
  check (source_experience in ('hub', 'hot', 'rich', 'sweet', 'minihome'));
create index if not exists store_favorites_source_recent
  on public.store_favorites (user_id, source_experience, created_at desc);

create or replace function public.ng_my_ecosystem_summary()
returns table (
  experience_key text,
  saved_count bigint,
  report_count bigint,
  published_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with keys(experience_key) as (
    values ('hot'::text), ('rich'::text), ('sweet'::text)
  )
  select k.experience_key,
    (select count(*) from public.hot_menu_saves s
     where s.user_id = (select auth.uid()) and s.experience_key = k.experience_key),
    (select count(*) from public.hot_taste_observations r
     where r.user_id = (select auth.uid()) and r.experience_key = k.experience_key),
    (select count(*) from public.hot_taste_observations r
     where r.user_id = (select auth.uid()) and r.experience_key = k.experience_key
       and r.status = 'published_unverified')
  from keys k;
$$;
revoke all on function public.ng_my_ecosystem_summary() from public, anon;
grant execute on function public.ng_my_ecosystem_summary() to authenticated;

comment on column public.hot_taste_observations.experience_key is
  'NOWGO discovery surface: hot, rich or sweet. Existing HOT rows are preserved as hot.';
comment on view public.ng_experience_public_menus is
  'Public privacy-filtered discovery feed shared by HOT, RICH, SWEET and NOWGO Hub.';
