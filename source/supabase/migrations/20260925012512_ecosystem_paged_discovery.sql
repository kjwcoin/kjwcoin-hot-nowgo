-- Bounded, filtered discovery independent of the legacy 100-row view.
-- Keeps the owner/contact columns out of the public result and performs
-- expensive owner verification only after selecting at most 101 rows.
create or replace function public.ng_public_experience_menus_page(
  p_experience text,
  p_page integer default 0,
  p_query text default null,
  p_heat integer default null,
  p_max_heat integer default null,
  p_flavor text default null,
  p_category text default null,
  p_budget integer default null,
  p_id uuid default null,
  p_place_id text default null
)
returns table (
  id uuid, place_id text, menu text, shop text, address text, price integer,
  heat smallint, flavor text, category text, observed_at date,
  lat double precision, lng double precision, photo_path text,
  created_at timestamptz, nowgo_slug text, verified_owner boolean,
  experience_key text
)
language sql stable security definer set search_path = '' as $$
  with selected as materialized (
    select r.id, r.place_id, r.menu, r.shop, r.address, r.price, r.heat,
      r.flavor, r.category, r.observed_at, r.lat, r.lng, r.created_at,
      r.user_id, r.nowgo_store_id, r.role, r.experience_key
    from public.hot_taste_observations r
    where p_experience in ('hot','rich','sweet')
      and r.experience_key = p_experience
      and r.status = 'published_unverified'
      and (p_id is null or r.id = p_id)
      and (p_place_id is null or r.place_id = left(p_place_id, 100))
      and (p_id is not null or p_place_id is not null or (
        (p_query is null or btrim(p_query) = '' or
          r.menu ilike '%' || left(p_query,60) || '%' or
          r.shop ilike '%' || left(p_query,60) || '%' or
          r.address ilike '%' || left(p_query,60) || '%')
        and (p_heat is null or p_heat not between 1 and 5 or r.heat = p_heat)
        and (p_max_heat is null or p_max_heat not between 1 and 5 or r.heat <= p_max_heat)
        and (p_flavor is null or r.flavor = left(p_flavor,60))
        and (p_category is null or r.category = left(p_category,60))
        and (p_budget is null or p_budget not between 100 and 1000000 or r.price <= p_budget)
      ))
    order by r.created_at desc, r.id desc
    limit case when p_id is not null or p_place_id is not null then 1 else 101 end
    offset case when p_id is not null or p_place_id is not null then 0
      else least(greatest(coalesce(p_page,0),0),100) * 100 end
  )
  select r.id, r.place_id, r.menu, r.shop, r.address, r.price, r.heat,
    r.flavor, r.category, r.observed_at, r.lat, r.lng, r.id::text,
    r.created_at,
    (select s.slug from public.stores s
     join public.ng_store_claims c on c.store_id = s.id
       and c.user_id = r.user_id and c.status = 'approved'
     join public.ng_business_verifications b on b.id = c.business_verification_id
       and b.user_id = r.user_id and b.status = 'verified'
     join public.owners o on o.id = r.user_id and o.status = 'active'
     where s.id = r.nowgo_store_id and s.owner_id = r.user_id
       and s.archived_at is null limit 1),
    (r.role = 'owner' and exists (
     select 1 from public.ng_store_claims c
     join public.ng_business_verifications b on b.id = c.business_verification_id
       and b.user_id = c.user_id
     join public.stores s on s.id = c.store_id and s.owner_id = c.user_id
     join public.owners o on o.id = c.user_id
     where c.user_id = r.user_id and c.store_id = r.nowgo_store_id
       and c.status = 'approved' and b.status = 'verified'
       and o.status = 'active' and s.archived_at is null
    )), r.experience_key
  from selected r;
$$;
revoke all on function public.ng_public_experience_menus_page(
  text, integer, text, integer, integer, text, text, integer, uuid, text
) from public;
grant execute on function public.ng_public_experience_menus_page(
  text, integer, text, integer, integer, text, text, integer, uuid, text
) to anon, authenticated;
create index if not exists hot_observations_public_place
  on public.hot_taste_observations (experience_key, place_id, created_at desc)
  where status = 'published_unverified';
comment on function public.ng_public_experience_menus_page(
  text, integer, text, integer, integer, text, text, integer, uuid, text
) is 'Public-only fields. 100 results/page, maximum page 100; 101st row indicates another page.';
