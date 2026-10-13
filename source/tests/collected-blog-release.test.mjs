import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {collectedBlogStores} from '../lib/collected-blog-stores.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import {parseSourcedStoreFeed} from '../lib/sourced-store.ts';
import {CURRENT_SOURCE_FEED_CONTRACT,REVIEWED774_SOURCE_FEED_CONTRACT,resolveSourceFeedContract} from '../lib/source-feed-contract.ts';
import {sourcedStoreMarker} from '../lib/source-map-marker.ts';
import {sourcedStoreMatches,sourcedStoresNearby} from '../lib/map-sourced-stores.ts';
import {moduleAt} from './helpers/source-ui-components.mjs';
import * as runtime from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import * as sourced from '../lib/sourced-store.ts';
const discovery=moduleAt('lib/store-discovery.ts',{'./social-preview':{socialMetadata:()=>({})},'./sourced-store.ts':sourced});
function sourceViews(){
 const empty={default:()=>null};
 const dependencies={'react/jsx-runtime':runtime,react:React,'lucide-react':icons,'@/lib/sourced-store':sourced,'@/lib/store-discovery':discovery,'./owner-join-request.module.css':{default:{}},'@/components/ui/button':{Button:({children,onClick})=>React.createElement('button',{onClick},children)}};
 for(const name of ['consumer-menu-heat','preview-menu-heat','preview-photo-report','preview-regular-controls','preview-store-information','regular-favorite','regular-home-link','source-readonly-actions','source-community','sourced-store-photo','source-preview-actions','store-owner-join-request'])dependencies['@/components/'+name]=empty;
 return{Card:moduleAt('components/sourced-store-card.tsx',dependencies).default,Detail:moduleAt('components/sourced-store-detail.tsx',dependencies).default};
}
test('new feed preserves the previous release and includes every collected identity',()=>{
 const old=readonlySourceStoreFeed(REVIEWED774_SOURCE_FEED_CONTRACT),full=readonlySourceStoreFeed();
 assert.equal(old.stores.length,774);assert.equal(collectedBlogStores.length,217);assert.equal(full.stores.length,991);
 const byId=new Map(full.stores.map(row=>[row.id,row]));
 for(const row of old.stores)assert.deepEqual(byId.get(row.id),row);
 for(const row of collectedBlogStores)assert.deepEqual(byId.get(row.id),row);
 assert.deepEqual(parseSourcedStoreFeed(full),full);
 assert.equal(resolveSourceFeedContract(CURRENT_SOURCE_FEED_CONTRACT),CURRENT_SOURCE_FEED_CONTRACT);
 assert.equal(resolveSourceFeedContract(REVIEWED774_SOURCE_FEED_CONTRACT),REVIEWED774_SOURCE_FEED_CONTRACT);
});
test('blog facts never infer owner status, price, heat, image or current business status',()=>{
 for(const store of collectedBlogStores){
  assert.equal(store.ownerClaimVerified,false);assert.equal(store.ownership,'unclaimed');assert.equal(store.operatingStatus,null);assert.equal(store.currentMenuAvailability,null);
  assert.equal(store.markerColor,'red');assert.equal(store.indexable,false);
  for(const menu of store.menus){assert.equal(menu.price,null);assert.equal(menu.heat,null);assert.equal(menu.image,null)}
  assert.ok(isReadonlySourceStoreId(store.id));assert.ok(isReadonlySourceReportBinding({menu_id:store.menus[0].id}));
 }
});
test('release validation rejects forged name, source, location and ownership',()=>{
 const full=readonlySourceStoreFeed(),store=collectedBlogStores[0];
 for(const change of [{name:'다른 매장'},{source:{...store.source,url:'https://example.com/'}},{coordinates:{lat:37,lng:127}},{ownerClaimVerified:true},{menus:[{...store.menus[0],heat:3}]}])assert.throws(()=>parseSourcedStoreFeed({...full,stores:[{...store,...change}]}));
});
test('red marker is independent from an unverified owner and numeric taste scores',()=>{
 const dom={createElement(tag){return {tag,attributes:{},children:[],setAttribute(k,v){this.attributes[k]=v},append(...v){this.children.push(...v)}}}};
 const marker=sourcedStoreMarker(collectedBlogStores[0],dom);
 assert.match(marker.className,/map-anchor--collected-red/);assert.doesNotMatch(marker.className,/sourced-verified/);assert.match(marker.attributes['aria-label'],/블로그 출처/);assert.match(marker.attributes['aria-label'],/영업 여부 미확인/);
});
test('location-only and unknown-value filtering never fabricate pins or cheap prices',()=>{
 assert.ok(collectedBlogStores.every(row=>row.coordinates));
 const unknown={...collectedBlogStores[0],coordinates:null};
 assert.ok(sourcedStoresNearby([unknown],null).length===1);assert.equal(sourcedStoresNearby([unknown],{lat:37.5,lng:127}).length,0);
 assert.equal(sourcedStoreMatches(unknown,{query:'',heat:0,flavor:'전체',category:'전체',budget:10000}),false);
 assert.equal(sourcedStoreMatches(unknown,{query:unknown.menus[0].name,heat:0,flavor:'전체',category:'전체'}),true);
});
test('rendered blog cards and detail expose the true source with unknown status',()=>{
 const ui=sourceViews(),store=collectedBlogStores[0];
 const card=renderToStaticMarkup(React.createElement(ui.Card,{store}));
 assert.match(card,/블로그 출처 매장/);assert.match(card,/가격 미확인/);assert.match(card,/맵기 미확인/);assert.doesNotMatch(card,/소비자 제보 \d|0원/);
 const detail=renderToStaticMarkup(React.createElement(ui.Detail,{store,onBack(){}}));
 assert.match(detail,/블로그 원문 보기/);assert.ok(detail.includes(store.source.url));assert.match(detail,/영업현황 확인불가/);assert.doesNotMatch(detail,/공공데이터포털 원문/);
});
