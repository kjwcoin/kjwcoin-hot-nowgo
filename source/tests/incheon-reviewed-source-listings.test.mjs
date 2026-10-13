import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import allRecords from '../data/hot-source-listings.json' with {type:'json'};
import allRegistry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import * as sourced from '../lib/sourced-store.ts';
import * as identity from '../lib/store-identity.ts';
import * as grouped from '../lib/map-sourced-stores.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {sourceUuid} from '../scripts/prepare-incheon-source-release.mjs';
import {sourceUi,moduleAt} from './helpers/source-ui-components.mjs';
// Preserve the original release-specific assertions while later batches have separate exact-count tests.
const records=allRecords.slice(0,105),originalRefs=new Set(records.map(row=>row.source_ref));
const reviewedRecords=Object.fromEntries(Object.entries(allRegistry.records).filter(([ref])=>originalRefs.has(ref)));
const reviewedMenuKeys=new Set(Object.values(reviewedRecords).map(row=>row.menuKey));
const registry={...allRegistry,records:reviewedRecords,menus:Object.fromEntries(Object.entries(allRegistry.menus).filter(([key])=>reviewedMenuKeys.has(key)))};
const completeFeed=readonlySourceStoreFeed(),feed={...completeFeed,stores:completeFeed.stores.slice(0,105)},added=feed.stores.slice(7),brands=added.filter(store=>sourced.isBrandCommonMenu(store.menus[0])),individuals=added.filter(store=>!sourced.isBrandCommonMenu(store.menus[0]));
const clone=value=>JSON.parse(JSON.stringify(value));
const sourceRow=row=>({...row,owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED'});
const discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':sourced,'./social-preview':{socialMetadata:()=>({openGraph:{},twitter:{}})}});
const reject=(mutate,original=brands[0])=>{const store=clone(original);mutate(store);assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[store]}),/invalid_source_store|conflicting_source_store/)};

test('exactly 100 Incheon + 5 Busan source-only cards, with seven original public DTOs byte-equivalent',()=>{
 assert.equal(records.length,105);assert.equal(feed.stores.length,105);assert.equal(added.length,98);assert.equal(brands.length,93);assert.equal(individuals.length,5);
 assert.equal(feed.stores.filter(store=>store.address.startsWith('인천광역시')).length,100);
 assert.equal(feed.stores.filter(store=>store.address.startsWith('부산광역시')).length,5);
 assert.equal(createHash('sha256').update(JSON.stringify(feed.stores.slice(0,7))).digest('hex'),'c4956cfb3655333780192be9fd5991511222bb704408f99804c2df1800c82af1');
 assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);
 for(const field of ['id','slug','sourceRef'])assert.equal(new Set(feed.stores.map(store=>store[field])).size,105);
 assert.equal(records.filter(row=>row.source_metadata.deduplication?.allSourceRows?.length===1).length,22);
 for(const row of records.slice(7))assert.equal(row.source_metadata.deduplication?.unitFloorAssessment,undefined);
 assert.equal(Object.keys(registry.records).length,98);assert.equal(Object.keys(registry.menus).length,11);
});

