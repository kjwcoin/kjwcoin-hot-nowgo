import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import additions from '../data/hot-source-licensed-menu-20261013.json' with {type:'json'};
import registry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import * as sourced from '../lib/sourced-store.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {sourceUi,moduleAt} from './helpers/source-ui-components.mjs';
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const current=readonlySourceStoreFeed(),licensedRefs=new Set(additions.map(row=>row.source_ref)),newStores=current.stores.filter(store=>licensedRefs.has(store.sourceRef));
test('exact seven additive identities occur once in the preserved suppression feed',()=>{assert.equal(additions.length,7);assert.equal(newStores.length,7);for(const key of ['id','slug','sourceRef'])assert.equal(new Set(newStores.map(s=>s[key])).size,7);assert.deepEqual(sourced.parseSourcedStoreFeed(current),current)});
test('licensed rows contain only ordinary spicy dataset facts, KOGL1 attribution and unrestricted SBIZ identity',()=>{
 assert.deepEqual(newStores.map(s=>s.name),['6일 닭강정','너비집','강남교자','더 키친 아시아 홍대점','설매네','완차이','육전국밥 대학로점']);
 assert.deepEqual(newStores.map(s=>s.menus[0].name),['글루텐프리 치킨','매운갈비찜','얼큰칼국수','치킨 티카 마살라 커리','매운갈비찜','매운홍합','육전비빔막국수']);
 for(const s of newStores){assert.equal(s.registrationState,'source-only');assert.equal(s.reportingState,'pending');assert.equal(s.ownership,'unclaimed');assert.equal(s.ownerClaimVerified,false);assert.equal(s.pinStatus,'gray');assert.equal(s.operatingStatus,null);assert.equal(s.currentMenuAvailability,null);assert.equal(s.menus.length,1);assert.equal(s.source.licenseName,'이용허락범위 제한 없음');assert.equal(s.source.fieldProvenance.licenseScope,'identity-location-only');assert.equal(s.source.fieldProvenance.registration,null);
 const m=s.menus[0],p=m.provenance;for(const key of ['heat','price','image','sourceTaste'])assert.equal(m[key],null);assert.equal(p.kind,'licensed-public-dataset-menu');assert.equal(p.explicitOpenLicense,true);assert.equal(p.licenseName,'공공누리 제1유형 (출처표시)');assert.equal(p.reuseBasis,'kogl-type-1-licensed-dataset-fact');assert.equal(p.sourceScope,'specific_restaurant_licensed_public_dataset_record');assert.equal(p.sourceUrl,'https://data.seoul.go.kr/dataList/OA-21054/S/1/datasetView.do');assert.equal(p.sourceRecordIds.dataset,'OA-21054');assert.match(p.attribution,/서울관광재단·서울 열린데이터광장.*OA-21054/);assert.equal(p.sourceAsOf,null);assert.equal(p.currentAvailability,null);assert.equal(p.priceAsOf,null);assert.match(p.preparationNotice,/현재 영업·메뉴 판매 미확인.*고객 맵기 평가 없음/);assert.equal(sourced.isBrandCommonMenu(m),false);
 }
 assert.doesNotMatch(JSON.stringify(newStores),/nativeRow|sourceRow|dataRowNumber|packetSha256|NAVER|naver|극강|medianHeat|sampleCount|ratingValue|aggregateRating/);
 assert.doesNotMatch(JSON.stringify(additions),/"nativeRow"|"sourceRow"|"cmmn_hmpg_url"|"cmmn_telno"|"post_url"|"fd_reprsnt_menu"/);
});
test('licensed provenance remains exact-registry-bound and cannot upgrade old or unreviewed sources',()=>{
 for(const s of newStores){for(const mutate of [x=>x.name+='변조',x=>x.address+='변조',x=>x.coordinates.lat=35,x=>x.menus[0].heat=6,x=>x.menus[0].price=10000,x=>x.menus[0].image='https://example.com/a.jpg',x=>x.ownerClaimVerified=true,x=>x.reportingState='approved',x=>x.currentMenuAvailability=true,x=>x.operatingStatus='open',x=>x.source.licenseName='KOGL1',x=>x.menus[0].provenance.explicitOpenLicense=false,x=>x.menus[0].provenance.licenseName=null,x=>x.menus[0].provenance.attribution='changed',x=>delete x.menus[0].provenance.attribution,x=>x.menus[0].provenance.sourceUrl='https://example.com',x=>x.menus[0].provenance.sourceRecordIds.post_sn='0',x=>x.menus[0].provenance.preparationNotice='극강 6단계',x=>x.menus[0].provenance.reuseBasis='limited-individual-fact-review',x=>x.menus[0].provenance.unreviewed='extra']){const bad=structuredClone(s);mutate(bad);assert.throws(()=>sourced.parseSourcedStoreFeed({...current,stores:[bad]}),/invalid_source_store/)}
 const reg=registry.records[s.sourceRef];assert.ok(reg.menuKey.startsWith('licensed-oa21054-'));assert.deepEqual(registry.menus[reg.menuKey].provenance,s.menus[0].provenance);
 }
 const old=structuredClone(current.stores.find(s=>s.sourceRef==='data-go-kr-15083033-MA0101202212A0013161'));old.menus[0].provenance=newStores[0].menus[0].provenance;assert.throws(()=>sourced.parseSourcedStoreFeed({...current,stores:[old]}),/invalid_source_store/);
 const unknown=structuredClone(newStores[0]);unknown.sourceRef='data-go-kr-15083033-MA010120220800000000';unknown.menus[0].id=unknown.sourceRef+':menu:1';assert.throws(()=>sourced.parseSourcedStoreFeed({...current,stores:[unknown]}),/invalid_source_store/);
});
test('all seven identities and menu bindings are reserved read-only in equivalent UUID forms',()=>{
 for(const s of newStores){for(const id of [s.id,s.id.toUpperCase(),'{'+s.id+'}',s.id.replaceAll('-','')]){assert.equal(isReadonlySourceStoreId(id),true);assert.equal(isReadonlySourceReportBinding({nowgo_store_id:id}),true);assert.equal(isReadonlySourceReportBinding({place_id:'nowgo-'+id}),true)}assert.equal(isReadonlySourceReportBinding({menu_id:s.menus[0].id}),true)}
});
test('new7 render readable KOGL1 attribution and source notices; old3 detail markup is byte-identical',()=>{
 const oldHtml={'data-go-kr-15083033-MA0101202212A0013161':'1310979df056f3c89285f648715ddd6e3e7481196e546128f77defaf923c4969','data-go-kr-15083033-MA010120220800023018':'6864395736c995c501f890f2f98cbdf7216d573f170b893aa0a313e0e0b472ad','data-go-kr-15083033-MA010120220810619843':'b37b954276a8d3103cc3dff7e02ae1943555dea794c34c0b7cdbe4673af27838'};
 const ui=sourceUi(),discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':sourced,'./social-preview':{socialMetadata:()=>({openGraph:{},twitter:{}})}});
 for(const s of current.stores.filter(s=>Object.hasOwn(oldHtml,s.sourceRef))){const html=renderToStaticMarkup(React.createElement(ui.Detail,{store:s,onBack(){}}));assert.equal(hash(html),oldHtml[s.sourceRef]);assert.match(html,/오픈 라이선스는 확인되지/)}
 for(const s of newStores){const html=renderToStaticMarkup(React.createElement(ui.Detail,{store:s,onBack(){}}));assert.ok(html.includes(s.menus[0].provenance.attribution));assert.ok(html.includes(s.menus[0].provenance.licenseName));assert.ok(html.includes(s.menus[0].provenance.sourceUrl));assert.doesNotMatch(html,/오픈 라이선스는 확인되지/);assert.match(html,/현재 판매 여부는 확인/);assert.match(html,/고객 맵기 평가 없음/);
 for(const C of [ui.Card,ui.Detail]){const rendered=renderToStaticMarkup(React.createElement(C,{store:s,onBack(){}}));assert.match(rendered,/맵기 미확인/);assert.match(rendered,/가격 미확인/);assert.ok(rendered.includes(s.menus[0].provenance.preparationNotice));assert.doesNotMatch(rendered,/브랜드 공통 메뉴|극강|6단계/)}
 assert.doesNotMatch(JSON.stringify(discovery.sourcedStoreJsonLd(s)),/aggregateRating|reviewCount|openingHours|offers|hasMenu|ratingValue|priceRange/);
 }
});
