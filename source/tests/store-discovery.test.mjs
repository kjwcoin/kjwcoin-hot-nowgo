import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {sourceStore} from './fixtures/sourced-stores.mjs';
import {sourcedStoreUrl,isBrandCommonMenu,BRAND_COMMON_MENU_NOTICE} from '../lib/sourced-store.ts';
const source=fs.readFileSync(new URL('../lib/store-discovery.ts',import.meta.url),'utf8');
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>{
 if(name==='./sourced-store.ts')return {sourcedStoreUrl,isBrandCommonMenu,BRAND_COMMON_MENU_NOTICE};
 if(name==='./social-preview')return {socialMetadata:()=>({openGraph:{images:['approved-art.jpg']},twitter:{images:['approved-art.jpg']}})};
 throw Error(name);
}});
const {sourcedStoreMetadata,sourcedStoreJsonLd,sourceFactsNotice,serializeJsonLd,legacyStoreMetadata,legacyStoreJsonLd}=exports;
test('source canonical stays on HOT before and after claim; missing or false per-store eligibility always stays noindex',()=>{
 for(const ownerClaimVerified of [false,true]){
  const store=sourceStore(1,{slug:'hot-busan-1531',ownerClaimVerified});
  for(const host of ['hot.nowgo.space','localhost:3000','preview.vercel.app',null]){
   const metadata=sourcedStoreMetadata(store,host);
   assert.equal(metadata.alternates.canonical,'https://hot.nowgo.space/p/hot-busan-1531');
   assert.equal(metadata.openGraph.url,metadata.alternates.canonical);
   assert.equal(metadata.robots.index,false);
   assert.equal(metadata.openGraph.images[0],'approved-art.jpg');
  }
  assert.equal(sourcedStoreMetadata(store).robots.index,false);
 }
});
test('schema preserves exact local identity and source; omits invented price, rating, hours, images and current menu claims',()=>{
 const store=sourceStore(1,{name:'할매집회국수',address:'부산광역시 부산진구 공개주소 1',slug:'hot-busan-1531'});
 const graph=sourcedStoreJsonLd(store),business=graph['@graph'][1],page=graph['@graph'][0];
 assert.equal(business.name,store.name);assert.equal(business.address.streetAddress,store.address);
 assert.equal(business.identifier[0].value,store.id);assert.equal(business.identifier[1].value,store.sourceRef);
 assert.equal(page.isBasedOn.url,store.source.url);
 assert.equal(business.geo.latitude,store.coordinates.lat);
 assert.doesNotMatch(JSON.stringify(graph),/aggregateRating|reviewCount|ratingValue|openingHours|priceRange|offers|hasMenu|"image"|dateModified|datePublished/);
 const claimed=sourcedStoreJsonLd({...store,ownerClaimVerified:true,ownership:'verified'});
 assert.equal(claimed['@graph'][1]['@id'],business['@id']);
 assert.equal(sourcedStoreJsonLd({...store,coordinates:null})['@graph'][1].geo,undefined);
});
test('source dates distinguish unknown source date from source check and current operation',()=>{
 const notice=sourceFactsNotice(sourceStore(1,{source:{...sourceStore().source,asOf:null}}));
 assert.match(notice,/자료 기준일 미제공/);assert.match(notice,/출처 확인일 2026-10-12/);assert.match(notice,/영업·메뉴 현황 확인일이 아닙니다/);
});
test('JSON-LD escapes script-close payloads and preserves parsable text',()=>{
 const value={name:'</script><script>alert(1)</script>\u2028\u2029'};
 const serialized=serializeJsonLd(value);assert.doesNotMatch(serialized,/<|\u2028|\u2029/);assert.deepEqual(JSON.parse(serialized),value);
});
test('legacy gray/registered menus never become owner-authored, renamed or moved',()=>{
 const menu={placeId:'reported-abc',shop:'부산 원래이름',area:'부산 원래주소',name:'공개메뉴',isDemo:false,ownerRegistered:true,verifiedOwner:false,rating:4.9,reviewCount:99};
 const metadata=legacyStoreMetadata(menu,'hot','hot.nowgo.space'),schema=legacyStoreJsonLd(menu,'hot');
 assert.equal(metadata.alternates.canonical,'https://hot.nowgo.space/place/reported-abc');
 assert.equal(metadata.robots.index,false);assert.equal(exports.STORE_DISCOVERY_INDEXING_READY,false);
 assert.match(metadata.description,/고객 제보/);assert.doesNotMatch(metadata.description,/점주 제보/);
 assert.equal(schema.name,menu.shop);assert.equal(schema.address.streetAddress,menu.area);
 assert.doesNotMatch(JSON.stringify(schema),/aggregateRating|ratingValue|reviewCount/);
 assert.equal(legacyStoreJsonLd({...menu,isDemo:true},'hot'),null);
 assert.equal(legacyStoreMetadata({...menu,isDemo:true},'hot','hot.nowgo.space').robots.index,false);
});

test('only explicitly eligible source stores index on canonical HOT host; ownership is independent',()=>{for(const ownerClaimVerified of [false,true])for(const indexable of [false,true])for(const host of ['hot.nowgo.space','preview.vercel.app',null]){const metadata=sourcedStoreMetadata(sourceStore(1,{ownerClaimVerified,indexable}),host);assert.equal(metadata.robots.index,indexable&&host==='hot.nowgo.space')}});
