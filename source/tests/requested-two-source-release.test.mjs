import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import additions from '../data/hot-source-requested-two-20261013.json' with {type:'json'};
import records,{reviewed946Records} from '../lib/readonly-source-records.ts';
import registry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import * as readonly from '../lib/readonly-source-listings.ts';
import * as contracts from '../lib/source-feed-contract.ts';
import * as sourced from '../lib/sourced-store.ts';
import {sourcedStoreMatches,mapStoreGroups} from '../lib/map-sourced-stores.ts';
import {sourcedStoreSearchAliases} from '../lib/source-search-aliases.ts';
import {sourceUi,hookHarness,elements,moduleAt} from './helpers/source-ui-components.mjs';
const feed=readonly.readonlySourceStoreFeed(),newStores=feed.stores.slice(946),[onjeong,singil]=newStores;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const filters={query:'',heat:0,flavor:'전체',category:'전체',budget:0};
const matches=query=>feed.stores.filter(store=>sourcedStoreMatches(store,{...filters,query}));
const frozen={
 'hot-source-130-v1':[99,'d785b7534517fd7f06af7a54e79385f2029d7cce77bcb6a282466e7b14114a36'],
 'hot-source-588-v1':[414,'938810b0bd787ebda6a43a93ed0cae2dbb5a7c003d20845f0c3ce9482b9a41c2'],
 'hot-source-591-v1':[417,'7541e00c9769d81a85c2426bfc7ef5a6f889c87060344d0c51cdce6793966bd1'],
 'hot-source-591-v2':[591,'a02e8f95b6e4fed2b7ceef747652fc4ba198e9b485e4fd34f7bafb067a5a39d4'],
 'hot-source-946-v1':[946,'8abfb8ae39e69adf4231b38c75db28678652a34d3c0bedd41a41bc497482185a'],
};
test('948 adds exactly two requested identities while all five historical contract bodies remain byte-identical',()=>{
 assert.equal(contracts.CURRENT_SOURCE_FEED_CONTRACT,'hot-source-948-v1');assert.equal(contracts.REVIEWED946_SOURCE_FEED_CONTRACT,'hot-source-946-v1');
 assert.equal(records.length,948);assert.equal(reviewed946Records.length,946);assert.equal(additions.length,2);assert.equal(feed.stores.length,948);
 for(const [contract,[count,digest]] of Object.entries(frozen)){assert.equal(contracts.resolveSourceFeedContract(contract),contract);const old=readonly.readonlySourceStoreFeed(contract);assert.equal(old.stores.length,count);assert.equal(hash(old),digest)}
 assert.deepEqual(feed.stores.slice(0,946),readonly.readonlySourceStoreFeed('hot-source-946-v1').stores);assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);
 for(const key of ['id','slug','sourceRef'])assert.equal(new Set(feed.stores.map(store=>store[key])).size,948);
 assert.deepEqual(records.slice(0,946),reviewed946Records);
});
test('requested stores preserve true street addresses, native SBIZ coordinates and exact isolated menu names',()=>{
 assert.deepEqual(newStores.map(s=>[s.name,s.address,s.coordinates,s.menus[0].name]),[
  ['온정돈까스','서울특별시 관악구 조원로 60',{lat:37.4835475625018,lon:126.909095895598},'디진다 돈가스'],
  ['신길동매운짬뽕','서울특별시 영등포구 영등포로62길 10-1',{lat:37.5153495355747,lon:126.91651146517},'홍합 매운 짬뽕'],
 ]);
 assert.equal(additions[1].source_metadata.nativeBusinessName,'신길동별난아찌짬뽕');assert.equal(additions[1].source_metadata.independentReview.addressDetail,null);
 for(const row of additions){assert.deepEqual(row.source_metadata.aliasBindings,[]);assert.equal(row.source_metadata.independentReview.packetSha256,'38ac9dec3fc183ec86337f937189879733ca8ab017a19eb48d8e37fe417b757e');assert.match(row.source_metadata.independentReview.qaFile,/named-two-independent-qa-final\.json$/)}
 assert.doesNotMatch(JSON.stringify(newStores),/nativeSourceRow|independentReview|packetSha256|dataRowNumber|nameAliases|searchAliases|aliasBindings|1층|2층/);
});
test('two menu facts have narrow attribution with no numeric heat, price, rating, photo, owner or live-operation claim',()=>{
 for(const store of newStores){assert.equal(store.registrationState,'source-only');assert.equal(store.reportingState,'pending');assert.equal(store.ownership,'unclaimed');assert.equal(store.ownerClaimVerified,false);assert.equal(store.pinStatus,'gray');assert.equal(store.operatingStatus,null);assert.equal(store.currentMenuAvailability,null);assert.equal(store.source.licenseName,'이용허락범위 제한 없음');assert.equal(store.source.fieldProvenance.licenseScope,'identity-location-only');assert.equal(store.source.fieldProvenance.registration,null);
  assert.equal(store.menus.length,1);const m=store.menus[0],p=m.provenance;for(const key of ['heat','price','image','sourceTaste'])assert.equal(m[key],null);
  assert.equal(p.kind,'official-tourism-place-menu');assert.equal(p.sourceScope,'specific_restaurant_official_tourism_record');assert.equal(p.licenseName,null);assert.equal(p.explicitOpenLicense,false);assert.equal(p.reuseBasis,'limited-individual-fact-review');assert.equal(p.currentAvailability,null);assert.equal(p.sourceAsOf,null);assert.equal(p.priceAsOf,null);assert.match(p.preparationNotice,/현재 영업·메뉴 판매 미확인.*고객 맵기 평가 없음/);
  const registered=registry.records[store.sourceRef];assert.deepEqual(registry.menus[registered.menuKey],{name:m.name,provenance:p});
 }
 assert.doesNotMatch(JSON.stringify(newStores),/medianHeat|sampleCount|ratingValue|aggregateRating|SHU|극강|6단계/);
});
test('new public facts are exact-registry-bound and every store/menu binding is reserved read-only',()=>{
 for(const store of newStores){for(const id of [store.id,store.id.toUpperCase(),'{'+store.id+'}',store.id.replaceAll('-','')]){assert.equal(readonly.isReadonlySourceStoreId(id),true);assert.equal(readonly.isReadonlySourceReportBinding({nowgo_store_id:id}),true);assert.equal(readonly.isReadonlySourceReportBinding({place_id:'nowgo-'+id}),true)}assert.equal(readonly.isReadonlySourceReportBinding({menu_id:store.menus[0].id}),true);
  for(const mutate of [s=>s.name+='변조',s=>s.address+='1층',s=>s.coordinates.lat=35,s=>s.menus[0].name='임의메뉴',s=>s.menus[0].heat=6,s=>s.menus[0].price=10000,s=>s.menus[0].image='/photo',s=>s.menus[0].provenance.explicitOpenLicense=true,s=>s.menus[0].provenance.licenseName='KOGL1',s=>s.menus[0].provenance.sourceUrl='https://example.com',s=>s.menus[0].provenance.currentAvailability=true,s=>s.ownerClaimVerified=true,s=>s.operatingStatus='open',s=>s.currentMenuAvailability=true,s=>s.reportingState='enabled']){const bad=structuredClone(store);mutate(bad);assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[bad]}),/invalid_source_store/)}
 }
});
test('exact user queries, verified name aliases and spaced/unspaced menu variants find the right store',()=>{
 for(const query of ['신대방 온정돈까스',' 신대방  온정돈까스 ','신대방온정돈까스','온정돈까스 본점','디진다돈까스','디진다 돈까스','디진다돈가스','디진다 돈가스'])assert.deepEqual(matches(query).map(s=>s.id),[onjeong.id],query);
 for(const query of ['신길동 짬뽕','신길동매운짬뽕','신길동 매운 짬뽕','신길동별난아찌짬뽕','신길동 별난아찌 짬뽕','홍합매운짬뽕','홍합 매운 짬뽕'])assert.deepEqual(matches(query).map(s=>s.id),[singil.id],query);
 assert.deepEqual(matches('부천 온정돈까스'),[]);assert.deepEqual(matches('논현 신길동짬뽕'),[]);
});
test('search aliases never become identity merges, leak onto a different source or outlive a withdrawn menu',()=>{
 for(const store of newStores){assert.deepEqual(sourcedStoreSearchAliases({...store,id:'unrelated'}),[]);assert.deepEqual(sourcedStoreSearchAliases({...store,sourceRef:'unrelated'}),[])}
 for(const changed of [{...onjeong,menus:[]},{...onjeong,menus:[{...onjeong.menus[0],name:'별도 메뉴'}]},{...onjeong,menus:[{...onjeong.menus[0],id:'unrelated'}]}])assert.equal(sourcedStoreMatches(changed,{...filters,query:'디진다돈까스'}),false);
 assert.equal(sourcedStoreMatches({...onjeong,menus:[]},{...filters,query:'신대방 온정돈까스'}),true);
 assert.equal(mapStoreGroups([],newStores).length,2);assert.notEqual(mapStoreGroups([],newStores)[0].key,mapStoreGroups([],newStores)[1].key);
 const unrelated={...onjeong,id:'00000000-0000-4000-8000-000000000000',sourceRef:'unrelated',address:'경기도 부천시'};assert.equal(mapStoreGroups([],[...newStores,unrelated]).length,3);
});
test('unmeasured source stores remain excluded by numeric heat, price, flavor and category filters',()=>{
 for(const store of newStores)for(const extra of [{heat:1},{heat:6},{budget:10000},{flavor:'칼칼한'},{category:'돈까스'}])assert.equal(sourcedStoreMatches(store,{...filters,...extra}),false);
});
test('all174 suppressed menus remain absent across948,946 and591v2, and historical bindings stay read-only',()=>{
 for(const contract of ['hot-source-591-v2','hot-source-946-v1',contracts.CURRENT_SOURCE_FEED_CONTRACT]){const body=readonly.readonlySourceStoreFeed(contract),empty=body.stores.filter(s=>!s.menus.length);assert.equal(empty.length,174);for(const store of empty){assert.deepEqual(sourcedStoreSearchAliases(store),[]);assert.equal(sourcedStoreMatches(store,{...filters,query:'엽기떡볶이 메뉴'}),false);const raw=records.find(r=>r.id===store.id);for(const menu_id of raw.source_metadata.revokedMenuIds)assert.equal(readonly.isReadonlySourceReportBinding({menu_id}),true)}assert.doesNotMatch(JSON.stringify(body),/yupdduk\.com|2026090003/)}
 assert.equal(feed.stores.filter(s=>s.menus.length).length,774);
});
test('actual main map uses exact spaced discovery queries without network requests',()=>{
 for(const [query,expected] of [['신대방 온정돈까스',onjeong],['신길동 짬뽕',singil]]){const h=hookHarness(),ui=sourceUi({react:h.react,stores:feed.stores,menus:[]});const render=()=>elements(h.render(()=>ui.Explorer({variant:'hot'})));let nodes=render();nodes.find(n=>n.props?.['aria-label']==='HOT 메뉴 검색').props.onChange({target:{value:query}});nodes=render();assert.deepEqual(nodes.find(n=>n.type===ui.Map).props.sourcedStores.map(s=>s.id),[expected.id]);nodes.find(n=>n.props?.className==='explorer-reset').props.onClick();assert.equal(render().find(n=>n.type===ui.Map).props.sourcedStores.length,948)}
});
test('cards and details show factual names and unknown states; JSON-LD invents no ratings or offers',()=>{
 const ui=sourceUi(),discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':sourced,'./social-preview':{socialMetadata:()=>({openGraph:{},twitter:{}})}});
 for(const store of newStores){for(const C of [ui.Card,ui.Detail]){const html=renderToStaticMarkup(React.createElement(C,{store,onBack(){}}));assert.ok(html.includes(store.name));if(C===ui.Detail)assert.ok(html.includes(store.address));assert.ok(html.includes(store.menus[0].name));assert.match(html,/맵기 미확인/);assert.match(html,/가격 미확인/);assert.match(html,/고객 맵기 평가 없음/);assert.doesNotMatch(html,/6단계|극강|영업 중|0원/)}const detail=renderToStaticMarkup(React.createElement(ui.Detail,{store,onBack(){}}));assert.ok(detail.includes(store.menus[0].provenance.sourceUrl));assert.match(detail,/오픈 라이선스는 확인되지/);assert.doesNotMatch(JSON.stringify(discovery.sourcedStoreJsonLd(store)),/aggregateRating|ratingValue|reviewCount|openingHours|offers|hasMenu|priceRange/)}
});
