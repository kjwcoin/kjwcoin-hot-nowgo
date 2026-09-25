-- Public store search exposes only the fields already shown on a store mini-home.
-- Other store columns, including owner and business details, remain inaccessible.
grant select (id, name, address, slug, archived_at, lat, lon)
on public.stores to anon, authenticated;

create policy taste_public_store_lookup on public.stores
for select to anon, authenticated using (archived_at is null);

create schema if not exists taste_private;
revoke all on schema taste_private from public;

-- Reject an invented store ID or a client-supplied name/address for an existing store.
create or replace function taste_private.validate_customer_store()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'customer' and new.nowgo_store_id is not null and not exists (
    select 1 from public.stores s
    where s.id = new.nowgo_store_id and s.archived_at is null
      and s.name = new.shop and s.address = new.address
      and new.place_id = 'nowgo-' || s.id::text
  ) then
    raise exception 'select an existing NOWGO store again' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- SWEET and RICH publish into materialized public menu tables; the HOT catalog is a view.
create or replace function taste_private.link_customer_public_menu()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  report_table regclass;
  linked_slug text;
begin
  report_table := case tg_table_name
    when 'sweet_public_menus' then 'public.sweet_taste_observations'::regclass
    when 'rich_public_menus' then 'public.rich_taste_observations'::regclass
    else null end;
  if report_table is null then return new; end if;
  execute format(
    'select s.slug from %s r join public.stores s on s.id = r.nowgo_store_id
     where r.id = $1 and r.role = ''customer'' and s.archived_at is null
       and s.name = r.shop and s.address = r.address
       and r.place_id = ''nowgo-'' || s.id::text', report_table)
    into linked_slug using new.id;
  if found then
    new.nowgo_slug := linked_slug;
    new.verified_owner := false;
  end if;
  return new;
end;
$$;

do $$
declare theme text; report_table text; public_table text; constraint_name text;
begin
  foreach theme in array array['hot','sweet','rich'] loop
    report_table := theme || '_taste_observations';
    if to_regclass('public.' || report_table) is null then continue; end if;
    constraint_name := case when theme = 'sweet' then 'sweet_business_contact' else 'hot_business_contact' end;
    execute format('alter table public.%I drop constraint %I', report_table, constraint_name);
    execute format('alter table public.%I add constraint %I check (
      (role = ''owner'' and business_number is not null and nowgo_store_id is not null)
      or (role = ''customer'' and business_number is null))', report_table, constraint_name);
    execute format('create trigger validate_customer_store before insert or update on public.%I
      for each row execute function taste_private.validate_customer_store()', report_table);
    public_table := theme || '_public_menus';
    if theme <> 'hot' and exists (select 1 from pg_class where oid = to_regclass('public.' || public_table) and relkind = 'r') then
      execute format('create trigger link_customer_store before insert or update on public.%I
        for each row execute function taste_private.link_customer_public_menu()', public_table);
    end if;
  end loop;
end;
$$;

do $$
begin
  -- Dev already uses the newer shared experience view, which has an extra column.
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'hot_public_menus' and column_name = 'experience_key') then
    execute $view$
create or replace view public.hot_public_menus as
select r.id, r.place_id, r.menu, r.shop, r.address, r.price, r.heat,
       r.flavor, r.category, r.observed_at, r.lat, r.lng,
       r.id::text as photo_path, r.created_at,
       case when r.role = 'customer' then (
         select s.slug from public.stores s
         where s.id = r.nowgo_store_id and s.archived_at is null
           and s.name = r.shop and s.address = r.address
           and r.place_id = 'nowgo-' || s.id::text limit 1
       ) else (
         select s.slug from public.stores s
         join public.ng_store_claims c on c.store_id = s.id
           and c.user_id = r.user_id and c.status = 'approved'
         join public.ng_business_verifications b on b.id = c.business_verification_id
           and b.user_id = r.user_id and b.status = 'verified'
         join public.owners o on o.id = r.user_id and o.status = 'active'
         where s.id = r.nowgo_store_id and s.owner_id = r.user_id
           and s.archived_at is null limit 1
       ) end as nowgo_slug,
       r.role = 'owner' and exists (
         select 1 from public.ng_store_claims c
         join public.ng_business_verifications b on b.id = c.business_verification_id
           and b.user_id = c.user_id
         join public.stores s on s.id = c.store_id and s.owner_id = c.user_id
         join public.owners o on o.id = c.user_id
         where c.user_id = r.user_id and c.store_id = r.nowgo_store_id
           and c.status = 'approved' and b.status = 'verified'
           and o.status = 'active' and s.archived_at is null
       ) as verified_owner
from public.hot_taste_observations r
where r.status = 'published_unverified';

$view$;
  end if;
end;
$$;
