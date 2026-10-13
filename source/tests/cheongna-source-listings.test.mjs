import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import records from '../data/hot-source-listings.json' with {type:'json'};
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {publicSourcedStore,parseSourcedStoreFeed,sourcedStoreUrl} from '../lib/sourced-store.ts';
import {parseMenuHeatQuery} from '../lib/hot-menu-heat.ts';
import {sourceUi,moduleAt} from './helpers/source-ui-components.mjs';
const feed=readonlySourceStoreFeed(),stores=feed.stores.slice(5),clone=value=>JSON.parse(JSON.stringify(value));
const sourceRow=row=>({...row,owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED'});
const originalFiveSha='31f4f6102ff6111b67d0fae95c44b1efba98b7b669e37800f70e96835a5b9407';
const facts=[
 {id:'f78a7946-3463-5d0a-84a1-697370d3649d',nativeId:'MA010120220802577654',name:'빨간돼지 청라점',menu:'매운묵은지등갈비찜',lat:37.5364745896207,lon:126.643696685757},
 {id:'f827a9fe-6c35-5049-9bec-1de30ef61ecc',nativeId:'MA010120220809138248',name:'브런치빈 청라점',menu:'스파이시 쉬림프 파스타',lat:37.5326097328313,lon:126.652913215437},
];
function uuidFromSource(ref){
 const namespace=Buffer.from('6ba7b8119dad11d180b400c04fd430c8','hex');
 const bytes=createHash('sha1').update(namespace).update('https://www.nowgo.space/source/'+ref).digest().subarray(0,16);
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=bytes.toString('hex');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
const discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':{sourcedStoreUrl},'./social-preview':{socialMetadata:()=>({openGraph:{images:['approved-art.jpg']},twitter:{images:['approved-art.jpg']}})}});
const rejects=mutate=>{const store=clone(stores[0]);mutate(store);assert.throws(()=>parseSourcedStoreFeed({...feed,stores:[store]}),/invalid_source_store/)};

test('exactly the two frozen Cheongna records extend five byte-equivalent public listings',()=>{
 assert.equal(records.length,7);assert.equal(feed.stores.length,7);
 assert.equal(createHash('sha256').update(JSON.stringify(feed.stores.slice(0,5))).digest('hex'),originalFiveSha);
 for(const field of ['id','slug','sourceRef'])assert.equal(new Set(feed.stores.map(store=>store[field])).size,7,field);
 for(let i=0;i<facts.length;i++){
  const expected=facts[i],store=stores[i];
  assert.equal(store.id,expected.id);assert.equal(store.id,uuidFromSource(store.sourceRef));assert.equal(store.sourceRef,'data-go-kr-15083033-'+expected.nativeId);
  assert.equal(store.name,expected.name);assert.equal(store.slug,'hot-cheongna-'+expected.nativeId.toLowerCase());assert.ok(store.slug.length<=80);
  assert.deepEqual(store.coordinates,{lat:expected.lat,lon:expected.lon});assert.equal(records[i+5].source_metadata.coordinateLocator.rawLatitude,String(expected.lat));assert.equal(records[i+5].source_metadata.coordinateLocator.rawLongitude,String(expected.lon));assert.equal(store.coordinateLocator,undefined);assert.equal(store.menus.length,1);assert.equal(store.menus[0].name,expected.menu);
  assert.equal(store.menus[0].id,store.sourceRef+':menu:1');assert.equal(store.registrationState,'source-only');assert.equal(store.ownership,'unclaimed');assert.equal(store.reportingState,'pending');
  assert.equal(store.ownerClaimVerified,false);assert.equal(store.operatingStatus,null);assert.equal(store.currentMenuAvailability,null);
  for(const field of ['price','heat','image','sourceTaste'])assert.equal(store.menus[0][field],null);
  assert.equal(store.menus[0].provenance.currentAvailability,null);assert.equal(store.menus[0].provenance.priceAsOf,null);
  assert.equal(store.source.fieldProvenance.registration.nativeRecordId,null);assert.equal(store.source.fieldProvenance.coordinates.nativeRecordId,expected.nativeId);
 }
 assert.ok(feed.stores.every(store=>!store.name.includes('전골그집')));
 assert.equal(isReadonlySourceStoreId('5c7fbc3f-8d90-58e6-9817-695de84a5efd'),false);
});

test('mixed field rights roundtrip with original dates and separate menu observation',()=>{
 assert.deepEqual(parseSourcedStoreFeed(feed),feed);
 for(const store of stores){
  const fields=store.source.fieldProvenance,menu=store.menus[0].provenance;
  assert.equal(fields.licenseScope,'identity-location-only');assert.equal(fields.registration.asOf,'2026-09-03');assert.equal(fields.coordinates.asOf,'2026-06-30');
  assert.equal(fields.coordinates.checkedAt,'2026-10-12T23:39:35.273900+00:00');assert.equal(menu.checkedAt,'2026-10-12T23:41:45.850830+00:00');
  assert.equal(menu.sourceAsOf,null);assert.equal(menu.explicitOpenLicense,false);assert.equal(menu.licenseName,null);assert.equal(menu.reuseBasis,'limited-individual-fact-review');assert.notEqual(menu.sourceUrl,store.source.url);
  const notice=discovery.sourceFactsNotice(store);
  for(const text of ['상호·주소 자료 기준일 2026-09-03','좌표 자료 기준일 2026-06-30','관광자료 메뉴 기준일 미제공','메뉴 출처 확인일 2026-10-12 (UTC)','영업·메뉴 현황 확인일이 아닙니다'])assert.ok(notice.includes(text),text);
 }
 assert.equal(stores[0].menus[0].provenance.nameRepresentation,'original');
 assert.equal(stores[1].menus[0].provenance.originalName,'スパイシーシュリンプパスタ');assert.equal(stores[1].menus[0].provenance.nameRepresentation,'ja-transliteration');
});

test('native IDs remain exact and malformed, fabricated or unreviewed identities fail closed',()=>{
 for(const ref of ['data-go-kr-15083033-ma010120220802577654','data-go-kr-15083033-MA01012022080257765','data-go-kr-15083033-010120220802577654','data-go-kr-15083033-MA010120220802577655','data-go-kr-15083033-MA010120220802577654<script>'])rejects(s=>{s.sourceRef=ref;s.menus[0].id=ref+':menu:1'});
 for(const mutate of [s=>delete s.source.fieldProvenance,s=>delete s.menus[0].provenance,s=>s.source.fieldProvenance.coordinates.nativeRecordId='MA010120220809138248',s=>s.source.fieldProvenance.registration.nativeRecordId='1087',s=>s.source.fieldProvenance.licenseScope='all-content',s=>s.source.fieldProvenance.coordinates.asOf='2026-02-30',s=>s.source.fieldProvenance.registration.url='javascript:alert(1)',s=>s.menus.push(clone(s.menus[0]))])rejects(mutate);
 const row=sourceRow(clone(records[5]));row.source_metadata.rights.scope='all-content';assert.equal(publicSourcedStore(row),null);
});

test('tourism provenance rejects rights laundering, arbitrary URLs, cross-record facts and unknown keys',()=>{
 for(const mutate of [p=>p.licenseName='이용허락범위 제한 없음',p=>p.explicitOpenLicense=true,p=>p.reuseBasis='government-open-license',p=>p.sourceAsOf='2026-09-03',p=>p.currentAvailability=true,p=>p.priceAsOf='2026-10-12',p=>p.checkedAt='not-a-date',p=>p.sourceUrl='javascript:alert(1)',p=>p.sourceUrl='https://example.com/',p=>p.sourceUrl+='&redirect=https://example.com/',p=>p.sourceRecordIds.contentid='2878005',p=>p.sourceRecordIds.script='alert(1)',p=>p.nameRepresentation='ja-transliteration',p=>p.originalName='unreviewed menu',p=>p.unreviewedField='hidden-content'])rejects(s=>mutate(s.menus[0].provenance));
 rejects(s=>s.menus[0].provenance=clone(stores[1].menus[0].provenance));
 rejects(s=>s.menus[0].sourceTaste={...feed.stores[0].menus[0].sourceTaste,sourceUrl:s.source.url});
 const unknown=clone(stores[0]);unknown.secret='stripped';unknown.source.secret='stripped';unknown.menus[0].secret='stripped';unknown.menus[0].customerMedianHeat=5;
 const sanitized=parseSourcedStoreFeed({...feed,stores:[unknown]}).stores[0];assert.equal(sanitized.secret,undefined);assert.equal(sanitized.source.secret,undefined);assert.equal(sanitized.menus[0].secret,undefined);assert.equal(sanitized.menus[0].customerMedianHeat,undefined);assert.equal(sanitized.menus[0].heat,null);
 rejects(s=>s.source.fieldProvenance.coordinates.extra='unreviewed');
});

test('source binding includes both new IDs and numeric heat API acceptance remains unchanged',()=>{
 for(const store of stores){
  assert.equal(isReadonlySourceStoreId(store.id),true);
  for(const binding of [{nowgo_store_id:store.id},{place_id:'NOWGO-'+store.id.toUpperCase()},{menu_id:store.menus[0].id},{menu_id:store.menus[0].id,nowgo_store_id:'unrelated'}])assert.equal(isReadonlySourceReportBinding(binding),true);
  assert.throws(()=>parseMenuHeatQuery(new URLSearchParams({storeId:store.id,menuId:store.menus[0].id})));
 }
});

test('new cards retain legacy slots, red fallback, readonly controls and truthful menu disclosure',()=>{
 const ui=sourceUi();
 for(const store of stores){
  const card=renderToStaticMarkup(React.createElement(ui.Card,{store}));
  for(const marker of ['source-store-legacy-card','explorer-menu-item','explorer-item-copy','/images/nowgo-red.png','가격 미확인','맵기 미확인'])assert.ok(card.includes(marker),marker);
  const html=renderToStaticMarkup(React.createElement(ui.Detail,{store,onBack(){}}));let cursor=-1;
  for(const marker of ['explorer-back','explorer-detail-photo','explorer-detail-content','explorer-tags','<h1>','explorer-taste-price','store-status','data-source-readonly-action="favorite"','explorer-quick-actions','source-public-taste','source-detail-footer']){const index=html.indexOf(marker);assert.ok(index>cursor,marker);cursor=index;}
  for(const text of ['공식 관광자료 기재 메뉴 · 현재 판매 여부 미확인','상호·주소·좌표 공공 CSV에만 적용: 이용허락범위 제한 없음','메뉴 자료 기준일 미제공','출처 확인일 2026-10-12 (UTC)','명시적 오픈 라이선스는 확인되지 않았습니다','고객이 평가한 맵기 단계가 아닙니다'])assert.ok(html.includes(text),text);
  assert.ok(html.includes(store.menus[0].provenance.sourceUrl.replaceAll('&','&amp;')));assert.equal((html.match(/data-source-readonly-action=/g)||[]).length,3);
  assert.doesNotMatch(html,/data-live-component|consumer-menu-heat|<form|<input|중앙값 [0-9]|0원|\/owner\/claim/);
  if(store===stores[1]){assert.match(html,/일본어 메뉴명 한글 음역/);assert.match(html,/スパイシーシュリンプパスタ/);assert.match(html,/현행 한국어 메뉴판 표기는 확인되지 않았습니다/);}
 }
});

test('canonical HOT SEO is still gated by host and eligibility and schema invents no availability or heat',()=>{
 for(const store of stores){
  for(const host of ['hot.nowgo.space','preview.vercel.app','localhost:3000',null]){
   const metadata=discovery.sourcedStoreMetadata(store,host);assert.equal(metadata.alternates.canonical,'https://hot.nowgo.space/p/'+store.slug);assert.equal(metadata.robots.index,host==='hot.nowgo.space');assert.equal(discovery.sourcedStoreMetadata({...store,indexable:false},host).robots.index,false);
  }
  const schema=discovery.sourcedStoreJsonLd(store);assert.doesNotMatch(JSON.stringify(schema),/aggregateRating|reviewCount|ratingValue|openingHours|priceRange|offers|hasMenu|"image"|dateModified|datePublished/);assert.equal(schema['@graph'][1].identifier[1].value,store.sourceRef);
 }
});


test('offset observations normalize to the actual UTC date without changing source-as-of dates',()=>{
 const store=clone(stores[1]),checkedAt='2026-10-13T00:30:00+09:00';
 store.source.checkedAt=checkedAt;store.source.fieldProvenance.registration.checkedAt=checkedAt;store.source.fieldProvenance.coordinates.checkedAt=checkedAt;store.menus[0].provenance.checkedAt=checkedAt;
 const parsed=parseSourcedStoreFeed({...feed,stores:[store]}).stores[0];
 const notice=discovery.sourceFactsNotice(parsed);
 assert.equal((notice.match(/출처 확인일 2026-10-12 \(UTC\)/g)||[]).length,3);assert.doesNotMatch(notice,/확인일 2026-10-13/);
 assert.match(notice,/상호·주소 자료 기준일 2026-09-03/);assert.match(notice,/좌표 자료 기준일 2026-06-30/);
 const html=renderToStaticMarkup(React.createElement(sourceUi().Detail,{store:parsed,onBack(){}}));
 assert.match(html,/출처 확인일 2026-10-12 \(UTC\)/);assert.doesNotMatch(html,/2026-10-13 \(UTC\)/);
});
