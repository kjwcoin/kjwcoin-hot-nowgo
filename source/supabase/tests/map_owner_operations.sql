begin;
do $$
declare owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); shop uuid:=gen_random_uuid();
  snapshot jsonb; command jsonb; retry jsonb; observed jsonb; state text;
begin
 insert into auth.users(id,aud,role,is_anonymous) values(owner_a,'authenticated','authenticated',false),(owner_b,'authenticated','authenticated',false);
 insert into public.owners(id,status,created_at) values(owner_a,'active',now()),(owner_b,'active',now()-interval '1 year') on conflict(id) do update set status='active',created_at=excluded.created_at;
 insert into public.stores(id,owner_id,name,category,address,slug,publication_state)
 values(shop,owner_a,'Operations regression fixture','food','인천 서구 테스트','operations-'||shop::text,'NOINDEX');
 perform set_config('request.jwt.claim.sub',owner_a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
 begin
   perform public.ng_map_set_owner_status(shop,'open_status','open',true,'manual',gen_random_uuid());
   raise exception 'new owner received an unauthorized map trial';
 exception when insufficient_privilege then null; end;
 insert into public.ng_map_subscription_access(owner_id,subscription_id,product_code,price_code,amount_krw,status,paid_until)
 values(owner_a,(random()*1000000000000)::bigint,'product_imaqLBf8q','price_NZ6mkW2nM',1900,'ACTIVE',now()+interval '1 month');
 snapshot:=public.ng_map_owner_snapshot();
 if snapshot->>'isOwner' is distinct from 'true' or not (snapshot->'stores'@>jsonb_build_array(jsonb_build_object('id',shop,'canPublish',true))) then raise exception 'owner snapshot failed'; end if;
 foreach state in array array['open','closed_for_day','ingredients_soldout','temporary_closed','break_time','permanently_closed'] loop
   command:=public.ng_map_set_owner_status(shop,'open_status',state,true,'business_day',gen_random_uuid());
   if command->'override'->>'value' is distinct from state then raise exception 'canonical write failed %',state; end if;
   -- A single rollback transaction keeps now() fixed, while the canonical
   -- command uses clock_timestamp(). Advance the test signal behind now()
   -- to simulate the subsequent HTTP read transaction without sleeping.
   update public.owner_overrides set set_at=now()-interval '1 second',expires_at=least(expires_at,now()+interval '24 hours'-interval '1 second') where store_id=shop and active;
   observed:=public.ng_map_public_owner_status(shop);
   if observed->>'status' is distinct from state then raise exception 'map did not read canonical status %',state; end if;
   if (observed->>'expires_at')::timestamptz>now()+interval '24 hours' then raise exception 'status exceeds freshness window'; end if;
 end loop;
 declare request_id uuid:=gen_random_uuid(); begin
   command:=public.ng_map_set_owner_status(shop,'open_status','open',true,'business_day',request_id);
   retry:=public.ng_map_set_owner_status(shop,'open_status','open',true,'business_day',request_id);
   if command->>'eventId' is null or command->>'eventId' is distinct from retry->>'eventId' or retry->>'replayed' is distinct from 'true' then raise exception 'idempotency failed'; end if;
 end;
 command:=public.ng_map_set_owner_status(shop,'congestion','full',true,'business_day',gen_random_uuid());
 update public.owner_overrides set set_at=now()-interval '1 second',expires_at=least(expires_at,now()+interval '24 hours'-interval '1 second') where store_id=shop and active;
 if public.ng_map_public_owner_status(shop)->>'crowding' is distinct from 'full' then raise exception 'crowding failed'; end if;
 begin
   perform public.ng_map_set_owner_status(shop,'open_status','invented',true,'manual',gen_random_uuid());
   raise exception 'invalid state accepted';
 exception when sqlstate '22023' then null; end;
 perform set_config('request.jwt.claim.sub',owner_b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated')::text,true);
 begin
   perform public.ng_map_set_owner_status(shop,'open_status','open',true,'manual',gen_random_uuid());
   raise exception 'other owner accepted';
 exception when insufficient_privilege then null; end;
 if public.ng_map_owner_snapshot()->'stores'@>jsonb_build_array(jsonb_build_object('id',shop)) then raise exception 'private store disclosed'; end if;
 perform set_config('request.jwt.claim.sub',owner_a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
 delete from public.ng_map_subscription_access where owner_id=owner_a;
 begin
   perform public.ng_map_set_owner_status(shop,'open_status','open',true,'manual',gen_random_uuid());
   raise exception 'unsubscribed owner accepted';
 exception when insufficient_privilege then null; end;
 insert into public.ng_map_subscription_access(owner_id,subscription_id,product_code,price_code,amount_krw,status,paid_until)
 values(owner_a,(random()*1000000000000)::bigint,'product_imaqLBf8q','price_NZ6mkW2nM',1900,'ACTIVE',now()+interval '1 month');
 command:=public.ng_map_set_owner_status(shop,'open_status','open',true,'manual',gen_random_uuid());
 update public.owner_overrides set set_at=now()-interval '2 hours',expires_at=now()-interval '1 second' where store_id=shop;
 if public.ng_map_public_owner_status(shop) is not null then raise exception 'expired status public'; end if;
 command:=public.ng_map_set_owner_status(shop,'open_status','open',true,'manual',gen_random_uuid());
 update public.stores set owner_penalty_points=30,trust_disabled_at=now() where id=shop;
 if public.ng_map_public_owner_status(shop) is not null then raise exception 'suspended store public'; end if;
 begin
   perform public.ng_map_set_owner_status(shop,'open_status','open',true,'manual',gen_random_uuid());
   raise exception 'suspended owner accepted';
 exception when insufficient_privilege then null; end;
 if has_function_privilege('anon','public.ng_map_owner_snapshot()','execute') or
   has_function_privilege('anon','public.ng_map_set_owner_status(uuid,text,text,boolean,text,uuid)','execute') then raise exception 'anonymous owner RPC access'; end if;
 if has_table_privilege('authenticated','public.ng_map_subscription_access','insert') then raise exception 'client may grant own subscription'; end if;
 raise notice 'owner operations, all states, shared map, crowding, idempotency, ownership, expiry, payment gate and suspension checks passed';
end $$;
rollback;
