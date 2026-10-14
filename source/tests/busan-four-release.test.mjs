import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import raw from '../data/hot-regional-source-records.json' with {type:'json'};
import registry from '../data/hot-regional-source-registry.json' with {type:'json'};
import {readonlySourceStoreFeed,isReadonlySourceStoreId} from '../lib/readonly-source-listings.ts';
import {parseSourcedStoreFeed} from '../lib/sourced-store.ts';
import {parseReviewedRegionalStore,appendRegionalSourceStores} from '../lib/regional-source.ts';
import {REVIEWED787_SOURCE_FEED_CONTRACT} from '../lib/source-feed-contract.ts';
const old=readonlySourceStoreFeed(REVIEWED787_SOURCE_FEED_CONTRACT),feed=readonlySourceStoreFeed(),additions=raw.slice(2),approvedIds=['06e0018d-393d-529a-98c0-c389fdafe9c3','a7b376a2-894d-550e-9491-dc9a7327448c','8b8da4a6-3932-564f-b8e0-977d4fabf770','7b51b57f-0146-5fd0-ae75-eec528cdff8f'];
const row=r=>({...r,owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED'});
test('Busan batch is exactly four additions; whole787 contract and all existing menu cards preserved',()=>{
 assert.equal(old.stores.length,787);assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'dce68e8b2cc05a0bf45043d40b7d87f8c883c2367ee920536df7fda15c990dbe');
 assert.equal(feed.stores.length,791);assert.equal(feed.complete,true);assert.deepEqual(feed.stores.slice(0,787),old.stores);assert.deepEqual(feed.stores.slice(787).map(s=>s.id),approvedIds);assert.deepEqual(additions.map(s=>s.id),approvedIds);assert.deepEqual(parseSourcedStoreFeed(feed),feed);
 const norm=s=>s.replace(/광역시|특별시|\s|[(),-]/g,'');for(const s of feed.stores.slice(787)){assert.ok(s.address.startsWith('부산'));assert.ok(!old.stores.some(o=>o.id===s.id||o.sourceRef===s.sourceRef||norm(o.name)===norm(s.name)||norm(o.address)===norm(s.address)));assert.ok(isReadonlySourceStoreId(s.id));assert.equal(s.reportingState,'pending');assert.equal(s.ownerClaimVerified,false);assert.equal(s.currentMenuAvailability,null);assert.equal(s.operatingStatus,null);assert.equal(s.source.licenseName,null);for(const m of s.menus){for(const k of ['heat','price','image','sourceTaste'])assert.equal(m[k],null)}}
});
test('each scoped exact origin and point validates; changed sources/points/creative content are rejected',()=>{
 for(const r of additions){assert.ok(parseReviewedRegionalStore(row(r),registry));for(const mutate of [x=>x.lat+=0.001,x=>x.lon+=0.001,x=>x.source_metadata.sourceUrl+='?unreviewed=true',x=>x.source_metadata.sourceUrl=x.source_metadata.sourceUrl.replace('https://','http://'),x=>x.source_metadata.licenseName='Open licensed',x=>x.source_metadata.menus[0].heat=5,x=>x.source_metadata.menus[0].price=15000,x=>x.source_metadata.menus[0].image='https://example.com/copy.jpg',x=>x.source_metadata.aliasBindings=[{}],x=>x.source_metadata.revokedMenuIds={bad:true}]){const bad=structuredClone(r);mutate(bad);assert.equal(parseReviewedRegionalStore(row(bad),registry),null)}}
});
test('public heat caveats separate historic strongest tasting from named-option-only discovery',()=>{
 const fresh=feed.stores.slice(787);assert.match(fresh[0].source.disclosure.scopeNotice,/2022-10-09/);assert.match(fresh[1].source.disclosure.scopeNotice,/2020년/);assert.match(fresh[1].source.disclosure.scopeNotice,/당시 도로명주소는 기재되지/);assert.match(fresh[2].source.disclosure.scopeNotice,/전해 들은/);assert.match(fresh[2].source.disclosure.scopeNotice,/건물 위치/);assert.match(fresh[3].source.disclosure.scopeNotice,/원문과 작성연도/);assert.match(fresh[3].source.disclosure.scopeNotice,/실제 강한 매운맛이나 수치 맵기는 확인되지/);
});
test('four new rows are idempotent and malformed extras cannot affect established787',()=>{
 const accepted=appendRegionalSourceStores(old.stores,additions,registry);assert.equal(accepted.stores.length,791);assert.equal(accepted.rejected.length,0);
 const repeated=appendRegionalSourceStores(accepted.stores,additions,registry);assert.equal(repeated.stores.length,791);assert.equal(repeated.rejected.length,4);
 const bad=structuredClone(additions[2]);bad.source_metadata.aliasBindings=[{}];const isolated=appendRegionalSourceStores(old.stores,[bad,...additions],registry);assert.equal(isolated.stores.length,791);assert.equal(isolated.rejected.length,1);assert.deepEqual(isolated.stores.slice(0,787),old.stores);
});
