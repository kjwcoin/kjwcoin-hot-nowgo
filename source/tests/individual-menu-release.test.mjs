import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {reviewed591Records as records,reviewed588Records} from '../lib/readonly-source-records.ts';
import additions from '../data/hot-source-individual-menu-20261013.json' with {type:'json'};
import * as contracts from '../lib/source-feed-contract.ts';
import * as sourced from '../lib/sourced-store.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {sourceUi,moduleAt} from './helpers/source-ui-components.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const current=readonlySourceStoreFeed('hot-source-591-v2'),old=readonlySourceStoreFeed('hot-source-588-v1'),legacy=readonlySourceStoreFeed('hot-source-130-v1'),newStores=current.stores.slice(588);
test('legacy remainders remain exact; current contract retains591 identities and reviewed individuals',()=>{
 assert.equal(hash(legacy.stores),'4c7d561b7b03f24b87ed55266fc19839b0710dedb9d1e4c98cb5bad3c4f2b8e4');assert.equal(hash(old.stores),'09a1f160909a34e0fc12d55850a97d446be83407a61c3ed6f99351863a500cc2');assert.equal(hash(reviewed588Records),'87626794c8c7a426c67412b50e6fe58cef09f3c9f66cf7bbeca52e8d3c0aedd9');
 assert.deepEqual(current.stores.slice(0,588).filter(s=>s.menus.length),old.stores);assert.equal(legacy.stores.length,99);assert.equal(old.stores.length,414);assert.equal(current.stores.length,591);assert.equal(additions.length,3);assert.equal(records.length,591);assert.equal(contracts.resolveSourceFeedContract('hot-source-588-v1'),'hot-source-588-v1');assert.equal(contracts.resolveSourceFeedContract(null),'hot-source-130-v1');assert.equal(contracts.MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT,'hot-source-591-v2');for(const key of ['id','slug','sourceRef'])assert.equal(new Set(current.stores.map(s=>s[key])).size,591);
});
test('individual menus have bounded text facts with no numeric heat, price, photo, ownership or current sale',()=>{
 assert.deepEqual(newStores.map(s=>s.name),['깃대봉냉면','낙산냉면','매떡']);assert.deepEqual(newStores.map(s=>s.menus[0].name),['비빔냉면','냉면','매운 떡볶이']);
 for(const s of newStores){assert.equal(s.registrationState,'source-only');assert.equal(s.reportingState,'pending');assert.equal(s.ownerClaimVerified,false);assert.equal(s.pinStatus,'gray');assert.equal(s.operatingStatus,null);assert.equal(s.currentMenuAvailability,null);const m=s.menus[0];for(const key of ['heat','price','image','sourceTaste'])assert.equal(m[key],null);assert.equal(m.provenance.explicitOpenLicense,false);assert.equal(m.provenance.licenseName,null);assert.equal(m.provenance.sourceScope,'specific_restaurant_official_tourism_record');assert.equal(m.provenance.currentAvailability,null);assert.equal(m.provenance.reuseBasis,'limited-individual-fact-review');assert.match(m.provenance.preparationNotice,/출처상.*선택 가능.*확인되지/);assert.equal(isReadonlySourceStoreId(s.id),true);assert.equal(isReadonlySourceStoreId(s.id.toUpperCase()),true);assert.equal(isReadonlySourceReportBinding({nowgo_store_id:s.id}),true);assert.equal(isReadonlySourceReportBinding({menu_id:m.id}),true)}
 assert.deepEqual(sourced.parseSourcedStoreFeed(current),current);assert.doesNotMatch(JSON.stringify(newStores),/rawRecord|dataRowNumber|packetSha256|membership|NAVER|극강|6단계|ratingValue|aggregateRating/);
});
test('new identities and menu facts are registry-bound and source-attributed in existing components',()=>{
 const ui=sourceUi();const discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':sourced,'./social-preview':{socialMetadata:()=>({openGraph:{},twitter:{}})}});
 for(const s of newStores){for(const mutate of [x=>x.name+='변조',x=>x.address+='변조',x=>x.coordinates.lat=35,x=>x.menus[0].heat=6,x=>x.menus[0].provenance.preparationNotice='극강 6단계']){const b=structuredClone(s);mutate(b);assert.throws(()=>sourced.parseSourcedStoreFeed({...current,stores:[b]}),/invalid_source_store/)}
 for(const C of [ui.Card,ui.Detail]){const html=renderToStaticMarkup(React.createElement(C,{store:s,onBack(){}}));assert.ok(html.includes(s.menus[0].provenance.preparationNotice));assert.match(html,/맵기 미확인/);assert.match(html,/가격 미확인/);assert.doesNotMatch(html,/브랜드 공통 메뉴|극강|6단계/)}
 const html=renderToStaticMarkup(React.createElement(ui.Detail,{store:s,onBack(){}}));assert.ok(html.includes(s.menus[0].provenance.sourceUrl.replaceAll('&','&amp;')));assert.match(html,/오픈 라이선스는 확인되지/);assert.match(html,/현재 판매 여부는 확인/);assert.doesNotMatch(JSON.stringify(discovery.sourcedStoreJsonLd(s)),/aggregateRating|reviewCount|openingHours|offers|hasMenu|ratingValue|priceRange/)}
});
