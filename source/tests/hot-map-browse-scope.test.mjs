import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readonlySourceStoreFeed} from '../lib/readonly-source-listings.ts';
import {mapBrowseOrigin,appendMapBrowseLocation} from '../lib/map-browse-scope.ts';
import {mapMenuCatalog} from '../lib/map-menu-catalog.ts';
import {sourcedStoresNearby,sourcedStoreMatches,mapStoreGroups} from '../lib/map-sourced-stores.ts';
import {positionedStoreGroups,clusterStorePoints} from '../lib/map-store-clusters.ts';
import {loadedMapStoreCount,loadedMapCountLabel} from '../lib/loaded-map-count.ts';
import {sourceUi,hookHarness,elements,textOf} from './helpers/source-ui-components.mjs';
const sources=readonlySourceStoreFeed().stores;
const seven=sources.filter(s=>s.slug.startsWith('hot-busan-')||s.slug==='hot-cheongna-ma010120220802577654'||s.slug==='hot-cheongna-ma010120220809138248');
const cheongna={lat:37.5364745896207,lng:126.643696685757};
const country={south:33,north:39.6,west:124,east:132};
const busan={south:35,north:35.3,west:128.8,east:129.3};
const hdd={id:'hdd-report-a',placeId:'reported-hdd-a',shop:'HDD',area:'서울특별시 중구 실제제보길 1',name:'제보 메뉴',price:26000,heat:3,flavor:'칼칼한',category:'닭발',image:'/photo',lat:37.56,lng:126.98,isDemo:false,description:'local test fixture',verifiedOwner:false,ownerRegistered:false};
const reports=[hdd,{...hdd,id:'hdd-report-b',placeId:'reported-hdd-b'}];
const draw=(menus,stores,bounds=country,level=12)=>clusterStorePoints(positionedStoreGroups(mapStoreGroups(menus,stores,stores)),{bounds,level,project:p=>({x:(p.lng-124)*50,y:(p.lat-33)*50})});
const filters={query:'',heat:0,flavor:'전체',category:'전체',budget:0};

test('location does not limit HOT discovery for current seven or candidate 105 sources; SWEET/RICH keep 15 km',()=>{
 assert.equal(seven.length,7);assert.equal(sources.length,105);
 for(const stores of [seven,sources])for(const variant of ['hot','sweet','rich']){
  const origin=mapBrowseOrigin(variant,cheongna),params=new URLSearchParams({q:'청라',heat:'3',page:'2'});
  appendMapBrowseLocation(params,variant,cheongna);
  assert.equal(params.get('q'),'청라');assert.equal(params.get('heat'),'3');assert.equal(params.get('page'),'2');
  if(variant==='hot'){
   assert.equal(origin,null);for(const key of ['lat','lng','radiusKm'])assert.equal(params.has(key),false);
   assert.equal(sourcedStoresNearby(stores,origin).length,stores.length);assert.equal(mapMenuCatalog(reports,origin).length,2);
  }else{
   assert.strictEqual(origin,cheongna);assert.equal(params.get('radiusKm'),'15');
   assert.ok(sourcedStoresNearby(stores,origin).length<stores.length);assert.equal(mapMenuCatalog(reports,origin).length,0);
  }
 }
});

