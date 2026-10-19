import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const sql=readFileSync(
  new URL('../supabase/migrations/20261019001000_hot_owner_rpc_access.sql',import.meta.url),
  'utf8'
);

test('HOT owner migration keeps the approved 1..7 and KRW 8,000 contract',()=>{
  assert.match(sql,/taste_level\s+>=\s+1[\s\S]*planet='hot'\s+then\s+7/i);
  assert.match(sql,/p_level\s+not\s+between\s+1\s+and\s+7/i);
  assert.doesNotMatch(sql,/hot[^\n]{0,80}(?:then|between)\s+8/i);
  assert.match(sql,/amount_krw\s*=\s*8000/i);
  assert.match(sql,/product_code='NOWGO_HOT_MONTHLY'/);
  assert.match(sql,/price_code='KRW_8000_MONTHLY_V1'/);
});

test('candidate access and visitor direct writes fail closed',()=>{
  assert.match(sql,/revoke all on table public\.hot_unverified_spicy_menu_candidates from anon, authenticated/i);
  assert.match(sql,/drop policy if exists hot_unverified_candidates_public_read/i);
  assert.match(sql,/revoke insert,update,delete on table public\.hot_menu_spice_ratings from authenticated/i);
  assert.match(sql,/create or replace function public\.hot_menu_spice_upsert/i);
  assert.match(sql,/not exists\(select 1 from public\.ng_map_hot_menu_catalog m where m\.id=p_menu_id\)/i);
});

test('visitor ratings expose only the authenticated users own row',()=>{
  assert.match(sql,/alter table public\.hot_menu_spice_ratings enable row level security/i);
  assert.match(sql,/drop policy if exists hot_member_insert_own_rating/i);
  assert.match(sql,/drop policy if exists hot_member_update_own_rating/i);
  assert.match(
    sql,
    /create policy hot_member_read_own_rating[\s\S]*for select to authenticated[\s\S]*auth\.uid\(\)\)=user_id/i
  );
  assert.match(sql,/grant select on table public\.hot_menu_spice_ratings to authenticated/i);
});

test('all six owner RPCs exist and privileged entry points are explicitly restricted',()=>{
  for(const name of [
    'ng_map_can_publish','ng_map_dashboard_access','ng_map_save_menu',
    'ng_map_set_menu_taste','ng_map_set_menu_soldout','ng_map_set_status'
  ]) assert.match(sql,new RegExp('create or replace function public\\.'+name,'i'));
  const definerCount=(sql.match(/security definer/gi)||[]).length;
  const revokeCount=(sql.match(/revoke all on function/gi)||[]).length;
  assert.ok(definerCount>=7);
  assert.ok(revokeCount>=7);
  assert.match(sql,/join public\.ng_store_claims c[\s\S]*c\.status='approved'/i);
  assert.match(sql,/join public\.ng_business_verifications b[\s\S]*b\.status='verified'/i);
  assert.match(sql,/a\.status='ACTIVE' and a\.paid_until>now\(\)/i);
  assert.match(sql,/a\.verified_at\s+between\s+now\(\)-interval '24 hours'\s+and\s+now\(\)/i);
});

test('owner flavor and visitor median remain separate',()=>{
  assert.match(sql,/p_flavor not in \('얼큰한','칼칼한','달콤매콤한','알싸한'\)/);
  assert.doesNotMatch(sql,/update\s+public\.hot_menu_spice_ratings[\s\S]{0,300}taste_level/i);
  assert.match(sql,/public\.ng_map_owner_audit_log/);
  assert.match(sql,/create or replace view public\.ng_hot_combined_menus[\s\S]*with \(security_invoker=true\)/i);
});

