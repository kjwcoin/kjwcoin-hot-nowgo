-- Public, persisted taste-map chat. Existing unified login supplies auth.uid().
create table public.ng_map_chat_messages (
  id uuid primary key default gen_random_uuid(),
  variant text not null check (variant in ('hot', 'rich', 'sweet')),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index ng_map_chat_room_history on public.ng_map_chat_messages(variant, created_at desc, id desc);
create index ng_map_chat_user_recent on public.ng_map_chat_messages(user_id, created_at desc);
alter table public.ng_map_chat_messages enable row level security;

create policy map_chat_read on public.ng_map_chat_messages for select to anon, authenticated
  using (created_at > now() - interval '30 days');
create policy map_chat_write_own on public.ng_map_chat_messages for insert to authenticated
  with check ((select auth.uid()) = user_id and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');
revoke all on public.ng_map_chat_messages from anon, authenticated;
grant select on public.ng_map_chat_messages to anon, authenticated;
grant insert(id, variant, user_id, content) on public.ng_map_chat_messages to authenticated;
grant all on public.ng_map_chat_messages to service_role;

-- Invoker trigger retains RLS. Neither identity nor timestamps are client-editable.
create function public.ng_guard_map_chat_message() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() <> new.user_id then
    raise exception 'Chat requires the signed-in author' using errcode = '42501';
  end if;
  new.created_at := clock_timestamp();
  new.content := btrim(new.content);
  new.display_name := '탐험가-' || upper(substr(md5(new.user_id::text), 1, 8));
  perform pg_advisory_xact_lock(hashtextextended('map-chat:' || new.user_id::text, 0));
  -- A lost-response retry reaches the primary key constraint, not the rate limit.
  if exists (select 1 from public.ng_map_chat_messages where id = new.id and user_id = new.user_id) then
    return new;
  end if;
  if exists (select 1 from public.ng_map_chat_messages
    where user_id = new.user_id and created_at > new.created_at - interval '3 seconds') then
    raise exception 'Please wait 3 seconds between messages' using errcode = 'P0001';
  end if;
  if (select count(*) from public.ng_map_chat_messages
    where user_id = new.user_id and created_at > new.created_at - interval '1 minute') >= 20 then
    raise exception 'Chat rate limit exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.ng_guard_map_chat_message() from public, anon, authenticated;
create trigger guard_map_chat_message before insert on public.ng_map_chat_messages
  for each row execute function public.ng_guard_map_chat_message();

create table public.ng_map_chat_reports (
  message_id uuid not null references public.ng_map_chat_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason = '부적절한 내용'),
  created_at timestamptz not null default now(),
  primary key(message_id, reporter_id)
);
create index ng_map_chat_reports_reporter on public.ng_map_chat_reports(reporter_id);
alter table public.ng_map_chat_reports enable row level security;
create policy map_chat_report_own on public.ng_map_chat_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');
revoke all on public.ng_map_chat_reports from anon, authenticated;
grant insert(message_id, reporter_id, reason) on public.ng_map_chat_reports to authenticated;
grant all on public.ng_map_chat_reports to service_role;

do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ng_map_chat_messages') then
    alter publication supabase_realtime add table public.ng_map_chat_messages;
  end if;
end $$;
