import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import raw from '../data/hot-junghwa1-records.json' with {type:'json'};
import registry from '../data/hot-junghwa1-registry.json' with {type:'json'};
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import * as contracts from '../lib/source-feed-contract.ts';
import * as sourced from '../lib/sourced-store.ts';
import {appendRegionalSourceStores,parseReviewedRegionalStore,reviewedRegionalSourceRecordId} from '../lib/regional-source.ts';
import {moduleAt} from './helpers/source-ui-components.mjs';
const old=readonlySourceStoreFeed(contracts.REVIEWED1439_SOURCE_FEED_CONTRACT),feed=readonlySourceStoreFeed();
const row=r=>({...r,owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED'});
const ref='data-go-kr-15052602-20200114000121',recordId='snapshot-20200114-row-121';

test('Junghwa1 appends exactly one to byte-stable historical1439',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'f391b24a9c6df139ee758b341af2ddf1ee8102010d568ed5625cb49dd8132222');
 assert.equal(feed.stores.length,1440);assert.equal(feed.complete,true);assert.deepEqual(feed.stores.slice(0,1439),old.stores);
 assert.deepEqual(feed.stores.slice(1439).map(s=>s.id),['9ad417ff-fd90-5b77-a8e6-07839762dea2']);
 assert.equal(old.stores.some(s=>s.id===raw[0].id||s.sourceRef===ref),false);assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);
 assert.equal(contracts.CURRENT_SOURCE_FEED_CONTRACT,'hot-source-1440-v1');
 assert.equal(contracts.resolveSourceFeedContract('hot-source-1439-v1'),contracts.REVIEWED1439_SOURCE_FEED_CONTRACT);
});

test('Junghwa1 preserves frozen historical row identity and exact minimal facts',()=>{
 assert.equal(raw.length,1);const r=raw[0];assert.equal(r.source_ref,ref);assert.equal(r.source_metadata.sourceRecordId,recordId);
 assert.deepEqual({name:r.name,address:r.address,lat:r.lat,lon:r.lon,menus:r.source_metadata.menus.map(m=>m.name)}, {name:'중화반점',address:'대구광역시 중구 중앙대로 406-12',lat:35.8693,lon:128.594407,menus:['야끼우동']});
 assert.equal(r.source_metadata.sourceUrl,'https://www.data.go.kr/data/15052602/fileData.do');assert.equal(r.source_metadata.licenseName,null);assert.equal(r.source_metadata.sourceAsOf,null);
 assert.deepEqual(Object.keys(r.source_metadata).sort(),['planet','sourceUrl','sourceRecordId','licenseName','sourceAsOf','checkedAt','rights','reporting','menus','disclosure'].sort());
 assert.deepEqual(r.source_metadata.rights,{factsStorage:true,publicDisplay:true});assert.equal('phone' in r,false);
 assert.deepEqual(parseReviewedRegionalStore(row(r),registry),registry[0]);assert.deepEqual(sourced.publicSourcedStore(row(r)),registry[0]);
});

test('Junghwa1 exact public reference binds its historical snapshot row and rejects missing or forged IDs',()=>{
 assert.equal(reviewedRegionalSourceRecordId(ref),recordId);assert.equal(reviewedRegionalSourceRecordId(ref+'-other'),undefined);
 for(const id of [undefined,null,ref,'snapshot-20200114-row-122','snapshot-20200114-row-0121']){
  const bad=structuredClone(raw[0]);if(id===undefined)delete bad.source_metadata.sourceRecordId;else bad.source_metadata.sourceRecordId=id;
  assert.equal(parseReviewedRegionalStore(row(bad),registry),null);assert.equal(sourced.publicSourcedStore(row(bad)),null);
 }
 const bad=structuredClone(raw[0]);bad.source_ref=ref+'0';assert.equal(sourced.publicSourcedStore(row(bad)),null);
});

test('Junghwa1 rejects forged source, coordinates, disclosures and numeric menu facts',()=>{
 const changes=[r=>r.source_metadata.sourceUrl+='?fake=1',r=>r.lat+=.001,r=>r.source_metadata.aliasBindings=[{}],r=>r.source_metadata.menus[0].heat=7,r=>r.source_metadata.menus[0].heatLevel=8,r=>r.source_metadata.menus[0].priceKrw=10000,r=>r.source_metadata.menus[0].image='https://example.com/a.png',r=>r.source_metadata.disclosure.scopeNotice='현재 영업 확인',r=>r.source_metadata.licenseName='unrestricted'];
 for(const change of changes){const bad=structuredClone(raw[0]);change(bad);assert.equal(parseReviewedRegionalStore(row(bad),registry),null);assert.equal(sourced.publicSourcedStore(row(bad)),null);assert.equal(appendRegionalSourceStores(old.stores,[bad,...raw],registry).stores.length,1440)}
 const out=appendRegionalSourceStores(old.stores,raw,registry);assert.equal(out.rejected.length,0);assert.equal(appendRegionalSourceStores(out.stores,raw,registry).stores.length,1440);
});

