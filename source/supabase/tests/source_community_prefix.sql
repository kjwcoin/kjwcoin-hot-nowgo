begin;
-- DEV lacks the production planet schema. These exact-signature test doubles
-- and all fixtures exist only inside this transaction and are rolled back.
create schema if not exists planet_private;
create table public.ng_planet_events(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,planet text not null,kind text not null,source_key text not null,title text not null,status text not null default 'recorded',xp integer not null default 0 check(xp between 0 and 100),store_id uuid,occurred_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,planet,kind,source_key));
revoke all on public.ng_planet_events from public,anon,authenticated;
create function planet_private.ensure_profile(uuid,text) returns void language sql as $$select$$;
create function planet_private.evaluate(uuid,text) returns void language sql as $$select$$;
create function planet_private.quest(p_user uuid,p_planet text,p_kind text) returns void language plpgsql security definer set search_path='' as $$begin perform planet_private.emit(p_user,p_planet,'quest_'||p_kind,(now() at time zone 'Asia/Seoul')::date::text,'오늘의 퀘스트','completed',10);end$$;
