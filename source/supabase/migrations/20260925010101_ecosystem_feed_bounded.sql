-- Keep a public request from scanning every published report as data grows.
-- The existing web feed deliberately displays only the latest 100 per flavor.
create or replace function public.ng_public_experience_menus(requested_experience text default null)
returns table (
  id uuid, place_id text, menu text, shop text, address text, price integer,
  heat smallint, flavor text, category text, observed_at date,
  lat double precision, lng double precision, photo_path text,
  created_at timestamptz, nowgo_slug text, verified_owner boolean,
  experience_key text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.place_id, r.menu, r.shop, r.address, r.price, r.heat,
    r.flavor, r.category, r.observed_at, r.lat, r.lng, r.id::text,
    r.created_at,
    (select s.slug from public.stores s
     join public.ng_store_claims c
       on c.store_id = s.id and c.user_id = r.user_id and c.status = 'approved'
     join public.ng_business_verifications b
       on b.id = c.business_verification_id and b.user_id = r.user_id and b.status = 'verified'
     join public.owners o on o.id = r.user_id and o.status = 'active'
     where s.id = r.nowgo_store_id and s.owner_id = r.user_id
       and s.archived_at is null limit 1),
    (r.role = 'owner' and exists (
     select 1 from public.ng_store_claims c
     join public.ng_business_verifications b
       on b.id = c.business_verification_id and b.user_id = c.user_id
     join public.stores s on s.id = c.store_id and s.owner_id = c.user_id
     join public.owners o on o.id = c.user_id
     where c.user_id = r.user_id and c.store_id = r.nowgo_store_id
       and c.status = 'approved' and b.status = 'verified' and o.status = 'active'
       and s.archived_at is null
    )), r.experience_key
  from (
    select * from public.hot_taste_observations
    where status = 'published_unverified'
      and (requested_experience is null or experience_key = requested_experience)
      and (requested_experience is null or requested_experience in ('hot','rich','sweet'))
    order by created_at desc, id desc
    limit 100
  ) r;
$$;
revoke all on function public.ng_public_experience_menus(text) from public;
grant execute on function public.ng_public_experience_menus(text) to anon, authenticated;

create or replace view public.ng_experience_public_menus
with (security_barrier = true, security_invoker = true) as
select id, place_id, menu, shop, address, price, heat, flavor, category,
  observed_at, lat, lng, photo_path, created_at, nowgo_slug, verified_owner,
  experience_key from public.ng_public_experience_menus('hot')
union all
select id, place_id, menu, shop, address, price, heat, flavor, category,
  observed_at, lat, lng, photo_path, created_at, nowgo_slug, verified_owner,
  experience_key from public.ng_public_experience_menus('rich')
union all
select id, place_id, menu, shop, address, price, heat, flavor, category,
  observed_at, lat, lng, photo_path, created_at, nowgo_slug, verified_owner,
  experience_key from public.ng_public_experience_menus('sweet');
