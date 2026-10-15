import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {reviewed946Records as records,reviewed591Records} from '../lib/readonly-source-records.ts';
import index from '../data/hot-source-regional348/index.json' with {type:'json'};
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {parseSourcedStoreFeed} from '../lib/sourced-store.ts';
import {REVIEWED946_SOURCE_FEED_CONTRACT} from '../lib/source-feed-contract.ts';
const feed=readonlySourceStoreFeed(REVIEWED946_SOURCE_FEED_CONTRACT),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const snapshots={'hot-source-130-v1':[99,'d785b7534517fd7f06af7a54e79385f2029d7cce77bcb6a282466e7b14114a36'],'hot-source-588-v1':[414,'938810b0bd787ebda6a43a93ed0cae2dbb5a7c003d20845f0c3ce9482b9a41c2'],'hot-source-591-v1':[417,'7541e00c9769d81a85c2426bfc7ef5a6f889c87060344d0c51cdce6793966bd1'],'hot-source-591-v2':[591,'a02e8f95b6e4fed2b7ceef747652fc4ba198e9b485e4fd34f7bafb067a5a39d4']};
test('946 combines348 permitted regional plus7 licensed while preserving exact suppression snapshots',()=>{
 assert.equal(REVIEWED946_SOURCE_FEED_CONTRACT,'hot-source-946-v1');assert.equal(records.length,946);assert.equal(reviewed591Records.length,591);assert.equal(feed.stores.length,946);
 for(const [contract,[count,digest]] of Object.entries(snapshots)){const old=readonlySourceStoreFeed(contract);assert.equal(old.stores.length,count);assert.equal(hash(old),digest)}
 assert.deepEqual(feed.stores.slice(0,591),readonlySourceStoreFeed('hot-source-591-v2').stores);assert.deepEqual(parseSourcedStoreFeed(feed),feed);for(const k of ['id','sourceRef','slug'])assert.equal(new Set(feed.stores.map(s=>s[k])).size,946);
});
test('all348 source additions are reviewed brand-common with no held source or provisional aliases',()=>{
 const added=feed.stores.slice(591,939);assert.equal(added.length,348);assert.deepEqual(added.map(s=>s.sourceRef),index.orderedSourceRefs);assert.deepEqual(index.partitions.map(p=>p.count),[15,18,114,8,6,21,23,34,31,32,23,23]);
 for(const s of added){assert.equal(s.menus.length,1);assert.equal(s.menus[0].provenance.sourceScope,'brand_common');assert.notEqual(s.menus[0].provenance.brandName,'동대문엽기떡볶이');assert.equal(s.menus[0].provenance.branchMenuApplicability,null);assert.equal(s.menus[0].provenance.explicitOpenLicense,false);for(const k of ['price','heat','image','sourceTaste'])assert.equal(s.menus[0][k],null);assert.equal(s.operatingStatus,null);assert.equal(s.currentMenuAvailability,null);assert.equal(s.ownerClaimVerified,false);assert.equal(isReadonlySourceStoreId(s.id),true);assert.equal(isReadonlySourceReportBinding({menu_id:s.menus[0].id}),true)}
 assert.equal(records.slice(591,939).flatMap(r=>r.source_metadata.aliasBindings||[]).length,0);for(const ref of ['data-go-kr-15083033-MA010120220813917460','data-go-kr-15083033-MA010120220813681478'])assert.equal(records.some(r=>r.source_ref===ref),false);
});
test('new data never restores174 withdrawn menus or affects their protected identities',()=>{
 const menuLess=feed.stores.filter(s=>s.menus.length===0);assert.equal(menuLess.length,174);assert.ok(menuLess.every(s=>reviewed591Records.some(r=>r.id===s.id)));
 for(const s of menuLess){assert.ok(s.coordinates);assert.equal(s.registrationState,'source-only');assert.equal(isReadonlySourceStoreId(s.id),true);const raw=records.find(r=>r.id===s.id);assert.ok(raw.source_metadata.revokedMenuIds.length>0);for(const id of raw.source_metadata.revokedMenuIds)assert.equal(isReadonlySourceReportBinding({menu_id:id}),true)}
 assert.doesNotMatch(JSON.stringify(feed),/yupdduk\.com|2026090003/);assert.equal(feed.stores.filter(s=>s.menus.length>0).length,772);
});
