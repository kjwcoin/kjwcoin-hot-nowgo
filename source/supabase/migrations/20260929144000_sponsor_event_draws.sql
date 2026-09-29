-- Sponsor rewards are separate from collectible badges. No event starts active.
create table if not exists public.ng_sponsor_events (
  id uuid primary key default gen_random_uuid(),
  planet text not null check (planet in ('hot','sweet','chewy')),
  sponsor text not null check (length(trim(sponsor)) between 1 and 100),
  title text not null check (length(trim(title)) between 1 and 150),
  prize_type text not null check (prize_type in ('discount','ticket','voucher')),
  prize_label text not null check (length(trim(prize_label)) between 1 and 150),
  eligibility text not null default 'verified_activity' check (eligibility in ('login','verified_activity')),
  win_rate integer not null default 10000 check (win_rate between 0 and 10000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.ng_sponsor_prizes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ng_sponsor_events(id) on delete restrict,
  code text not null check (length(trim(code)) between 1 and 200),
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  unique (event_id, code),
  check ((claimed_by is null) = (claimed_at is null))
);
create index if not exists ng_sponsor_prizes_stock on public.ng_sponsor_prizes(event_id) where claimed_by is null;

create table if not exists public.ng_sponsor_draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ng_sponsor_events(id) on delete restrict,
  user_id uuid not null references auth.users(id),
  local_day date not null,
  prize_id uuid unique references public.ng_sponsor_prizes(id),
  created_at timestamptz not null default now(),
  unique (event_id, user_id, local_day)
);

alter table public.ng_sponsor_events enable row level security;
alter table public.ng_sponsor_prizes enable row level security;
alter table public.ng_sponsor_draws enable row level security;
revoke all on public.ng_sponsor_events, public.ng_sponsor_prizes, public.ng_sponsor_draws from anon, authenticated;
grant select on public.ng_sponsor_events to anon, authenticated;
grant insert, update on public.ng_sponsor_events to authenticated;
grant select, insert on public.ng_sponsor_prizes to authenticated;
grant select on public.ng_sponsor_draws to authenticated;

create policy sponsor_events_public on public.ng_sponsor_events for select to anon, authenticated
  using ((status = 'active' and starts_at <= now() and ends_at > now()) or public.is_admin());
create policy sponsor_events_admin_insert on public.ng_sponsor_events for insert to authenticated
  with check (public.is_admin());
create policy sponsor_events_admin_update on public.ng_sponsor_events for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy sponsor_prizes_admin_read on public.ng_sponsor_prizes for select to authenticated
  using (public.is_admin());
create policy sponsor_prizes_admin_insert on public.ng_sponsor_prizes for insert to authenticated
  with check (public.is_admin() and exists (select 1 from public.ng_sponsor_events e where e.id = event_id and e.status <> 'active'));
create policy sponsor_draws_owner_or_admin on public.ng_sponsor_draws for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Explicit checks, a locked event row, and a unique daily key make a draw atomic.
create or replace function public.ng_sponsor_draw(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_event public.ng_sponsor_events%rowtype;
  v_prize public.ng_sponsor_prizes%rowtype;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_won boolean := false;
begin
  if v_user is null or exists (select 1 from auth.users where id = v_user and is_anonymous) then
    raise exception 'LOGIN_REQUIRED';
  end if;
  select * into v_event from public.ng_sponsor_events where id = p_event_id for update;
  if not found or v_event.status <> 'active' or now() < v_event.starts_at or now() >= v_event.ends_at then
    raise exception 'EVENT_CLOSED';
  end if;
  if exists (select 1 from public.ng_sponsor_draws where event_id = p_event_id and user_id = v_user and local_day = v_day) then
    raise exception 'ALREADY_DRAWN';
  end if;
  if v_event.eligibility = 'verified_activity' and not (
    exists (select 1 from public.ng_planet_visits where user_id = v_user and planet = v_event.planet and status = 'verified' and created_at >= v_event.starts_at)
    or exists (select 1 from public.ng_planet_status_reports where user_id = v_user and planet = v_event.planet and status = 'accepted' and created_at >= v_event.starts_at)
    or exists (select 1 from public.ng_planet_events where user_id = v_user and planet = v_event.planet and kind = 'report' and status = 'published' and occurred_at >= v_event.starts_at)
  ) then
    raise exception 'ACTIVITY_REQUIRED';
  end if;
  if floor(random() * 10000)::integer < v_event.win_rate then
    select * into v_prize from public.ng_sponsor_prizes where event_id = p_event_id and claimed_by is null order by id limit 1 for update skip locked;
    if found then
      update public.ng_sponsor_prizes set claimed_by = v_user, claimed_at = now() where id = v_prize.id;
      v_won := true;
    end if;
  end if;
  insert into public.ng_sponsor_draws(event_id,user_id,local_day,prize_id)
  values (p_event_id,v_user,v_day,case when v_won then v_prize.id else null end);
  return jsonb_build_object('won',v_won,'prize',case when v_won then v_event.prize_label else null end,'code',case when v_won then v_prize.code else null end);
end;
$$;
revoke all on function public.ng_sponsor_draw(uuid) from public, anon;
grant execute on function public.ng_sponsor_draw(uuid) to authenticated;

create or replace function public.ng_sponsor_my_draws()
returns table(event_id uuid, local_day date, prize_label text, code text)
language sql security definer set search_path = '' as $$
  select d.event_id,d.local_day,
         case when d.prize_id is not null then e.prize_label else null end,
         p.code
  from public.ng_sponsor_draws d
  join public.ng_sponsor_events e on e.id = d.event_id
  left join public.ng_sponsor_prizes p on p.id = d.prize_id and p.claimed_by = auth.uid()
  where d.user_id = auth.uid()
  order by d.local_day desc limit 100;
$$;
revoke all on function public.ng_sponsor_my_draws() from public, anon;
grant execute on function public.ng_sponsor_my_draws() to authenticated;
