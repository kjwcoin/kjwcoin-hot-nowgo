create table public.ng_map_place_favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 place_key text not null check(length(place_key)=64),
 place_id text not null check(place_id ~ '^reported-[a-f0-9]{24}$'),
 planet text not null check(planet in ('hot','sweet','rich')),
 menu_id uuid not null,
 shop text not null check(length(shop) between 1 and 100),
 address text not null check(length(address) between 1 and 300),
 created_at timestamptz not null default now(),
 primary key(user_id,place_key)
);
alter table public.ng_map_place_favorites enable row level security;
revoke all on public.ng_map_place_favorites from public,anon;
grant select,insert,update,delete on public.ng_map_place_favorites to authenticated;
create policy reported_favorite_self on public.ng_map_place_favorites for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
