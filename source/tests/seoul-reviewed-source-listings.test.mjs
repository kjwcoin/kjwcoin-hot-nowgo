import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import records from '../data/hot-source-listings.json' with {type:'json'};
import registry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import * as sourced from '../lib/sourced-store.ts';
import * as identity from '../lib/store-identity.ts';
import * as grouped from '../lib/map-sourced-stores.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {sourceUuid,prepareSeoulRelease,freezeSha} from '../scripts/prepare-seoul-source-release.mjs';
import {sourceUi,moduleAt} from './helpers/source-ui-components.mjs';
// Preserve the original frozen25 assertions after later append-only releases.
const completeFeed=readonlySourceStoreFeed(),feed={...completeFeed,stores:completeFeed.stores.slice(0,130)},seoul=feed.stores.slice(105),newRows=records.slice(105,130);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
const discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':sourced,'./social-preview':{socialMetadata:()=>({openGraph:{},twitter:{}})}});
test('append exactly25 Seoul to105 unchanged records/DTOs, never rebuild the original seven alone',()=>{
 assert.equal(records.slice(0,130).length,130);assert.equal(feed.stores.length,130);assert.equal(seoul.length,25);
 assert.equal(hash(records.slice(0,105)),'94b3c4b132cce0570769d1047864fc6a23b61252d79f42dcf521e872122a130f');
 assert.equal(hash(feed.stores.slice(0,105)),'ca061db71a0cd7c91cc4a45ef9fdce78e3f9442ea3c7481b09cbb6794ac654e5');
 for(const [prefix,count] of [['서울특별시 강남구 ',25],['인천광역시',100],['부산광역시',5]])assert.equal(feed.stores.filter(s=>s.address.startsWith(prefix)).length,count);
 for(const key of ['id','slug','sourceRef'])assert.equal(new Set(feed.stores.map(s=>s[key])).size,130);
 assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);assert.equal(feed.stores.filter(store=>registry.records[store.sourceRef]).length,123);
 assert.equal(seoul.filter(s=>sourced.isBrandCommonMenu(s.menus[0])).length,24);
 assert.equal(feed.stores.filter(s=>sourced.isBrandCommonMenu(s.menus[0])).length,117);
});
test('Seoul native IDs, source rows, raw coordinates and unknowns remain exact and source-only',()=>{
 for(const [i,store] of seoul.entries()){
  const row=newRows[i],meta=row.source_metadata,native=meta.sourceRecordId,raw=meta.identityLocator.rawRecord;
  assert.match(native,/^MA[0-9A-Z]{18}$/);assert.equal(store.sourceRef,'data-go-kr-15083033-'+native);assert.equal(store.id,sourceUuid(store.sourceRef));assert.equal(store.slug,'hot-seoul-'+native.toLowerCase());
  assert.equal(raw['상가업소번호'],native);assert.equal(raw['도로명주소'],store.address);assert.equal(raw['시군구코드'],'11680');
  assert.equal(meta.coordinateLocator.sha256,'08d3fd08b37840256cccd4f09bad6fc33133b647cbff05f22f26fc962cf84152');assert.equal(meta.coordinateLocator.coordinateSystem.epsg,4326);
  assert.equal(meta.coordinateLocator.rawLatitude,raw['위도']);assert.equal(meta.coordinateLocator.rawLongitude,raw['경도']);assert.equal(store.coordinates.lat,Number(raw['위도']));assert.equal(store.coordinates.lon,Number(raw['경도']));
  assert.equal(meta.factualUseReview.frozenFileSha256,freezeSha);assert.equal(store.source.fieldProvenance.registration,null);assert.equal(store.reportingState,'pending');assert.equal(store.registrationState,'source-only');assert.equal(store.ownerClaimVerified,false);assert.equal(store.ownership,'unclaimed');assert.equal(store.pinStatus,'gray');
  for(const key of ['price','heat','image','sourceTaste'])assert.equal(store.menus[0][key],null);
  assert.equal(store.operatingStatus,null);assert.equal(store.currentMenuAvailability,null);assert.equal(store.menus[0].provenance.currentAvailability,null);assert.equal(store.menus[0].provenance.explicitOpenLicense,false);
 }
});
test('one Seoul alias reserves original case-sensitive identity without creating a second card',()=>{
 const duplicate=newRows.filter(r=>r.source_metadata.aliasBindings.length);assert.equal(duplicate.length,1);const meta=duplicate[0].source_metadata;
 assert.equal(meta.aliasBindings.length,1);assert.equal(meta.duplicateSourceRows.sourceRows.length,2);
 const alias=meta.aliasBindings[0];assert.equal(alias.sourceRef,'data-go-kr-15083033-MA0101202409A0133976');assert.equal(alias.id,sourceUuid(alias.sourceRef));
 assert.equal(feed.stores.some(s=>s.id===alias.id||s.sourceRef===alias.sourceRef),false);
 for(const id of [alias.id,alias.id.toUpperCase(),'{'+alias.id+'}',alias.id.replaceAll('-','')])assert.equal(isReadonlySourceStoreId(id),true);
 assert.equal(isReadonlySourceReportBinding({menu_id:alias.menuId}),true);assert.equal(isReadonlySourceReportBinding({place_id:'nowgo-'+alias.id}),true);
 for(const store of seoul){assert.equal(isReadonlySourceStoreId(store.id),true);assert.equal(isReadonlySourceReportBinding({nowgo_store_id:store.id}),true);assert.equal(isReadonlySourceReportBinding({menu_id:store.menus[0].id}),true);}
});
test('every new pairing rejects changed identity/provenance and fabricated verified, writable or heat claims',()=>{
 const changes=[s=>s.id='22222222-2222-4222-8222-222222222222',s=>s.slug+='-wrong',s=>s.address+=' changed',s=>s.coordinates.lat+=.001,s=>s.sourceRef=s.sourceRef.toLowerCase(),s=>s.menus[0].name+=' other',s=>s.menus[0].provenance.sourceUrl='https://example.com/',s=>s.menus[0].provenance.explicitOpenLicense=true,s=>s.menus[0].heat=3,s=>s.menus[0].price=1000,s=>s.ownerClaimVerified=true,s=>s.registrationState='database',s=>s.reportingState='enabled'];
 for(const store of seoul)for(const mutate of changes){const bad=clone(store);mutate(bad);assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[bad]}),/invalid_source_store/);}
});
test('cards/details and canonical metadata distinguish24 brand-common from one tourism fact, never current sale or ratings',()=>{
 const ui=sourceUi();for(const store of seoul){const brand=sourced.isBrandCommonMenu(store.menus[0]);
  for(const Component of [ui.Card,ui.Detail]){const html=renderToStaticMarkup(React.createElement(Component,{store,onBack(){}}));assert.equal(html.includes(sourced.BRAND_COMMON_MENU_NOTICE),brand);assert.match(html,/맵기 미확인/);assert.match(html,/가격 미확인/);assert.doesNotMatch(html,/준비중|준비 중/);}
  const md=discovery.sourcedStoreMetadata(store,'hot.nowgo.space');assert.equal(md.alternates.canonical,'https://hot.nowgo.space/p/'+store.slug);assert.equal(md.robots.index,true);assert.equal(discovery.sourcedStoreMetadata(store,'sweet.nowgo.space').robots.index,false);
  assert.doesNotMatch(JSON.stringify(discovery.sourcedStoreJsonLd(store)),/aggregateRating|reviewCount|openingHours|offers|hasMenu|ratingValue|priceRange/);
 }
 assert.doesNotMatch(JSON.stringify(feed),/rawRecord|dataRowNumber|sha256|factualUseReview|duplicateSourceRows/);
});
test('country130 plus one existing catalog, Seoul25, canonical dedup and unknown filters remain correct',()=>{
 const api=moduleAt('lib/viewport-store-count.ts',{'./supabase':{publicDb:()=>{throw Error('No database access')},publicConfig:()=>({ready:false})},'./site-config':{siteConfig:()=>({flavors:[],categories:[],tables:{}})},'./store-identity.ts':identity,'./map-sourced-stores.ts':grouped,'./sourced-store-feed.ts':{readSourcedStoreFeed:async()=>feed},'./korean-region.ts':{isKoreanCoordinate}});
 const country={south:33,north:39.6,west:124,east:132},gangnam={south:37.4,north:37.6,west:127,east:127.2};
 assert.equal(api.countViewportStores([],country,true,feed.stores),130);assert.equal(api.countViewportStores([],gangnam,true,feed.stores),25);assert.equal(api.countViewportStores([],country,true,[...feed.stores,...seoul]),130);
 const catalog=[{id:'legacy',place_id:'reported-legacy',owner_store_id:null,shop:'기존 제보',address:'기존 주소',lat:37.3,lng:127.3}];assert.equal(api.countViewportStores(catalog,country,true,feed.stores),131);
 assert.equal(grouped.mapStoreGroups([],feed.stores).length,130);
 for(const store of seoul)for(const heat of [1,2,3,4,5])assert.equal(grouped.sourcedStoreMatches(store,{query:'',heat,budget:0,flavor:'전체',category:'전체'}),false);
});
test('offline append generator fails closed on an unexpected baseline size',()=>{
 assert.throws(()=>prepareSeoulRelease({count:25,records:[]},records,registry,[]),/unexpected_release_size/);
 assert.throws(()=>prepareSeoulRelease({count:25,records:Array(25)},records,registry,[]),/unexpected_release_size/);
});