test('Junghwa1 preserves unknown public price, heat, media, ownership and live business state',()=>{
 const item=feed.stores.at(-1);for(const m of item.menus)for(const key of ['price','heat','image','sourceTaste'])assert.equal(m[key],null);
 assert.equal(item.operatingStatus,null);assert.equal(item.currentMenuAvailability,null);assert.equal(item.reportingState,'pending');assert.equal(item.pinStatus,'gray');assert.equal(item.ownerClaimVerified,false);assert.equal(item.ownership,'unclaimed');assert.equal(item.registrationState,'source-only');
 const d=item.source.disclosure;for(const key of ['licenseUrl','revisionUrl','historyUrl'])assert.equal(d[key],null);
 assert.match(d.scopeNotice,/2026-07-26/);assert.match(d.scopeNotice,/2020-01-14/);assert.match(d.scopeNotice,/실시간 영업이나 현재 판매를 보증하지/);assert.match(d.scopeNotice,/재판매 권한으로 확대하지/);
 assert.match(d.attribution,/landeast\.tistory\.com\/179/);assert.match(d.attribution,/daegufood\.go\.kr/);
});

test('Junghwa1 public feed round trip rejects altered exact bound facts',()=>{
 for(const change of [s=>s.name+='x',s=>s.address+='x',s=>s.coordinates.lon+=.001,s=>s.source.url+='?x',s=>s.source.licenseName='open',s=>s.source.disclosure.changes+='x',s=>s.menus[0].name+='x',s=>s.menus[0].heat=7,s=>s.menus[0].price=1000,s=>s.ownerClaimVerified=true,s=>s.reportingState='complete']){
  const bad=structuredClone(feed);change(bad.stores.at(-1));assert.throws(()=>sourced.parseSourcedStoreFeed(bad),/invalid_source_store/);
 }
});

test('Junghwa1 reserves new read-only identity and menu without write-path changes',()=>{
 assert.equal(isReadonlySourceStoreId(raw[0].id),true);assert.equal(isReadonlySourceReportBinding({nowgo_store_id:raw[0].id}),true);assert.equal(isReadonlySourceReportBinding({menu_id:raw[0].source_metadata.menus[0].id}),true);
});

test('Junghwa1 keeps historical1439 conditional304 scoped and current1440 validator distinct',async()=>{
 const api=moduleAt('lib/sourced-store-feed.ts',{'node:crypto':{createHash},'./source-feed-contract.ts':contracts,'./sourced-store.ts':sourced,'./readonly-source-listings.ts':{readonlySourceStoreFeed}},{process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:'true'}}});
 const {GET}=moduleAt('app/api/sourced-stores/route.ts',{'@/lib/supabase':{publicDb:()=>({rpc:async()=>({data:[],error:null})})},'@/lib/source-feed-contract':contracts,'@/lib/server':{reply:(_request,data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})},'@/lib/site-config':{variantForHost:()=> 'hot'},'@/lib/sourced-store-feed':api},{Response,URL});
 const request=(contract,etag)=>new Request('https://hot.nowgo.space/api/sourced-stores',{headers:{host:'hot.nowgo.space',[contracts.SOURCE_FEED_CONTRACT_HEADER]:contract,...(etag?{'If-None-Match':etag}:{})}});
 const before=await GET(request(contracts.REVIEWED1439_SOURCE_FEED_CONTRACT));assert.equal(before.status,200);assert.deepEqual(await before.json(),old);const oldTag=before.headers.get('etag');assert.ok(oldTag);
 const same=await GET(request(contracts.REVIEWED1439_SOURCE_FEED_CONTRACT,oldTag));assert.equal(same.status,304);assert.equal(await same.text(),'');assert.equal(same.headers.get('cache-control'),'no-store');assert.equal(same.headers.get(contracts.SOURCE_FEED_CONTRACT_HEADER),contracts.REVIEWED1439_SOURCE_FEED_CONTRACT);
 const next=await GET(request(contracts.CURRENT_SOURCE_FEED_CONTRACT,oldTag));assert.equal(next.status,200);assert.notEqual(next.headers.get('etag'),oldTag);assert.deepEqual(await next.json(),feed);
 const currentSame=await GET(request(contracts.CURRENT_SOURCE_FEED_CONTRACT,next.headers.get('etag')));assert.equal(currentSame.status,304);assert.equal(await currentSame.text(),'');
});