test('exact uppercase alphanumeric native identities and canonical UUIDv5 survive without fabricated registrations',()=>{
 assert.ok(added.some(store=>/MA[0-9]+A/.test(store.sourceRef)));
 for(const store of added){
  const native=store.sourceRef.slice('data-go-kr-15083033-'.length),row=records.find(row=>row.id===store.id),meta=row.source_metadata;
  assert.match(native,/^MA[0-9A-Z]{18}$/);assert.equal(store.id,sourceUuid(store.sourceRef));assert.equal(store.slug,'hot-incheon-'+native.toLowerCase());
  assert.equal(store.source.fieldProvenance.registration,null);assert.equal(meta.registrationLocator,null);assert.equal(store.source.fieldProvenance.identity.nativeRecordId,native);assert.equal(store.source.fieldProvenance.coordinates.nativeRecordId,native);
  assert.equal(meta.identityLocator.nativeRecordId,native);assert.equal(meta.coordinateLocator.nativeRecordId,native);assert.equal(meta.coordinateLocator.coordinateSystem.epsg,4326);
  assert.equal(meta.coordinateLocator.sha256,'9198cdf381f7cc6adffe9c91c7856fdad037fbddb442fb49c68f796bf85bc1bc');
  assert.ok(Number.isSafeInteger(meta.identityLocator.dataRowNumber));assert.ok(Number.isSafeInteger(meta.coordinateLocator.dataRowNumber));
  assert.equal(Number(meta.coordinateLocator.rawLatitude),store.coordinates.lat);assert.equal(Number(meta.coordinateLocator.rawLongitude),store.coordinates.lon);
  assert.equal(typeof meta.coordinateLocator.rawLatitude,'string');assert.equal(typeof meta.coordinateLocator.rawLongitude,'string');
  assert.equal(store.registrationState,'source-only');assert.equal(store.ownership,'unclaimed');assert.equal(store.ownerClaimVerified,false);assert.equal(store.operatingStatus,null);assert.equal(store.currentMenuAvailability,null);assert.equal(store.reportingState,'pending');
  const menu=store.menus[0];for(const key of ['price','heat','image','sourceTaste'])assert.equal(menu[key],null);assert.equal(menu.provenance.currentAvailability,null);assert.equal(menu.provenance.priceAsOf,null);assert.equal(menu.provenance.explicitOpenLicense,false);assert.equal(menu.provenance.licenseName,null);
  assert.equal(menu.id,store.sourceRef+':menu:1');
 }
});

test('two duplicate groups reserve their alias IDs and receipts but publish only one canonical venue each',()=>{
 const duplicateRows=records.filter(row=>row.source_metadata.aliasBindings?.length);assert.equal(duplicateRows.length,2);
 for(const row of duplicateRows){
  assert.equal(row.source_metadata.duplicateSourceRows.sourceRows.length,2);
  for(const alias of row.source_metadata.aliasBindings){
   assert.equal(alias.id,sourceUuid(alias.sourceRef));assert.equal(isReadonlySourceStoreId(alias.id),true);assert.equal(isReadonlySourceStoreId('{'+alias.id.toUpperCase()+'}'),true);
   for(const binding of [{nowgo_store_id:alias.id},{place_id:'NOWGO-'+alias.id.toUpperCase()},{menu_id:alias.menuId,nowgo_store_id:'unrelated'}])assert.equal(isReadonlySourceReportBinding(binding),true);
   assert.equal(feed.stores.some(store=>store.sourceRef===alias.sourceRef||store.id===alias.id),false);
   const original=feed.stores.find(store=>store.id===row.id);reject(store=>{store.id=alias.id;store.sourceRef=alias.sourceRef;store.menus[0].id=alias.menuId;},original);
  }
 }
 for(const store of added){assert.equal(isReadonlySourceStoreId(store.id),true);assert.equal(isReadonlySourceReportBinding({menu_id:store.menus[0].id}),true);}
 assert.equal(isReadonlySourceStoreId('22222222-2222-4222-8222-222222222222'),false);assert.equal(isReadonlySourceReportBinding({menu_id:'unrelated'}),false);
});

