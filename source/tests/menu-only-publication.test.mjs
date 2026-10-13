import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import records from '../lib/readonly-source-records.ts';
import registry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import excludedFixture from './fixtures/restricted-source-menu-suppression.json' with {type:'json'};
import {excludedSourceStoreIds,excludedSourceMenuIds} from '../lib/readonly-source-reserved-bindings.server.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {parseSourcedStoreFeed} from '../lib/sourced-store.ts';
import {sourcedStoreMatches} from '../lib/map-sourced-stores.ts';
import {CURRENT_SOURCE_FEED_CONTRACT,resolveSourceFeedContract} from '../lib/source-feed-contract.ts';
import {readSourcedStoreFeed,sourcedStoreFeedEtag,ifNoneMatchMatches} from '../lib/sourced-store-feed.ts';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const counts={'hot-source-130-v1':99,'hot-source-588-v1':414,'hot-source-591-v1':417,'hot-source-591-v2':417,'hot-source-946-v1':772,'hot-source-948-v1':774,'hot-source-774-v1':774};
const feed=readonlySourceStoreFeed(),excluded=new Set(excludedFixture.affectedIds);
test('774 exact retained records replace all174 menu-less public identities in every explicit contract',()=>{
 assert.equal(CURRENT_SOURCE_FEED_CONTRACT,'hot-source-774-v1');assert.equal(excluded.size,174);assert.equal(records.length,774);
 assert.equal(hash(records),'ddb4dec5e408a8b78605b24c72026b66d95a2012da49d9f7d7cb18df7ae72819');
 for(const [contract,count] of Object.entries(counts)){assert.equal(resolveSourceFeedContract(contract),contract);const body=readonlySourceStoreFeed(contract);assert.equal(body.stores.length,count);assert.ok(body.stores.every(s=>s.menus.length>0&&!excluded.has(s.id)));assert.deepEqual(parseSourcedStoreFeed(body),body);assert.doesNotMatch(JSON.stringify(body),/yupdduk\.com|2026090003/)}
 assert.ok(Object.values(registry.records).every(r=>!excluded.has(r.id)&&r.menuKey!==null));
});
test('opaque historical store, alias and menu bindings remain read-only, with no public rows',()=>{
 assert.equal(excludedSourceStoreIds.length,176);assert.equal(excludedSourceMenuIds.length,176);
 for(const id of excludedSourceStoreIds){assert.equal(isReadonlySourceStoreId(id),true);assert.equal(isReadonlySourceStoreId('{'+id.toUpperCase()+'}'),true);assert.equal(isReadonlySourceReportBinding({place_id:'nowgo-'+id}),true);assert.ok(!feed.stores.some(s=>s.id===id))}
 for(const menu_id of excludedSourceMenuIds)assert.equal(isReadonlySourceReportBinding({menu_id}),true);
});
test('empty menus fail closed while both requested restaurant searches remain exact',()=>{
 for(const store of feed.stores)assert.throws(()=>parseSourcedStoreFeed({...feed,stores:[{...store,menus:[]}]}),/invalid_source_store/);
 const filters={query:'',heat:0,flavor:'전체',category:'전체',budget:0};
 for(const [query,id] of [['신대방 온정돈까스','65a5768f-5c9e-563e-a04f-cbb81835ec02'],['신길동 짬뽕','75260ccd-ec8e-5f2d-961d-766cd4979d32']]){const matches=feed.stores.filter(s=>sourcedStoreMatches(s,{...filters,query}));assert.deepEqual(matches.map(s=>s.id),[id]);for(const extra of [{heat:6},{budget:10000}])assert.equal(sourcedStoreMatches(matches[0],{...filters,query,...extra}),false)}
});
test('old affected body validators cannot return304 after174-row exclusion',async()=>{
 const old=process.env.NOWGO_UNCLAIMED_STORES_ENABLED;process.env.NOWGO_UNCLAIMED_STORES_ENABLED='true';
 try{for(const [contract,oldEtag] of Object.entries({"hot-source-591-v2": "W/\"hot-source-v1-46c057b7b9e33957c81daa4d7c8027152f8a6a59ead5306bf7054bddfca99e15\"", "hot-source-946-v1": "W/\"hot-source-v1-c45b00259ef86d5510c86981f77db9b0d57425e482501ae92ac69be9c3ba8b2b\"", "hot-source-948-v1": "W/\"hot-source-v1-6e5e91611320ebc693f842a1a208505f4a34f457273cc115e013dd2d35e358fc\""})){const body=await readSourcedStoreFeed(undefined,contract);const etag=sourcedStoreFeedEtag(body,'local',contract);assert.ok(etag);assert.equal(ifNoneMatchMatches(oldEtag,etag),false)}}finally{if(old===undefined)delete process.env.NOWGO_UNCLAIMED_STORES_ENABLED;else process.env.NOWGO_UNCLAIMED_STORES_ENABLED=old}
});
