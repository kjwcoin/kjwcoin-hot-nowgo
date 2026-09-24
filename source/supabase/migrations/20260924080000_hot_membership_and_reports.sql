-- HOT uses the same auth.users identities as NOWGO. No second password or phone store.
create table if not exists public.hot_menu_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_id text not null check (char_length(menu_id) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, menu_id)
);
create index if not exists hot_menu_saves_recent on public.hot_menu_saves (user_id, created_at desc);
alter table public.hot_menu_saves enable row level security;
create policy hot_saves_own_select on public.hot_menu_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy hot_saves_own_insert on public.hot_menu_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy hot_saves_own_delete on public.hot_menu_saves for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.hot_taste_observations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('customer', 'owner')),
  nowgo_store_id uuid references public.stores(id),
  phone text not null check (phone ~ '^01[016789][0-9]{7,8}$'),
  business_number text check (business_number ~ '^[0-9]{10}$'),
  place_id text,
  menu_id text not null,
  shop text not null check (char_length(shop) between 2 and 100),
  menu text not null check (char_length(menu) between 2 and 100),
  address text not null check (char_length(address) between 8 and 200),
  price integer not null check (price between 100 and 1000000),
  heat smallint not null check (heat between 1 and 5),
  flavor text not null check (flavor in ('얼큰한','칼칼한','달콤매콤한','알싸한')),
  category text not null check (category in ('분식','국물·면','고기·볶음','닭발','족발','해산물','기타')),
  observed_at date not null check (observed_at <= current_date),
  note text not null default '' check (char_length(note) <= 1000),
  lat double precision check (lat between 37.3 and 37.8),
  lng double precision check (lng between 126.7 and 127.3),
  photo_path text not null check (char_length(photo_path) between 35 and 120),
  photo_mime text not null check (photo_mime in ('image/jpeg','image/png','image/webp')),
  status text not null default 'draft' check (status in ('draft','published_unverified','removed')),
  publication_key text unique,
  created_at timestamptz not null default now(),
  constraint hot_business_contact check ((role = 'owner' and business_number is not null and nowgo_store_id is not null) or (role = 'customer' and business_number is null and nowgo_store_id is null))
);
create index if not exists hot_observations_public on public.hot_taste_observations (created_at desc) where status = 'published_unverified';
create index if not exists hot_observations_own on public.hot_taste_observations (user_id, created_at desc);
alter table public.hot_taste_observations enable row level security;
create function public.hot_limit_report_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
 new.created_at := now();
 if (select count(*) from public.hot_taste_observations r where r.user_id = new.user_id and r.created_at > now() - interval '1 hour') >= 10 then
  raise exception 'HOT report limit exceeded' using errcode = 'P0001';
 end if;
 return new;
end; $$;
revoke all on function public.hot_limit_report_insert() from public;
create trigger hot_limit_reports before insert on public.hot_taste_observations
for each row execute function public.hot_limit_report_insert();
create policy hot_observations_read_own on public.hot_taste_observations for select to authenticated using ((select auth.uid()) = user_id);
create policy hot_observations_submit on public.hot_taste_observations for insert to authenticated with check (
  (select auth.uid()) = user_id and status = 'draft' and publication_key is null
  and photo_path = user_id::text || '/' || id::text
);
create policy hot_observations_own_delete on public.hot_taste_observations for delete to authenticated using ((select auth.uid()) = user_id);

-- Do not grant the client the ability to mark a report as published or official.
revoke update on public.hot_taste_observations from anon, authenticated;
revoke all on public.hot_menu_saves, public.hot_taste_observations from anon, authenticated;
grant select, insert, delete on public.hot_taste_observations to authenticated;
grant select, insert, delete on public.hot_menu_saves to authenticated;

-- A member can upload only for an existing draft, then publish it atomically.
-- The database independently checks the stored photo and required contact fields.
create function public.hot_publish_report(report_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare report public.hot_taste_observations%rowtype;
begin
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
revoke all on function public.hot_publish_report(uuid) from public;
grant execute on function public.hot_publish_report(uuid) to authenticated;

-- Public discovery excludes the author's account ID, unpublished rows and consent data.
create view public.hot_public_menus with (security_barrier = true) as
 select r.id, r.place_id, r.menu, r.shop, r.address, r.price, r.heat, r.flavor, r.category,
  r.observed_at, r.lat, r.lng, r.photo_path, r.created_at,
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
revoke all on public.hot_public_menus from public;
grant select on public.hot_public_menus to anon, authenticated;

create function public.hot_owned_stores() returns table (store_id uuid, name text, address text, slug text, lat double precision, lng double precision)
language sql stable security definer set search_path = '' as $$
 select distinct s.id, s.name, s.address, s.slug, s.lat, s.lon from public.ng_store_claims c
 join public.ng_business_verifications b on b.id=c.business_verification_id and b.user_id=c.user_id
 join public.stores s on s.id=c.store_id and s.owner_id=c.user_id
 join public.owners o on o.id=c.user_id
 where c.user_id = (select auth.uid()) and c.status='approved' and b.status='verified' and o.status='active' and s.archived_at is null;
$$;
revoke all on function public.hot_owned_stores() from public;
grant execute on function public.hot_owned_stores() to authenticated;

create table if not exists public.hot_member_consents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 essential_version text not null,
 essential_at timestamptz not null default now(),
 marketing_email boolean not null default false,
 marketing_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.hot_member_consents enable row level security;
create policy hot_consent_own_read on public.hot_member_consents for select to authenticated using ((select auth.uid()) = user_id);
create policy hot_consent_own_insert on public.hot_member_consents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy hot_consent_own_update on public.hot_member_consents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.hot_member_consents from anon, authenticated;
grant select, insert, update on public.hot_member_consents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hot-report-photos', 'hot-report-photos', false, 2000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2000000, allowed_mime_types = excluded.allowed_mime_types;
create policy hot_photo_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'hot-report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
 and exists(select 1 from public.hot_taste_observations r where r.photo_path = name and r.user_id = (select auth.uid()) and r.created_at > now() - interval '15 minutes'));
create function public.hot_is_published_photo(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.hot_taste_observations r where r.photo_path = object_name and r.status = 'published_unverified');
$$;
revoke all on function public.hot_is_published_photo(text) from public;
grant execute on function public.hot_is_published_photo(text) to anon, authenticated;
create policy hot_photo_owner_or_published_read on storage.objects for select to anon, authenticated
using (bucket_id = 'hot-report-photos' and (
  (storage.foldername(name))[1] = (select auth.uid())::text or public.hot_is_published_photo(name)
));
create policy hot_photo_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'hot-report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
