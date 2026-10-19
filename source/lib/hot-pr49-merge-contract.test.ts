import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {HEAT,SWEET_HEAT,RICH_HEAT} from './menus.ts';

const source=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');

test('PR #49 preserves final HOT 7 and unchanged SWEET/RICH 5 heat boundaries',()=>{
 assert.equal(HEAT.length,7);
 assert.equal(HEAT[6],'극강의 매운맛');
 assert.equal(SWEET_HEAT.length,5);
 assert.equal(RICH_HEAT.length,5);
});

test('PR #49 retains main menu report provenance and ownership fields',()=>{
 const menus=source('./menus.ts');
 for(const field of ['reportCountScope?:string','reportCountIsMinimum?:boolean','ownerClaimVerified?:boolean']){
  assert.ok(menus.includes(field),'Missing main Menu contract: '+field);
 }
});

test('PR #49 retains owner/user login redirect guard and main return-to-store link',()=>{
 const join=source('../app/account/join/page.tsx');
 const callback=source('../app/account/callback/page.tsx');
 assert.match(join,/requestedReturn\.startsWith\('\/app\/'\)\?'\/':requestedReturn/);
 assert.match(callback,/const webReturn=returnTo\.startsWith\('\/app\/'\)\?'\/':returnTo/);
 assert.match(join,/returnTo\.startsWith\('\/p\/'\).*취소하고 매장으로 돌아가기/);
});

test('PR #49 inherits main NAVER shutdown and makes zero provider API calls',()=>{
 const route=source('../app/api/naver-search/route.ts');
 assert.match(route,/code:'naver_search_disabled'/);
 assert.match(route,/\},410\)/);
 assert.doesNotMatch(route,/(?:naverHubSearch|fetch\(|verifiedUser|NAVER_CLIENT_ID)/);
});
