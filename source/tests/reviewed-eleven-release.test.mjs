import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import additions from '../data/hot-source-reviewed-eleven-20261014.json' with {type:'json'};
import records,{reviewed774Records} from '../lib/readonly-source-records.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import * as contracts from '../lib/source-feed-contract.ts';
import {parseSourcedStoreFeed} from '../lib/sourced-store.ts';
import {sourcedStoreMatches,mapStoreGroups} from '../lib/map-sourced-stores.ts';
const feed=readonlySourceStoreFeed();
const ids=new Set(additions.map(row=>row.id));
const fresh=feed.stores.filter(store=>ids.has(store.id));
const filters={query:'',heat:0,flavor:'전체',category:'전체',budget:0};
test('frozen11 is exact and adds only11 unique menu-bearing geo stores to774',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../data/hot-source-reviewed-eleven-20261014.json',import.meta.url))).digest('hex'),'64e6f7c1d279766f0195d6c1c5696b6440e637b8013af0f068a9fa8007f89b7f');
 assert.equal(additions.length,11);assert.equal(reviewed774Records.length,774);assert.equal(records.length,785);assert.equal(feed.stores.length,785);assert.equal(fresh.length,11);
 for(const key of ['id','slug','sourceRef'])assert.equal(new Set(feed.stores.map(row=>row[key])).size,785);
 assert.deepEqual(records.slice(774),additions);assert.deepEqual(feed.stores.slice(0,774),readonlySourceStoreFeed(contracts.REVIEWED774_SOURCE_FEED_CONTRACT).stores);
 assert.deepEqual(parseSourcedStoreFeed(feed),feed);assert.ok(feed.stores.every(store=>store.menus.length&&store.coordinates));
 assert.equal(mapStoreGroups([],feed.stores).length,785);
});
test('785 has a new explicit contract while774 and all old contracts stay available',()=>{
 assert.equal(contracts.CURRENT_SOURCE_FEED_CONTRACT,'hot-source-785-v1');assert.equal(contracts.resolveSourceFeedContract('hot-source-774-v1'),'hot-source-774-v1');
 assert.equal(readonlySourceStoreFeed('hot-source-774-v1').stores.length,774);assert.equal(readonlySourceStoreFeed('hot-source-948-v1').stores.length,774);
 assert.equal(contracts.resolveSourceFeedContract('hot-source-991-v1'),null);
});
test('all11 IDs and menu bindings stay read-only; raw source facts survive without invented user facts',()=>{
 for(const row of additions){const store=fresh.find(s=>s.id===row.id);assert.equal(store.name,row.name);assert.equal(store.address,row.address);assert.deepEqual(store.coordinates,{lat:row.lat,lon:row.lon});assert.equal(store.source.url,row.source_metadata.sourceUrl);assert.equal(store.source.asOf,row.source_metadata.sourceAsOf);assert.equal(store.registrationState,'source-only');assert.equal(store.reportingState,'pending');assert.equal(store.ownerClaimVerified,false);assert.equal(store.ownership,'unclaimed');assert.equal(store.operatingStatus,null);assert.equal(store.currentMenuAvailability,null);assert.ok(isReadonlySourceStoreId(row.id));assert.ok(isReadonlySourceStoreId('{'+row.id.toUpperCase()+'}'));
  for(const menu of store.menus){assert.equal(menu.name,row.source_metadata.menus.find(m=>m.id===menu.id).name);for(const key of ['price','heat','image'])assert.equal(menu[key],null);assert.ok(isReadonlySourceReportBinding({menu_id:menu.id}));}
  assert.doesNotMatch(JSON.stringify(store),/independentReview|dataRowNumber|nativeSourceRow|packetSha256/);
 }
});
test('all11 match store and menu searches and regional search, retaining existing Onjeong search',()=>{
 for(const store of fresh){for(const query of [store.name,store.menus[0].name,store.name+' '+store.menus[0].name])assert.ok(sourcedStoreMatches(store,{...filters,query}),query);assert.ok(sourcedStoreMatches(store,{...filters,query:store.address.startsWith('대구')?'대구':'부산'}));}
 assert.equal(feed.stores.filter(s=>sourcedStoreMatches(s,{...filters,query:'신대방 온정돈까스 디진다'})).length,1);
});
