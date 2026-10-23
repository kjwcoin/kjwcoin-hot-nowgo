import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const attribution = read('../lib/partner-attribution.ts');
const referral = read('../app/api/partner/v1/balbadak/referral/route.ts');
const links = read('../app/api/partner/v1/balbadak/referral-links/route.ts');
const reports = read('../app/api/[action]/route.ts');
const owner = read('../app/api/owner/signup/route.ts');
const migration = read('../supabase/migrations/20261023110000_hot_balbadak_member_report_attribution.sql');

test('발바닥 유저·점주 링크는 서명 대상에 유형을 포함한다', () => {
  assert.match(attribution, /balbadak\|\$\{storeRef\}\|\$\{expires\}\|\$\{target\}/);
  assert.match(links, /signedReferralUrl\(sourceStoreId,'user'\)/);
  assert.match(links, /signedReferralUrl\(sourceStoreId,'owner'\)/);
  assert.match(referral, /target === 'user'/);
  assert.match(referral, /suggestion%23report/);
});

test('발바닥 유저 제보만 내부 귀속 테이블에 저장한다', () => {
  assert.match(reports, /referral\.target!=='user'/);
  assert.match(reports, /hot_partner_member_reports/);
  assert.match(reports, /onConflict:'source,report_id'/);
  assert.match(owner, /referral\?\.target==='owner'/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* anon, authenticated/);
});

test('귀속 저장 실패가 이미 저장된 제보를 실패로 되돌리지 않는다', () => {
  assert.match(reports, /partnerAttribution='pending'/);
  assert.match(reports, /catch\(error\).*pending/s);
  assert.match(reports, /photoReview:'queued',partnerAttribution/);
});