test('the registry pins the complete reviewed identity/menu pairing and never treats arbitrary URLs as approved',()=>{
 const mutations=[s=>s.id='22222222-2222-4222-8222-222222222222',s=>s.slug+='-other',s=>s.name+=' other',s=>s.address+=' other',s=>s.coordinates.lat+=0.01,s=>s.coordinates=null,s=>s.sourceRef=s.sourceRef.toLowerCase(),s=>s.source.fieldProvenance.identity.nativeRecordId='MA0101202210A0084949',s=>s.source.fieldProvenance.registration={...s.source.fieldProvenance.identity,nativeRecordId:null},s=>s.source.fieldProvenance.coordinates.asOf='2026-02-30',s=>s.source.fieldProvenance.identity.checkedAt='2026-10-14T00:00:00Z',s=>s.source.asOf='2026-10-13',s=>s.source.licenseName='Website open licence',s=>s.source.fieldProvenance.extra=true,s=>s.menus[0].name='unreviewed menu',s=>s.menus[0].provenance.sourceUrl='https://example.com/',s=>s.menus[0].provenance.sourceUrl+='&redirect=1',s=>s.menus[0].provenance.sourceAsOf='2026-10-13',s=>s.menus[0].provenance.checkedAt='2026-10-14T00:00:00Z',s=>s.menus[0].provenance.brandName='신전떡볶이',s=>s.menus[0].provenance.sourceScope='specific_restaurant_official_tourism_record',s=>s.menus[0].provenance.branchMenuApplicability=true,s=>s.menus[0].provenance.currentAvailability=true,s=>s.menus[0].provenance.licenseName='이용허락범위 제한 없음',s=>s.menus[0].provenance.explicitOpenLicense=true,s=>s.menus[0].provenance.extra='unreviewed',s=>s.menus[0].provenance.sourceRecordIds.extra='unreviewed',s=>s.menus[0].sourceTaste={description:'copied prose'},s=>s.menus[0].heat=0,s=>s.registrationState='database',s=>s.ownership='verified',s=>s.reportingState='enabled',s=>s.menus.push(clone(s.menus[0]))];
 for(const mutate of mutations){try{reject(mutate)}catch(error){throw new Error(String(mutate),{cause:error})}}
 reject(s=>s.menus[0].provenance=clone(individuals[0].menus[0].provenance));
 const row=sourceRow(clone(records[7]));row.source_metadata.rights.scope='all-content';assert.equal(sourced.publicSourcedStore(row),null);
 for(const store of individuals)reject(s=>s.menus[0].provenance.sourceScope='brand_common',store);
});

test('cards and details visibly disclose brand-common scope next to the menu, preserving readonly legacy controls',()=>{
 const ui=sourceUi();
 for(const store of [brands[0],brands.at(-1)]){
  const card=renderToStaticMarkup(React.createElement(ui.Card,{store}));const detail=renderToStaticMarkup(React.createElement(ui.Detail,{store,onBack(){}}));
  for(const html of [card,detail]){assert.ok(html.includes(sourced.BRAND_COMMON_MENU_NOTICE));assert.ok(html.includes('/images/nowgo-red.png'));assert.ok(html.includes('가격 미확인'));assert.ok(html.includes('맵기 미확인'));}
  assert.ok(card.indexOf(sourced.BRAND_COMMON_MENU_NOTICE)>card.indexOf(store.menus[0].name));assert.ok(detail.indexOf(sourced.BRAND_COMMON_MENU_NOTICE)<detail.indexOf('explorer-taste-price'));assert.ok(detail.indexOf(sourced.BRAND_COMMON_MENU_NOTICE)<detail.indexOf('<details'));
  assert.ok(detail.includes('브랜드 공식 메뉴 출처'));assert.ok(detail.includes('지점의 판매 여부는 확인되지 않았습니다'));assert.ok(detail.includes('명시적 오픈 라이선스는 확인되지 않았습니다'));
  assert.equal((detail.match(/data-source-readonly-action=/g)||[]).length,3);assert.doesNotMatch(detail,/data-live-component|consumer-menu-heat|<form|<input|중앙값 [0-9]|0원|\/owner\/claim/);
 }
 for(const store of individuals){const html=renderToStaticMarkup(React.createElement(ui.Detail,{store,onBack(){}}));assert.doesNotMatch(html,/브랜드 공통 메뉴/);assert.match(html,/공식 관광자료 기재 메뉴 · 현재 판매 여부 미확인/);assert.ok(html.includes('메뉴 자료 기준일 '+store.menus[0].provenance.sourceAsOf));}
});

