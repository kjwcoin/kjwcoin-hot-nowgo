alter table public.hot_taste_observations
  drop constraint if exists hot_taste_observations_heat_check,
  add constraint hot_taste_observations_heat_check check (heat between 1 and 7);

alter table hot_source_community.taste_reports
  drop constraint if exists taste_reports_heat_check,
  add constraint taste_reports_heat_check check (heat between 1 and 7);

create or replace function hot_source_community.submit(
  p_store uuid,
  p_action text,
  p_menu text default ''::text,
  p_heat integer default null::integer,
  p_flavor text default ''::text,
  p_note text default ''::text,
  p_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_menu text;
  v_key text;
  v_awarded integer := 0;
  v_inserted integer;
begin
  if v_user is null or not exists(
    select 1 from auth.users
    where id = v_user and coalesce(is_anonymous, false) = false
  ) then
    raise exception 'login_required';
  end if;

  if not exists(select 1 from hot_source_community.stores where id = p_store) then
    raise exception 'source_store_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 731));

  if p_action = 'owner-request' then
    if not exists(
      select 1 from hot_source_community.owner_requests
      where store_id = p_store and user_id = v_user
    ) and (
      select count(*) from hot_source_community.owner_requests
      where user_id = v_user and created_at > now() - interval '24 hours'
    ) >= 100 then
      raise exception 'request_rate_limited';
    end if;

    insert into hot_source_community.owner_requests(store_id, user_id)
    values(p_store, v_user)
    on conflict do nothing;
  elsif p_action = 'taste' then
    v_menu := regexp_replace(btrim(p_menu), '\s+', ' ', 'g');
    v_key := lower(v_menu);

    if v_menu is null
      or char_length(v_menu) not between 1 and 100
      or p_heat is null
      or p_heat not between 1 and 7
      or p_flavor is null
      or p_flavor not in ('얼큰한', '칼칼한', '달콤매콤한', '알싸한')
      or p_note is null
      or char_length(p_note) > 500
      or p_consent is distinct from true
    then
      raise exception 'invalid_taste_report';
    end if;

    if (
      select count(*) from hot_source_community.taste_reports
      where user_id = v_user and updated_at > now() - interval '24 hours'
    ) >= 100 then
      raise exception 'request_rate_limited';
    end if;

    insert into hot_source_community.taste_reports(
      store_id, user_id, menu_key, menu_name, heat, flavor, note
    ) values(
      p_store, v_user, v_key, v_menu, p_heat, p_flavor, btrim(p_note)
    )
    on conflict(store_id, user_id, menu_key) do update
      set heat = excluded.heat,
          flavor = excluded.flavor,
          note = excluded.note,
          updated_at = now();

    v_awarded := hot_source_community.reward(
      v_user,
      'report',
      'source-taste:' || p_store::text || ':' || md5(v_key),
      v_menu || ' 맛 제보'
    );
  else
    raise exception 'invalid_source_action';
  end if;

  return hot_source_community.state(p_store)
    || jsonb_build_object('awardedExp', v_awarded);
end
$function$;