for(const [name,stores] of [['current seven',seven],['candidate 105',sources]])test(`actual main HOT component: ${name} and HDD remain available after location and query reset`,()=>{
 const h=hookHarness(),ui=sourceUi({react:h.react,stores,menus:reports});
 const render=()=>elements(h.render(()=>ui.Explorer({variant:'hot'})));
 let nodes=render();nodes.find(n=>n.type===ui.Map).props.onLocation(cheongna);nodes=render();
 let map=nodes.find(n=>n.type===ui.Map);assert.equal(map.props.sourcedStores.length,stores.length);assert.equal(map.props.menus.length,2);
 assert.equal(mapStoreGroups(map.props.menus,map.props.sourcedStores).length,stores.length+1);
 assert.doesNotMatch(nodes.map(textOf).join(' '),/내 위치 주변 15km|내 주변 매장 · 메뉴/);
 assert.match(nodes.map(textOf).join(' '),/메뉴 요청당 최대 100개/);
 const search=nodes.find(n=>n.props?.['aria-label']==='HOT 메뉴 검색');search.props.onChange({target:{value:'청라'}});nodes=render();map=nodes.find(n=>n.type===ui.Map);
 assert.ok(map.props.sourcedStores.length>0);assert.ok(map.props.sourcedStores.every(s=>sourcedStoreMatches(s,{...filters,query:'청라'})));assert.equal(map.props.menus.length,0);
 nodes.find(n=>n.props?.className==='explorer-reset').props.onClick();nodes=render();map=nodes.find(n=>n.type===ui.Map);assert.equal(map.props.sourcedStores.length,stores.length);assert.equal(map.props.menus.length,2);
 for(const label of ['매운맛 단계','매운맛 카테고리','매운맛 메뉴','한 끼 예산']){
  const node=nodes.find(n=>n.props?.['aria-label']===label);node.props.onChange({target:{value:label==='한 끼 예산'?'10000':label==='매운맛 단계'?'3':label==='매운맛 카테고리'?'칼칼한':'닭발'}});
  nodes=render();map=nodes.find(n=>n.type===ui.Map);assert.equal(map.props.sourcedStores.length,0,label);
  nodes.find(n=>n.props?.className==='explorer-reset').props.onClick();nodes=render();
 }
});

for(const [name,stores] of [['current seven',seven],['candidate 105',sources]])test(`actual embedded HOT component: ${name}, location-present menu request and pins have no hidden radius`,async()=>{
 const h=hookHarness(),calls=[],timers=[];
 const globals={AbortController,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},setInterval(){return 1},clearInterval(){},window:{parent:{},addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}}};
 const ui=sourceUi({react:h.react,stores,globals,client:{track(){},api:async url=>{calls.push(url);return {menus:reports,hasMore:true}}}});
 const render=()=>elements(h.render(()=>ui.App({variant:'hot'})));
 let nodes=render();nodes.find(n=>n.type===ui.Map).props.onLocation(cheongna);nodes=render();h.flushEffects();timers.shift()();await new Promise(resolve=>setImmediate(resolve));nodes=render();
 assert.equal(calls.length,1);const url=new URL(calls[0],'https://local.invalid');for(const key of ['lat','lng','radiusKm'])assert.equal(url.searchParams.has(key),false);
 const map=nodes.find(n=>n.type===ui.Map);assert.equal(map.props.sourcedStores.length,stores.length);assert.equal(map.props.menus.length,1);assert.equal(map.props.menus[0].shop,'HDD');
 assert.doesNotMatch(nodes.map(textOf).join(' '),/내 위치 주변 15km/);assert.match(nodes.map(textOf).join(' '),/메뉴 요청당 최대 100개/);
 const heat=nodes.find(n=>n.type==='select'&&n.props.value===0);heat.props.onChange({target:{value:'3'}});nodes=render();assert.equal(nodes.find(n=>n.type===ui.Map).props.sourcedStores.length,0);
});

test('rendered count matches identical pin/cluster population, bounding, canonical aliases and one HDD',()=>{
 for(const stores of [seven,sources])for(const level of [4,12]){
  const displays=draw(reports,stores,country,level);assert.equal(loadedMapStoreCount(displays,country),stores.length+1);
  assert.equal(displays.reduce((n,d)=>n+(d.kind==='cluster'?d.count:1),0),stores.length+1);
  assert.equal(loadedMapStoreCount(draw(reports,stores,busan,level),busan),5);
 }
 const anchor=seven[0],alias={...hdd,id:'source-alias',placeId:'nowgo-'+anchor.id,shop:'alternate',area:'alternate',lat:anchor.coordinates.lat,lng:anchor.coordinates.lon};
 assert.equal(loadedMapStoreCount(draw([...reports,alias],seven),country),8);
 const legacy={...alias,id:'source-legacy',placeId:'reported-source-legacy',shop:anchor.name,area:anchor.address};
 assert.equal(loadedMapStoreCount(draw([...reports,alias,legacy],seven),country),8);
 const twins=[seven[0],{...seven[1],coordinates:seven[0].coordinates}];assert.equal(loadedMapStoreCount(draw([],twins),country),2);
});

