import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseSourcedStoreFeed,sourcedStoreUrl} from '../lib/sourced-store.ts';
import {mapStoreGroups,sourcedStoreMatches,sourcedStoresNearby,sourceIsPrimaryPin} from '../lib/map-sourced-stores.ts';
import {sourcedStoreMarker} from '../lib/source-map-marker.ts';
import {sourceStore,sixSources} from './fixtures/sourced-stores.mjs';
const feed=(stores=sixSources,extra={})=>({stores,complete:true,asOf:'2026-10-12T08:00:00Z',...extra});
const report=(n=1,extra={})=>({id:'report-'+n,placeId:'reported-'+n,shop:'자료 식당 '+n,area:'서울특별시 중구 자료길 '+n,name:'직접 제보 메뉴',price:12000,heat:3,flavor:'칼칼한',category:'닭발',image:'/photo',lat:37.56,lng:126.98,isDemo:false,description:'회원 제보',verifiedOwner:false,ownerRegistered:false,...extra});
const filters={query:'',heat:0,flavor:'전체',category:'전체',budget:0};

test('six source-only stores retain known menu names and null price/heat/photo without becoming reports',()=>{
 const parsed=parseSourcedStoreFeed(feed());assert.equal(parsed.stores.length,6);assert.equal(parsed.complete,true);
 const groups=mapStoreGroups([],parsed.stores);assert.equal(groups.length,6);
 for(const group of groups){assert.equal(group.catalog,undefined);assert.equal(sourceIsPrimaryPin(group),true);assert.equal(group.source.menus[0].price,null);assert.equal(group.source.menus[0].heat,null);assert.equal(group.source.menus[0].image,null)}
});
test('feed parser whitelists public facts and rejects malformed, fake, conflicting, or unmarked complete data',()=>{
 const clean=parseSourcedStoreFeed(feed([{...sourceStore(),owner_id:'private',secret:'do not expose'}]));assert.equal(clean.stores[0].owner_id,undefined);assert.equal(clean.stores[0].secret,undefined);
 assert.equal(parseSourcedStoreFeed(feed([sourceStore(),sourceStore()])).stores.length,1);
 for(const change of [{complete:undefined},{complete:'true'},{asOf:'yesterday'},{stores:Array.from({length:5001},()=>sourceStore())}])assert.throws(()=>parseSourcedStoreFeed(feed(sixSources,change)));
 for(const extra of [{id:'bad'},{slug:'../evil'},{ownership:'claimed'},{pinStatus:'red'},{operatingStatus:'open'},{coordinates:{lat:0,lon:0}},{menus:[{...sourceStore().menus[0],price:0}]},{menus:[{...sourceStore().menus[0],heat:1}]},{menus:[{...sourceStore().menus[0],image:'/fake'}]}])assert.throws(()=>parseSourcedStoreFeed(feed([sourceStore(1,extra)])));
 assert.throws(()=>parseSourcedStoreFeed(feed([sourceStore(),sourceStore(1,{name:'conflict'})])));
 assert.equal(parseSourcedStoreFeed(feed([sourceStore(1,{coordinates:null})])).stores[0].coordinates,null);
 assert.equal(parseSourcedStoreFeed(feed(sixSources,{complete:false})).complete,false);
});
test('canonical place ID matches first even with different text and owner metadata never fabricates a claim',()=>{
 const source=sourceStore(),original=report(2,{placeId:'nowgo-'+source.id,shop:'다른 표기',area:'다른 주소'});
 const groups=mapStoreGroups([original], [source]);assert.equal(groups.length,1);assert.strictEqual(groups[0].catalog.menus[0],original);assert.equal(groups[0].catalog.reportCount,1);assert.equal(groups[0].catalog.ownerRegistered,false);assert.equal(sourceIsPrimaryPin(groups[0]),true);
});
test('unique full name/address legacy tie joins, same name elsewhere and two canonical IDs stay separate',()=>{
 assert.equal(mapStoreGroups([report()],[sourceStore()]).length,1);
 assert.equal(mapStoreGroups([report(1,{area:'부산광역시 중구 자료길 1'})],[sourceStore()]).length,2);
 const other=sourceStore(2,{name:sourceStore().name,address:sourceStore().address});
 assert.equal(mapStoreGroups([report()],[sourceStore(),other]).length,3);
 assert.equal(mapStoreGroups([report(1,{placeId:'nowgo-other-explicit-id'})],[sourceStore()]).length,2);
 assert.equal(mapStoreGroups([report(1,{placeId:'nowgo-'+sourceStore().id})],[sourceStore(),other]).length,2);
});
test('mixed claimed menus/reports/source rows deduplicate and preserve consumer attribution',()=>{
 const source=sourceStore(),consumer=report(),owner=report(2,{placeId:'nowgo-'+source.id,ownerStoreId:source.id,shop:source.name,area:source.address,verifiedOwner:true});
 const groups=mapStoreGroups([consumer,owner,consumer],[source]);assert.equal(groups.length,1);assert.equal(groups[0].catalog.menus.length,2);assert.equal(groups[0].catalog.reportCount,1);assert.equal(groups[0].catalog.ownerRegistered,true);assert.equal(sourceIsPrimaryPin(groups[0]),false);assert.equal(consumer.verifiedOwner,false);
});
test('source unknown values never satisfy price/heat/category/flavor filters; keywords match only known facts',()=>{
 for(const query of ['자료 식당','자료길','매운 닭발'])assert.equal(sourcedStoreMatches(sourceStore(),{...filters,query}),true);
 for(const change of [{heat:1},{budget:10000},{flavor:'칼칼한'},{category:'닭발'},{query:'없는 메뉴'}])assert.equal(sourcedStoreMatches(sourceStore(),{...filters,...change}),false);
 assert.equal(sourcedStoreMatches(sourceStore(),{...filters,query:'닭발!'}),true);
});
test('null coordinates stay list-only and radius filtering never invents a location',()=>{
 const stores=[sourceStore(),sourceStore(2,{coordinates:null}),sourceStore(3,{coordinates:{lat:35.1,lon:129}})];
 assert.equal(sourcedStoresNearby(stores,null).length,3);assert.equal(sourcedStoresNearby(stores,{lat:37.56,lng:126.98}).length,1);
});
test('source store identity, rather than name heuristics, always gets a gray source pin and canonical link',()=>{
 for(const name of ['나우고','나우고 카페','demo 식당','공식 식당']){
  const source=sourceStore(1,{name});assert.equal(sourceIsPrimaryPin(mapStoreGroups([],[source])[0]),true);assert.equal(sourcedStoreUrl(source),'https://hot.nowgo.space/p/source-store-1');
 }
 const source=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
 const branch=source.slice(source.indexOf('if(sourceIsPrimaryPin(group)'),source.indexOf('if(!group.catalog)return null;'));
 assert.match(branch,/sourcedStoreMarker\(store\)/);assert.doesNotMatch(branch,/money\(|\.heat|\.price|storePinMenu/);
 const card=fs.readFileSync(new URL('../components/sourced-store-card.tsx',import.meta.url),'utf8');assert.match(card,/가격 · 매운맛 단계 · 사진 미확인/);assert.match(card,/영업 여부 · 현재 메뉴 제공 여부 미확인/);assert.doesNotMatch(card,/<img|소비자 제보/);
});

function fakeDocument(){return {createElement(tag){return {tag,children:[],attributes:{},setAttribute(key,value){this.attributes[key]=value},append(...children){this.children.push(...children)}}}}}
test('actual source marker is gray for every unclaimed name and owner-colored only with consistent explicit proof',()=>{
 for(const name of ['나우고','나우고 카페','공식 식당','verified owner']){
  const marker=sourcedStoreMarker(sourceStore(1,{name}),fakeDocument());
  assert.equal(marker.tag,'a');assert.equal(marker.className,'map-anchor map-anchor--sourced');assert.equal(marker.href,'https://hot.nowgo.space/p/source-store-1');assert.equal(marker.rel,'noopener noreferrer');assert.match(marker.attributes['aria-label'],/가격, 매운맛 단계, 영업 여부 미확인/);assert.equal(marker.children[1].textContent,name+' · 점주 미등록');
 }
 const verified=sourceStore(1,{ownership:'verified',ownerClaimVerified:true,pinStatus:'owner-verified'});
 assert.equal(parseSourcedStoreFeed(feed([verified])).stores[0].ownerClaimVerified,true);
 assert.match(sourcedStoreMarker(verified,fakeDocument()).className,/map-anchor--sourced-verified/);
 assert.equal(verified.menus[0].price,null);assert.equal(verified.menus[0].heat,null);
 for(const extra of [{ownership:'verified'},{ownerClaimVerified:true},{pinStatus:'owner-verified'},{ownership:'verified',ownerClaimVerified:false,pinStatus:'owner-verified'}]){
  assert.throws(()=>parseSourcedStoreFeed(feed([sourceStore(1,extra)])));
  assert.equal(sourcedStoreMarker(sourceStore(1,extra),fakeDocument()).className,'map-anchor map-anchor--sourced');
 }
});
test('verified source without an owner menu remains discoverable, then canonical owner menu replaces only the marker',()=>{
 const source=sourceStore(1,{ownership:'verified',ownerClaimVerified:true,pinStatus:'owner-verified'});
 const before=mapStoreGroups([],[source]);assert.equal(before.length,1);assert.equal(sourceIsPrimaryPin(before[0]),true);
 const owner=report(1,{placeId:'nowgo-'+source.id,ownerStoreId:source.id,verifiedOwner:true});
 const after=mapStoreGroups([owner],[source]);assert.equal(after.length,1);assert.equal(sourceIsPrimaryPin(after[0]),false);assert.strictEqual(after[0].source,source);
});

test('missing, malformed or enabled public reporting states fail closed before and after source ownership claim',()=>{
 for(const reportingState of [undefined,null,{},[],true,'enabled','pending'])for(const verified of [false,true]){
  const store=sourceStore(1,{reportingState,...(verified?{ownership:'verified',ownerClaimVerified:true,pinStatus:'owner-verified'}:{})});
  const parsed=parseSourcedStoreFeed(feed([store])).stores[0];assert.equal(parsed.reportingState,'pending');assert.equal(parsed.ownerClaimVerified,verified);assert.equal(parsed.menus[0].heat,null);
 }
});
