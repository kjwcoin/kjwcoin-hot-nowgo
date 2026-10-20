import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const sql=readFileSync(
  new URL('../supabase/tests/hot_owner_rpc_readback.sql',import.meta.url),
  'utf8'
);

test('integration plan is development-only and always rolls fixtures back',()=>{
  assert.match(sql,/development-only integration check/i);
  assert.match(sql,/never run it against production/i);
  assert.match(sql,/^begin;/m);
  assert.match(sql,/^rollback;/m);
});

test('owner path verifies identity, claim, KRW 8,000 entitlement and stale denial',()=>{
  assert.match(sql,/ng_business_verifications[\s\S]*'verified'/i);
  assert.match(sql,/ng_store_claims[\s\S]*'approved'/i);
  assert.match(sql,/'NOWGO_HOT_MONTHLY','KRW_8000_MONTHLY_V1',8000,'ACTIVE'/);
  assert.match(sql,/verified_at=now\(\)-interval '24 hours'-interval '1 second'/i);
  assert.match(sql,/stale subscription write accepted/i);
  assert.match(sql,/owner_b,[\s\S]*'NOWGO_HOT_MONTHLY','KRW_8000_MONTHLY_V1',8000,'ACTIVE'/i);
  assert.match(sql,/subscribed foreign owner authorized for store/i);
  assert.match(sql,/subscribed foreign owner write accepted/i);
});

test('owner mutations are followed by dashboard readback and audit verification',()=>{
  for(const rpc of [
    'ng_map_save_menu',
    'ng_map_set_menu_taste',
    'ng_map_set_menu_soldout',
    'ng_map_set_status',
    'ng_map_dashboard_access'
  ]) assert.match(sql,new RegExp('public\\.'+rpc,'i'));
  assert.match(sql,/menu create readback failed/i);
  assert.match(sql,/taste\/flavor\/soldout readback failed/i);
  assert.match(sql,/owner status readback failed/i);
  assert.match(sql,/ng_map_owner_audit_log/i);
});

test('owner and visitor HOT inputs remain 1..7 with separate flavor and rating ownership',()=>{
  assert.match(sql,/retired HOT stage 8 accepted/i);
  assert.match(sql,/visitor stage 8 accepted/i);
  assert.match(sql,/'level',7,'flavor','얼큰한'/);
  assert.match(sql,/'level',6,'flavor','칼칼한'/);
  assert.match(sql,/hot_menu_spice_upsert\(v_menu_id,7::smallint\)/i);
  assert.match(sql,/hot_menu_spice_upsert\(v_menu_id,2::smallint\)/i);
  assert.match(sql,/visitor rating ownership isolation failed/i);
  assert.match(sql,/rating accepted for a non-catalog menu/i);
});

