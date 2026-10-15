-- Public HOT-only leaderboard for verified unique-store stamps.
-- The function exposes pseudonymous IDs and opted-in planet nicknames only.
create or replace function public.ng_hot_stamp_challenge_leaderboard()
returns table(rank integer, public_id text, nickname text, stamp_count bigint)
language sql
stable
security definer
set search_path = ''
as $function$
  with eligible_stores as (
    select e.user_id, e.store_id, min(e.occurred_at) as first_stamp_at
      from public.ng_game_events as e
     where e.surface = 'hot'
       and e.event_type = 'verifiedStoreReport'
       and e.verification_state = 'verified'
       and e.store_id is not null
       and e.reverses is null
       and not exists (
         select 1
           from public.ng_game_events as reversal
          where reversal.reverses = e.id
            and reversal.verification_state = 'verified'
       )
     group by e.user_id, e.store_id
  ),
  totals as (
    select user_id, count(*)::bigint as stamp_count, min(first_stamp_at) as first_stamp_at
      from eligible_stores
     group by user_id
  )
  select
    row_number() over (order by t.stamp_count desc, t.first_stamp_at asc, t.user_id asc)::integer as rank,
    'NG-' || upper(substr(replace(t.user_id::text, '-', ''), 1, 8)) as public_id,
    coalesce(nullif(btrim(p.nickname), ''), 'HOT 탐험가') as nickname,
    t.stamp_count
  from totals as t
  left join public.ng_planet_profiles as p
    on p.user_id = t.user_id
   and p.planet = 'hot'
  order by t.stamp_count desc, t.first_stamp_at asc, t.user_id asc
  limit 10;
$function$;

revoke all on function public.ng_hot_stamp_challenge_leaderboard() from public;
grant execute on function public.ng_hot_stamp_challenge_leaderboard() to anon, authenticated;
