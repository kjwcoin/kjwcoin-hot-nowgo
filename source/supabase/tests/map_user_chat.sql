-- Transactional fixtures: no test accounts or messages remain after verification.
begin;
select set_config('chat.test_user', gen_random_uuid()::text, true);
select set_config('chat.test_other', gen_random_uuid()::text, true);
select set_config('chat.test_message', gen_random_uuid()::text, true);
insert into auth.users(id) values
  (current_setting('chat.test_user')::uuid), (current_setting('chat.test_other')::uuid);

set local role anon;
do $$ begin
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content)
      values ('hot', current_setting('chat.test_user')::uuid, 'guest');
    raise exception 'Guest unexpectedly wrote a message';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('chat.test_user'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
do $$ begin
  insert into public.ng_map_chat_messages(id, variant, user_id, content)
    values (current_setting('chat.test_message')::uuid, 'hot', current_setting('chat.test_user')::uuid, '  test message  ');
  if not exists (select 1 from public.ng_map_chat_messages
    where id = current_setting('chat.test_message')::uuid and content = 'test message'
      and display_name = '탐험가-' || upper(substr(md5(current_setting('chat.test_user')), 1, 8))) then
    raise exception 'Server-generated nickname or content normalization failed';
  end if;
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content)
      values ('rich', current_setting('chat.test_other')::uuid, 'forged author');
    raise exception 'Forged author unexpectedly accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content)
      values ('sweet', current_setting('chat.test_user')::uuid, 'too soon');
    raise exception 'Cross-room rate limit unexpectedly bypassed';
  exception when raise_exception then
    if sqlerrm <> 'Please wait 3 seconds between messages' then raise; end if;
  end;
  begin
    insert into public.ng_map_chat_messages(id, variant, user_id, content)
      values (current_setting('chat.test_message')::uuid, 'hot', current_setting('chat.test_user')::uuid, 'test message');
    raise exception 'Duplicate ID unexpectedly accepted';
  exception when unique_violation then null; end;
  begin
    update public.ng_map_chat_messages set content = 'edited' where id = current_setting('chat.test_message')::uuid;
    raise exception 'User unexpectedly edited a message';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content, display_name)
      values ('hot', current_setting('chat.test_user')::uuid, 'test', 'forged nickname');
    raise exception 'User unexpectedly supplied a nickname';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('chat.test_other'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
do $$ begin
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content)
      values ('rich', current_setting('chat.test_other')::uuid, '  ');
    raise exception 'Blank message unexpectedly accepted';
  exception when check_violation then null; end;
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content)
      values ('rich', current_setting('chat.test_other')::uuid, repeat('a',501));
    raise exception 'Oversized message unexpectedly accepted';
  exception when check_violation then null; end;
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content)
      values ('unknown', current_setting('chat.test_other')::uuid, 'test');
    raise exception 'Unknown room unexpectedly accepted';
  exception when check_violation then null; end;
  insert into public.ng_map_chat_reports(message_id, reporter_id, reason)
    values (current_setting('chat.test_message')::uuid, current_setting('chat.test_other')::uuid, '부적절한 내용');
  begin
    insert into public.ng_map_chat_reports(message_id, reporter_id, reason)
      values (current_setting('chat.test_message')::uuid, current_setting('chat.test_user')::uuid, '부적절한 내용');
    raise exception 'Forged reporter unexpectedly accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.ng_map_chat_reports;
    raise exception 'User unexpectedly read private reports';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('chat.test_other'), 'role', 'authenticated', 'is_anonymous', true)::text, true);
set local role authenticated;
do $$ begin
  begin
    insert into public.ng_map_chat_messages(variant, user_id, content)
      values ('rich', current_setting('chat.test_other')::uuid, 'anonymous login');
    raise exception 'Anonymous login unexpectedly wrote';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  if (select count(*) from public.ng_map_chat_messages where id = current_setting('chat.test_message')::uuid and variant = 'hot') <> 1 then
    raise exception 'Public room read failed';
  end if;
  if exists (select 1 from public.ng_map_chat_messages where id = current_setting('chat.test_message')::uuid and variant = 'sweet') then
    raise exception 'Brand filter failed';
  end if;
end $$;
reset role;
rollback;
select 'map_chat_security_tests_passed' as result;