test('candidate reads and direct visitor table writes remain denied',()=>{
  assert.match(sql,/hot_unverified_spicy_menu_candidates','select'/i);
  assert.match(sql,/hot_menu_spice_ratings','insert'/i);
  assert.match(sql,/hot_menu_spice_ratings','update'/i);
  assert.match(sql,/hot_menu_spice_ratings','delete'/i);
});

test('RPC checks run as authenticated, with explicit JWT actor assertions',()=>{
  const statements=sql.replace(/--[^\n]*/g,'').split(';');
  let role='privileged';
  let rpcChecks=0;
  let anonymousDenials=0;
  for(const statement of statements){
    if(/set local role authenticated/i.test(statement)) role='authenticated';
    if(/set local role anon/i.test(statement)) role='anon';
    if(/reset role/i.test(statement)) role='privileged';
    if(/public\.(?:ng_map_(?:can_publish|save_menu|set_menu_taste|set_menu_soldout|set_status|dashboard_access)|hot_menu_spice_upsert)\s*\(/i.test(statement)){
      if(role==='authenticated') rpcChecks++;
      else if(role==='anon' && /hot_menu_spice_upsert/i.test(statement)) anonymousDenials++;
      else assert.fail('RPC executed in privileged fixture context: '+statement);
    }
  }
  assert.ok(rpcChecks>=15);
  assert.equal(anonymousDenials,1);
  for(const actor of ['owner_a','owner_b']){
    assert.ok(sql.includes("current_user <> 'authenticated' or auth.uid() is distinct from "+actor));
    assert.ok(sql.includes("set_config('request.jwt.claim.sub',"+actor+"::text,true)"));
    assert.ok(sql.includes("jsonb_build_object('sub',"+actor+",'role','authenticated')"));
  }
  assert.doesNotMatch(sql,/security definer|grant\s+(?:all|update)|disable row level security/i);
});

test('both authenticated users see exactly their own row and cannot directly update the other',()=>{
  for(const [actor,other,level] of [['owner_b','owner_a',2],['owner_a','owner_b',7]]){
    const marker="raise exception '"+actor+" RLS own-row read or foreign-row denial failed'";
    const end=sql.indexOf(marker);
    assert.ok(end>0);
    const start=sql.lastIndexOf('set local role authenticated;',end);
    const context=sql.slice(start,end);
    assert.doesNotMatch(context,/reset role/i);
    assert.ok(context.includes('auth.uid() is distinct from '+actor));
    assert.match(context,/select count\(\*\) from public\.hot_menu_spice_ratings r where r\.menu_id=v_menu_id\) <> 1/);
    assert.ok(context.includes('r.user_id='+actor+' and r.level='+level));
    assert.ok(context.includes('or exists('));
    assert.ok(context.includes('r.user_id='+other+'\n'));
    const denial=sql.slice(end,sql.indexOf('exception when insufficient_privilege then null;',end));
    assert.match(denial,/update public\.hot_menu_spice_ratings r set level=1/);
    assert.ok(denial.includes('r.user_id='+other+';'));
    assert.match(denial,/raise exception '[^']*foreign direct rating update accepted'/);
    assert.doesNotMatch(denial,/reset role/i);
  }
});

test('own RPC edit preserves the other rating and privileged inspection verifies both fixtures',()=>{
  assert.match(sql,/saved := public\.hot_menu_spice_upsert\(v_menu_id,3::smallint\)/);
  assert.match(sql,/own rating RPC update\/readback failed/);
  const final=sql.slice(sql.lastIndexOf('reset role;'));
  assert.match(final,/r\.menu_id=v_menu_id\) <> 2/);
  assert.match(final,/r\.user_id=owner_a and r\.level=7/);
  assert.match(final,/r\.user_id=owner_b and r\.level=3/);
  assert.match(final,/visitor rating ownership isolation failed/);
  assert.match(final,/rollback;/);
  assert.doesNotMatch(sql,/r\.menu_id=menu_id/);
});

test('paid foreign owner is denied dashboard and every owner mutation before own-user rating',()=>{
  const start=sql.indexOf("raise exception 'subscribed foreign owner authorized for store'");
  const end=sql.indexOf("perform set_config('request.jwt.claim.sub',owner_a::text,true)",start);
  assert.ok(start>0 && end>start);
  const foreign=sql.slice(start,end);
  assert.match(foreign,/ng_map_dashboard_access\('hot',shop,null\)/);
  assert.match(foreign,/ng_map_set_status\(shop,'hot','open'\)/);
  assert.match(foreign,/ng_map_set_menu_taste\(/);
  assert.match(foreign,/ng_map_set_menu_soldout\(/);
  assert.match(foreign,/ng_map_save_menu\(/);
  assert.equal((foreign.match(/exception when insufficient_privilege then null;/g)||[]).length,5);
  assert.doesNotMatch(foreign,/reset role/);
});

test('fresh but expired HOT subscription and anonymous RPC grants are explicitly denied',()=>{
  assert.match(sql,/raise exception 'expired subscription authorized'/);
  assert.match(sql,/paid_until=now\(\)-interval '1 second'/);
  assert.match(sql,/has_function_privilege\('anon','public\.hot_menu_spice_upsert\(uuid,smallint\)','execute'\)/);
  assert.match(sql,/has_function_privilege\('anon','public\.ng_map_can_publish\(uuid,text\)','execute'\)/);
  assert.match(sql,/has_function_privilege\('anon','public\.ng_map_save_menu\(uuid,text,uuid,text,integer,smallint,text,text,text\)','execute'\)/);
  assert.match(sql,/set local role anon/i);
  assert.match(sql,/raise exception 'anonymous visitor rating RPC accepted'/i);
  assert.match(sql,/raise exception 'anonymous visitor rating read accepted'/i);
  assert.match(sql,/current_user <> 'anon' or auth\.uid\(\) is not null/i);
});

