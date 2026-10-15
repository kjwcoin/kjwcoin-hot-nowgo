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
test('retain exactly25 Seoul and105 prior records after restricted-menu suppression',()=>{
 assert.equal(records.slice(0,130).length,130);assert.equal(feed.stores.length,130);assert.equal(seoul.length,25);
 assert.equal(hash(records.slice(0,105)),'935288c6ac32e479e586fc82d4ace2ae5a512152086ccec9e862954d60bbee1e');
 assert.equal(hash(feed.stores.slice(0,105)),'95f0d867753b7004168069a8dfe77b876db326bcd63db259bfbd431a8d33d32e');
 for(const [prefix,count] of [['서울특별시 강남구 ',25],['인천광역시',100],['부산광역시',5]])assert.equal(feed.stores.filter(s=>s.address.startsWith(prefix)).length,count);
 for(const key of ['id','slug','sourceRef'])assert.equal(new Set(feed.stores.map(s=>s[key])).size,130);
 assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);assert.equal(feed.stores.filter(store=>registry.records[store.sourceRef]).length,123);
 assert.equal(seoul.filter(s=>s.menus.length&&sourced.isBrandCommonMenu(s.menus[0])).length,15);
 assert.equal(feed.stores.filter(s=>s.menus.length&&sourced.isBrandCommonMenu(s.menus[0])).length,86);assert.equal(seoul.filter(s=>!s.menus.length).length,9);assert.equal(feed.stores.filter(s=>!s.menus.length).length,31);
});
test('Seoul native IDs, source rows, raw coordinates and unknowns remain exact and source-only',()=>{
 for(const [i,store] of seoul.entries()){
  const row=newRows[i],meta=row.source_metadata,native=meta.sourceRecordId,raw=meta.identityLocator.rawRecord;
  assert.match(native,/^MA[0-9A-Z]{18}$/);assert.equal(store.sourceRef,'data-go-kr-15083033-'+native);assert.equal(store.id,sourceUuid(store.sourceRef));assert.equal(store.slug,'hot-seoul-'+native.toLowerCase());
  assert.equal(raw['상가업소번호'],native);assert.equal(raw['도로명주소'],store.address);assert.equal(raw['시군구코드'],'11680');
  assert.equal(meta.coordinateLocator.sha256,'08d3fd08b37840256cccd4f09bad6fc33133b647cbff05f22f26fc962cf84152');assert.equal(meta.coordinateLocator.coordinateSystem.epsg,4326);
  assert.equal(meta.coordinateLocator.rawLatitude,raw['위도']);assert.equal(meta.coordinateLocator.rawLongitude,raw['경도']);assert.equal(store.coordinates.lat,Number(raw['위도']));assert.equal(store.coordinates.lon,Number(raw['경도']));
  assert.equal(meta.factualUseReview.frozenFileSha256,freezeSha);assert.equal(store.source.fieldProvenance.registration,null);assert.equal(store.reportingState,'pending');assert.equal(store.registrationState,'source-only');assert.equal(store.ownerClaimVerified,false);assert.equal(store.ownership,'unclaimed');assert.equal(store.pinStatus,'gray');
  assert.equal(store.operatingStatus,null);assert.equal(store.currentMenuAvailability,null);
  if(!store.menus.length){assert.deepEqual(meta.revokedMenuIds,[store.sourceRef+':menu:1']);continue;}
  for(const key of ['price','heat','image','sourceTaste'])assert.equal(store.menus[0][key],null);
  assert.equal(store.menus[0].provenance.currentAvailability,null);assert.equal(store.menus[0].provenance.explicitOpenLicense,false);
 }
});
test('one Seoul alias reserves original case-sensitive identity without creating a second card',()=>{
 const duplicate=newRows.filter(r=>r.source_metadata.aliasBindings.length);assert.equal(duplicate.length,1);const meta=duplicate[0].source_metadata;
 assert.equal(meta.aliasBindings.length,1);assert.equal(meta.duplicateSourceRows.sourceRows.length,2);
 const alias=meta.aliasBindings[0];assert.equal(alias.sourceRef,'data-go-kr-15083033-MA0101202409A0133976');assert.equal(alias.id,sourceUuid(alias.sourceRef));
 assert.equal(feed.stores.some(s=>s.id===alias.id||s.sourceRef===alias.sourceRef),false);
 for(const id of [alias.id,alias.id.toUpperCase(),'{'+alias.id+'}',alias.id.replaceAll('-','')])assert.equal(isReadonlySourceStoreId(id),true);
 assert.equal(isReadonlySourceReportBinding({menu_id:alias.menuId}),true);assert.equal(isReadonlySourceReportBinding({place_id:'nowgo-'+alias.id}),true);
 for(const store of seoul){assert.equal(isReadonlySourceStoreId(store.id),true);assert.equal(isReadonlySourceReportBinding({nowgo_store_id:store.id}),true);assert.equal(isReadonlySourceReportBinding({menu_id:store.sourceRef+':menu:1'}),true);}
});
test('every new pairing rejects changed identity/provenance and fabricated verified, writable or heat claims',()=>{
 const identityChanges=[s=>s.id='22222222-2222-4222-8222-222222222222',s=>s.slug+='-wrong',s=>s.address+=' changed',s=>s.coordinates.lat+=.001,s=>s.sourceRef=s.sourceRef.toLowerCase(),s=>s.ownerClaimVerified=true,s=>s.registrationState='database',s=>s.reportingState='enabled'];
 const menuChanges=[s=>s.menus[0].name+=' other',s=>s.menus[0].provenance.sourceUrl='https://example.com/',s=>s.menus[0].provenance.explicitOpenLicense=true,s=>s.menus[0].heat=3,s=>s.menus[0].price=1000];
 for(const store of seoul)for(const mutate of [...identityChanges,...(store.menus.length?menuChanges:[])]){const bad=clone(store);mutate(bad);assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[bad]}),/invalid_source_store/);}
});
test('cards/details and metadata distinguish15 brand facts, one tourism fact and9 identity-only stores',()=>{
 const ui=sourceUi();for(const store of seoul){const brand=!!store.menus.length&&sourced.isBrandCommonMenu(store.menus[0]);
  for(const Component of [ui.Card,ui.Detail]){const html=renderToStaticMarkup(React.createElement(Component,{store,onBack(){}}));assert.equal(html.includes(sourced.BRAND_COMMON_MENU_NOTICE),brand);if(store.menus.length||Component===ui.Detail){assert.match(html,/맵기 미확인/);assert.match(html,/가격 미확인/);}else assert.match(html,/확인된 메뉴 정보가 없어요/);assert.doesNotMatch(html,/준비중|준비 중/);}
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
