import test from 'node:test';
import assert from 'node:assert/strict';
import {nowgoUrl,returnPath,resolveOfficialStatus} from '../lib/integration-policy.ts';
const now=Date.parse('2026-09-24T06:00:00Z');
const current={hot_place_id:'reported-1',place_id:'real-place',minihome_url:'https://nowgo.space/p/real-place',owner_verified:true,source:'owner',status:'OPEN',crowding:'BUSY',seating:'FULL',observed_at:'2026-09-24T05:30:00Z',expires_at:'2026-09-24T07:00:00Z',menu:{hot_menu_id:'menu-1',status:'SOLD_OUT',observed_at:'2026-09-24T05:45:00Z',expires_at:'2026-09-24T07:00:00Z'}};
const resolve=d=>resolveOfficialStatus(d,'reported-1','menu-1',now);
test('trust only exact HTTPS NOWGO origins without credentials',()=>{for(const value of ['http://nowgo.space/p/a','https://nowgo.space.evil.test/p/a','https://user@nowgo.space/p/a','https://nowgo.space:444/p/a','javascript:alert(1)'])assert.equal(nowgoUrl(value),null);assert.ok(nowgoUrl(current.minihome_url))});
test('return destination is restricted to known local pages',()=>{for(const v of ['//evil.test','https://evil.test','/\\evil.test','/api/auth/callback','/map?next=https://evil.test'])assert.equal(returnPath(v),'/');assert.equal(returnPath('/suggestion#report'),'/suggestion#report');assert.equal(returnPath('/#report'),'/suggestion#report');assert.equal(returnPath('#report'),'/suggestion#report');assert.equal(returnPath('/map?q=떡볶이&budget=10000#menu'),'/?q=%EB%96%A1%EB%B3%B6%EC%9D%B4&budget=10000#menu');assert.equal(returnPath('/?menu=demo-menu-01'),'/suggestion?menu=demo-menu-01');assert.equal(returnPath('/place/demo-place-01?menu=demo-menu-01'),'/place/demo-place-01?menu=demo-menu-01')});
test('restaurant OPEN can coexist with selected dish SOLD_OUT',()=>{const s=resolve(current);assert.equal(s.open,'영업 중');assert.equal(s.menu,'품절');assert.equal(s.fresh,true)});
test('crowding and seating are shown only from fresh verified owner data',()=>{const s=resolve(current);assert.equal(s.crowding,'혼잡');assert.equal(s.seating,'만석');const unsafe=resolve({...current,owner_verified:false});assert.equal(unsafe.crowding,'확인 필요');assert.equal(unsafe.seating,'확인 필요')});
test('missing menu evidence is never inferred from OPEN',()=>assert.equal(resolve({...current,menu:undefined}).menu,'확인 필요'));
test('other menu evidence does not apply',()=>assert.equal(resolve({...current,menu:{...current.menu,hot_menu_id:'other'}}).menu,'확인 필요'));
test('expired owner information falls back to unknown',()=>assert.equal(resolve({...current,expires_at:'2026-09-24T05:59:59Z'}).open,'확인 필요'));
test('unverified owner cannot set official status',()=>assert.equal(resolve({...current,owner_verified:false}).open,'확인 필요'));
test('customer reports cannot impersonate official owner',()=>assert.equal(resolve({...current,source:'customer'}).open,'확인 필요'));
test('future timestamps and excessive validity fail closed',()=>{assert.equal(resolve({...current,observed_at:'2026-09-25T00:00:00Z'}).fresh,false);assert.equal(resolve({...current,expires_at:'2026-10-25T00:00:00Z'}).fresh,false)});
test('wrong place is never linked',()=>assert.equal(resolve({...current,hot_place_id:'other'}).linked,false));

test("app login returns only keep bridge parameters",()=>{assert.equal(returnPath("/app/report-login?role=customer&channel=550e8400-e29b-41d4-a716-446655440000&provider=google&next=https://evil.test"),"/app/report-login?role=customer&channel=550e8400-e29b-41d4-a716-446655440000&provider=google");assert.equal(returnPath("/app/entry"),"/app/entry");assert.equal(returnPath("/app/report?role=customer"),"/app/report")});

test('entry handoff survives OAuth return and rejects external redirect parameters',()=>{assert.equal(returnPath('/app/report-login?role=customer&mode=entry&channel=550e8400-e29b-41d4-a716-446655440000&next=https://evil.test'),'/app/report-login?role=customer&mode=entry&channel=550e8400-e29b-41d4-a716-446655440000')});

test('favorite login retains selected store without accepting external return URLs',()=>{const path='/app/report-login?mode=entry&favoriteStoreId=9116f942-8551-4520-9623-576fce3201a3';assert.equal(returnPath(path+'&next=https://evil.test'),path)});
