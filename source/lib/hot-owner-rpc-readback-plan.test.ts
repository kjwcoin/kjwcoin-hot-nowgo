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
  assert.match(sql,/owner_b,[\\s\\S]*'NOWGO_HOT_MONTHLY','KRW_8000_MONTHLY_V1',8000,'ACTIVE'/i);
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
  assert.match(sql,/hot_menu_spice_upsert\(menu_id,7::smallint\)/i);
  assert.match(sql,/hot_menu_spice_upsert\(menu_id,2::smallint\)/i);
  assert.match(sql,/visitor rating ownership isolation failed/i);
  assert.match(sql,/rating accepted for a non-catalog menu/i);
});

test('candidate reads and direct visitor table writes remain denied',()=>{
  assert.match(sql,/hot_unverified_spicy_menu_candidates','select'/i);
  assert.match(sql,/hot_menu_spice_ratings','insert'/i);
  assert.match(sql,/hot_menu_spice_ratings','update'/i);
  assert.match(sql,/hot_menu_spice_ratings','delete'/i);
});
