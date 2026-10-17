-- HOT-only database guard: 1..7, with stage 7 = 극강의 매운맛.
-- SWEET and RICH retain 1..5. No payment, production deployment or user data writes.
-- Intended for reviewed development migration, never apply to production automatically.
do $hot_7_preflight$
begin
  if exists (
    select 1 from public.ng_owner_featured_menus
    where planet = 'hot' and (taste_level < 1 or taste_level > 7)
  ) then
    raise exception 'hot_stage_outside_1_7_must_be_reviewed';
  end if;
end
$hot_7_preflight$;

alter table public.ng_owner_featured_menus
  drop constraint ng_owner_featured_menus_taste_level_check;
alter table public.ng_owner_featured_menus
  add constraint ng_owner_featured_menus_taste_level_check
  check (
    taste_level >= 1
    and taste_level <= case when planet = 'hot' then 7 else 5 end
  );

-- No backfill of user ratings: owner-declared heat and user median remain distinct.
-- The separate ng_map_menu_details migration still needs HOT 1..7 support
-- and a subscription-verified owner RPC before any release approval.
