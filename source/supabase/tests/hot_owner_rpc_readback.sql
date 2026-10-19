-- Development-only integration check for the HOT owner/visitor authorization rollout.
-- Prerequisite: apply 20261019001000_hot_owner_rpc_access.sql to an isolated
-- development database. This script creates synthetic fixtures and rolls back
-- every row; never run it against production.

begin;

do $hot_test$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  shop uuid := gen_random_uuid();
  verification uuid := gen_random_uuid();
  menu_id uuid;
  dashboard jsonb;
  saved jsonb;
  audit_rows integer;
  photo_path text;
begin
  insert into auth.users(id,aud,role,is_anonymous)
  values
    (owner_a,'authenticated','authenticated',false),
    (owner_b,'authenticated','authenticated',false);

  insert into public.owners(id,status,created_at)
  values
    (owner_a,'active',now()),
    (owner_b,'active',now());

  insert into public.stores(id,owner_id,name,category,address,slug,publication_state)
  values(
    shop,owner_a,'HOT RPC rollback fixture','food','서울 테스트 주소',
    'hot-rpc-'||shop::text,'NOINDEX'
  );

  insert into public.ng_business_verifications(
    id,user_id,business_number_hash,status,checked_at
  ) values(
    verification,owner_a,'hot-rpc-'||verification::text,'verified',now()
  );

  insert into public.ng_store_claims(
    user_id,store_id,business_verification_id,status,reviewed_at
  ) values(owner_a,shop,verification,'approved',now());

  perform set_config('request.jwt.claim.sub',owner_a::text,true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',owner_a,'role','authenticated')::text,
    true
  );

  if public.ng_map_can_publish(shop,'hot') then
    raise exception 'owner published before a verified subscription';
  end if;

  begin
    perform public.ng_map_save_menu(
      shop,'hot',null::uuid,'구독 전 차단',12000,7::smallint,
      '얼큰한','테스트',owner_a::text||'/'||shop::text||'/hot/'||gen_random_uuid()::text||'.webp'
    );
    raise exception 'unsubscribed owner write accepted';
  exception when insufficient_privilege then null;
  end;

  insert into public.ng_map_subscription_access(
    owner_id,subscription_id,product_code,price_code,amount_krw,status,paid_until,verified_at
  ) values(
    owner_a,(random()*1000000000000)::bigint,
    'NOWGO_HOT_MONTHLY','KRW_8000_MONTHLY_V1',8000,'ACTIVE',
    now()+interval '1 month',now()
  );

  if not public.ng_map_can_publish(shop,'hot') then
    raise exception 'verified owner subscription was not authorized';
  end if;

  photo_path := owner_a::text||'/'||shop::text||'/hot/'||gen_random_uuid()::text||'.webp';
  menu_id := public.ng_map_save_menu(
    shop,'hot',null::uuid,'극강 메뉴',18000,7::smallint,
    '얼큰한','매운요리',photo_path
  );

  dashboard := public.ng_map_dashboard_access('hot',shop,null);
  if dashboard->'access'->>'enabled' is distinct from 'true'
    or not (
      dashboard->'state'->'menus' @>
      jsonb_build_array(jsonb_build_object(
        'id',menu_id,'name','극강 메뉴','level',7,'flavor','얼큰한','soldout',false
      ))
    )
  then
    raise exception 'menu create readback failed';
  end if;

  begin
    perform public.ng_map_set_menu_taste(
      shop,'hot',menu_id,8::smallint,'얼큰한','매운요리'
    );
    raise exception 'retired HOT stage 8 accepted';
  exception when sqlstate '22023' then null;
  end;

  perform public.ng_map_set_menu_taste(
    shop,'hot',menu_id,6::smallint,'칼칼한','국물'
  );
  perform public.ng_map_set_menu_soldout(shop,'hot',menu_id,true);

  dashboard := public.ng_map_dashboard_access('hot',shop,null);
  if not (
    dashboard->'state'->'menus' @>
    jsonb_build_array(jsonb_build_object(
      'id',menu_id,'level',6,'flavor','칼칼한','category','국물','soldout',true
    ))
  )
  then
    raise exception 'taste/flavor/soldout readback failed';
  end if;

  perform public.ng_map_set_status(shop,'hot','open');
  update public.owner_overrides
    set set_at=now()-interval '1 second',
        expires_at=least(expires_at,now()+interval '24 hours'-interval '1 second')
    where store_id=shop and active;

  dashboard := public.ng_map_dashboard_access('hot',shop,null);
  if dashboard->'state'->'status'->>'value' is distinct from 'open' then
    raise exception 'owner status readback failed';
  end if;

  select count(*) into audit_rows
  from public.ng_map_owner_audit_log
  where actor_id=owner_a and store_id=shop;
  if audit_rows < 4 then
    raise exception 'owner audit trail incomplete: % rows',audit_rows;
  end if;

  update public.ng_map_subscription_access
    set verified_at=now()-interval '24 hours'-interval '1 second'
    where owner_id=owner_a;
  if public.ng_map_can_publish(shop,'hot') then
    raise exception 'stale subscription verification accepted';
  end if;
  begin
    perform public.ng_map_set_menu_soldout(shop,'hot',menu_id,false);
    raise exception 'stale subscription write accepted';
  exception when insufficient_privilege then null;
  end;
  update public.ng_map_subscription_access
    set verified_at=now(),paid_until=now()+interval '1 month'
    where owner_id=owner_a;

  perform set_config('request.jwt.claim.sub',owner_b::text,true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',owner_b,'role','authenticated')::text,
    true
  );
  if public.ng_map_can_publish(shop,'hot') then
    raise exception 'foreign owner authorized for store';
  end if;
  begin
    perform public.ng_map_save_menu(
      shop,'hot',null::uuid,'타인 매장 차단',12000,1::smallint,
      '알싸한','테스트',owner_b::text||'/'||shop::text||'/hot/'||gen_random_uuid()::text||'.webp'
    );
    raise exception 'foreign owner write accepted';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub',owner_a::text,true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',owner_a,'role','authenticated')::text,
    true
  );
  saved := public.hot_menu_spice_upsert(menu_id,7::smallint);
  if saved->>'saved' is distinct from 'true'
    or saved->>'level' is distinct from '7'
    or not exists(
      select 1 from public.hot_menu_spice_ratings r
      where r.menu_id=menu_id and r.user_id=owner_a and r.level=7
    )
  then
    raise exception 'visitor rating save/readback failed';
  end if;

  perform set_config('request.jwt.claim.sub',owner_b::text,true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',owner_b,'role','authenticated')::text,
    true
  );
  perform public.hot_menu_spice_upsert(menu_id,2::smallint);
  if not exists(
      select 1 from public.hot_menu_spice_ratings r
      where r.menu_id=menu_id and r.user_id=owner_a and r.level=7
    )
    or not exists(
      select 1 from public.hot_menu_spice_ratings r
      where r.menu_id=menu_id and r.user_id=owner_b and r.level=2
    )
  then
    raise exception 'visitor rating ownership isolation failed';
  end if;

  begin
    perform public.hot_menu_spice_upsert(menu_id,8::smallint);
    raise exception 'visitor stage 8 accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.hot_menu_spice_upsert(gen_random_uuid(),1::smallint);
    raise exception 'rating accepted for a non-catalog menu';
  exception when no_data_found then null;
  end;

  if has_table_privilege('authenticated','public.hot_unverified_spicy_menu_candidates','select') then
    raise exception 'authenticated candidate read privilege remains';
  end if;
  if has_table_privilege('anon','public.hot_unverified_spicy_menu_candidates','select') then
    raise exception 'anonymous candidate read privilege remains';
  end if;
  if has_table_privilege('authenticated','public.hot_menu_spice_ratings','insert')
    or has_table_privilege('authenticated','public.hot_menu_spice_ratings','update')
    or has_table_privilege('authenticated','public.hot_menu_spice_ratings','delete')
  then
    raise exception 'visitor direct rating writes remain enabled';
  end if;

  raise notice 'HOT owner/user authorization, stage 1..7, ownership, subscription, save/readback and isolation checks passed';
end
$hot_test$;

rollback;