test('SEO, public provenance and observations stay scoped without raw audits, licence laundering or inferred heat',()=>{
 for(const store of added){
  const menu=store.menus[0],notice=discovery.sourceFactsNotice(store),metadata=discovery.sourcedStoreMetadata(store,'hot.nowgo.space');
  assert.equal(metadata.alternates.canonical,'https://hot.nowgo.space/p/'+store.slug);assert.equal(metadata.robots.index,true);assert.equal(discovery.sourcedStoreMetadata(store,'sweet.nowgo.space').robots.index,false);
  assert.ok(notice.includes('상호·주소 자료 기준일 2026-06-30'));assert.ok(notice.includes('메뉴 출처 확인일 '+new Date(menu.provenance.checkedAt).toISOString().slice(0,10)+' (UTC)'));assert.ok(notice.includes('영업·메뉴 현황 확인일이 아닙니다'));
  if(sourced.isBrandCommonMenu(menu)){assert.ok(metadata.description.includes(sourced.BRAND_COMMON_MENU_NOTICE));assert.ok(notice.includes(sourced.BRAND_COMMON_MENU_NOTICE));assert.equal(menu.provenance.branchMenuApplicability,null);}
  const schema=JSON.stringify(discovery.sourcedStoreJsonLd(store));assert.doesNotMatch(schema,/aggregateRating|reviewCount|ratingValue|openingHours|priceRange|offers|hasMenu|"image"|dateModified|datePublished/);
 }
 const privateKeys=/rawRecord|rawLatitude|rawLongitude|dataRowNumber|sha256|termsReview|residualUncertainty|publicDisplayAssessment|sourcePremises|duplicateSourceRows|factualUseReview/;
 assert.doesNotMatch(JSON.stringify(feed),privateKeys);assert.doesNotMatch(JSON.stringify(registry),privateKeys);
 assert.doesNotMatch(readFileSync(new URL('../lib/sourced-store.ts',import.meta.url),'utf8'),/from ['"].*hot-source-listings/);
});

test('all-source and Incheon viewport counts count canonical stores once, with filters never manufacturing numeric heat',()=>{
 const bounds={south:33,north:39,west:124,east:132},incheon={south:37,north:38,west:126,east:127};
 const api=moduleAt('lib/viewport-store-count.ts',{'./supabase':{publicDb:()=>{throw Error('No database access')},publicConfig:()=>({ready:false})},'./site-config':{siteConfig:()=>({flavors:[],categories:[],tables:{}})},'./store-identity.ts':identity,'./map-sourced-stores.ts':grouped,'./sourced-store-feed.ts':{readSourcedStoreFeed:async()=>feed},'./korean-region.ts':{isKoreanCoordinate}});
 assert.equal(api.countViewportStores([],bounds,true,feed.stores),105);assert.equal(api.countViewportStores([],incheon,true,feed.stores),100);
 assert.equal(api.countViewportStores([],bounds,true,[...feed.stores,...feed.stores]),105);assert.equal(grouped.mapStoreGroups([],feed.stores).length,105);
 const catalog=[{id:'real-catalog-id',place_id:'reported-live-catalog',owner_store_id:null,shop:'실제 별도 매장',address:'인천광역시 남동구 별도길 10',lat:37.45,lng:126.7}];
 assert.equal(api.countViewportStores(catalog,bounds,true,feed.stores),106);
 const baseline={query:'',heat:0,budget:0,flavor:'전체',category:'전체'};
 for(const store of added){assert.equal(grouped.sourcedStoreMatches(store,baseline),true);for(const filters of [{heat:1},{budget:10000},{category:'떡볶이'},{flavor:'칼칼한'}])assert.equal(grouped.sourcedStoreMatches(store,{...baseline,...filters}),false);}
 const sameName=added.filter(store=>store.name==='춘리마라탕');assert.ok(sameName.length>1);assert.equal(grouped.mapStoreGroups([],sameName).length,sameName.length);
});