test('zero, partial, missing source coordinates, invalid bounds and demos never inflate rendered count',()=>{
 assert.equal(loadedMapStoreCount([],country),0);assert.match(loadedMapCountLabel(0),/0곳/);assert.doesNotMatch(loadedMapCountLabel(null),/0곳/);
 const addressOnly={...seven[0],coordinates:null};assert.equal(loadedMapStoreCount(draw([], [addressOnly]),country),0);
 assert.equal(loadedMapStoreCount(draw([...reports,{...hdd,id:'demo-x',isDemo:true}],seven),country),8);
 // Only loaded records count even when the separately counted database/feed is larger.
 assert.equal(loadedMapStoreCount(draw(reports,seven.slice(0,2)),country),3);
 for(const bounds of [null,{...country,north:NaN},{...country,north:country.south}])assert.equal(loadedMapStoreCount(draw(reports,seven),bounds),null);
 const emptyBounds={south:33,north:34,west:126,east:127};assert.equal(loadedMapStoreCount(draw(reports,seven,emptyBounds),emptyBounds),0);
 assert.equal(loadedMapStoreCount(draw([{...hdd,lat:NaN}],[]),country),0);
});

test('primary HOT status reads loaded layer; distinct server total is secondary and non-HOT status stays intact',()=>{
 const code=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
 assert.match(code,/setLoadedVisibleCount\(loadedMapStoreCount\(displays,displayedBounds\)\)/);
 assert.match(code,/<strong>\{loadedMapCountLabel\(loadedVisibleCount\)\}<\/strong>/);
 assert.match(code,/표시 매장 수와 별개/);assert.match(code,/variant==='hot'\?<>/);
 assert.match(code,/map\.setLevel\(NEIGHBORHOOD_LEVEL\)/);assert.match(code,/callbacksRef\.current\.onLocation\?\.\(point\)/);
});

for(const variant of ['sweet','rich'])test(`actual ${variant} main and embedded maps retain existing geolocation radius and nearby copy`,async()=>{
 const mainHarness=hookHarness(),main=sourceUi({react:mainHarness.react,stores:seven,menus:reports});
 const renderMain=()=>elements(mainHarness.render(()=>main.Explorer({variant})));
 let nodes=renderMain();nodes.find(n=>n.type===main.Map).props.onLocation(cheongna);nodes=renderMain();
 const map=nodes.find(n=>n.type===main.Map);assert.equal(map.props.sourcedStores.length,2);assert.equal(map.props.menus.length,0);assert.match(nodes.map(textOf).join(' '),/내 위치 주변 15km/);
 const h=hookHarness(),calls=[],timers=[];
 const globals={AbortController,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},setInterval(){return 1},clearInterval(){},window:{parent:{},addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}}};
 const ui=sourceUi({react:h.react,stores:seven,globals,client:{track(){},api:async url=>{calls.push(url);return {menus:[],hasMore:false}}}});
 const render=()=>elements(h.render(()=>ui.App({variant})));
 nodes=render();nodes.find(n=>n.type===ui.Map).props.onLocation(cheongna);nodes=render();h.flushEffects();timers.shift()();await new Promise(resolve=>setImmediate(resolve));nodes=render();
 const params=new URL(calls[0],'https://local.invalid').searchParams;assert.equal(params.get('radiusKm'),'15');assert.equal(params.get('lat'),String(cheongna.lat));assert.equal(nodes.find(n=>n.type===ui.Map).props.sourcedStores.length,2);
});
