import * as menuSearch from '../lib/menu-search.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {performance} from 'node:perf_hooks';
import {mapStoreGroups} from '../lib/map-sourced-stores.ts';
import * as mapSources from '../lib/map-sourced-stores.ts';
import * as identities from '../lib/store-identity.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
import {positionedStoreGroups,clusterStorePoints,clusterZoomLevel,storeClusterButton,createStoreOverlayReconciler,STORE_CLUSTER_MIN_LEVEL} from '../lib/map-store-clusters.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';

const report={id:'report-a',placeId:'reported-a',shop:'진짜 식당',area:'서울 중구 길 12',name:'매운 닭발',price:12000,heat:2,flavor:'칼칼한',category:'닭발',image:'/photo',lat:37.56,lng:126.98,isDemo:false,description:'회원 제보',verifiedOwner:false,ownerRegistered:false};
const bounds={south:37,north:38,west:126,east:128};
const plan=(menus=[],sources=[],options={})=>clusterStorePoints(positionedStoreGroups(mapStoreGroups(menus,sources)),{level:8,bounds,project:()=>({x:20,y:20}),...options});
const count=display=>display.reduce((sum,item)=>sum+(item.kind!=='store'?item.count:item.point.isDemo?0:1),0);

function viewportCount(rows,sources=[],complete=true){
 const exports={},source=fs.readFileSync(new URL('../lib/viewport-store-count.ts',import.meta.url),'utf8');
 const dependencies={'./menu-search.ts':menuSearch,'./store-identity.ts':identities,'./map-sourced-stores.ts':mapSources,'./korean-region.ts':{isKoreanCoordinate},'./supabase':{},'./site-config':{},'./sourced-store-feed.ts':{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){assert.ok(name in dependencies);return dependencies[name]}});
 return exports.countViewportStores(rows,bounds,complete,sources);
}
const rows=menus=>menus.map(menu=>({id:menu.id,place_id:menu.placeId,owner_store_id:menu.ownerStoreId,shop:menu.shop,address:menu.area,lat:menu.lat,lng:menu.lng}));

test('same-store reports count once, distinct same-name branches count separately, originals stay intact',()=>{
 const input=Object.freeze([Object.freeze({...report}),Object.freeze({...report,id:'b',placeId:'naver-b',heat:5,shop:'진짜식당',area:'서울중구길12'}),Object.freeze({...report,id:'c',placeId:'reported-c',area:'서울 중구 다른길 12'})]);
 const before=JSON.stringify(input),display=plan(input);
 assert.equal(display.length,1);assert.equal(display[0].kind,'cluster');assert.equal(display[0].count,2);
 assert.equal(viewportCount(rows(input)),count(display));assert.equal(JSON.stringify(input),before);
 assert.equal(display[0].members.find(point=>point.group.catalog.menus.length===2).group.catalog.menus[1].heat,5);
});

test('source-only and matching reports share a single stable store identity without claiming ownership',()=>{
 const store=sourceStore(1,{registrationState:'source-only'}),menus=[{...report,shop:store.name,area:store.address},{...report,id:'b',shop:store.name,area:store.address,placeId:'nowgo-'+store.id}];
 const before=JSON.stringify({store,menus}),display=plan(menus,[store,store,sourceStore(2)]);
 assert.equal(display[0].count,2);assert.equal(viewportCount(rows(menus),[store,store,sourceStore(2)]),2);
 const merged=display[0].members.find(point=>point.group.source?.id===store.id);
 assert.strictEqual(merged.group.source,store);assert.equal(merged.lat,store.coordinates.lat);assert.equal(merged.group.catalog.menus.length,2);
 assert.equal(store.ownerClaimVerified,false);assert.equal(store.menus[0].heat,null);assert.equal(JSON.stringify({store,menus}),before);
});

test('canonical conflicts and missing addresses do not merge by store name',()=>{
 const menus=[{...report,ownerStoreId:'owner-a'},{...report,id:'b',ownerStoreId:'owner-b'},{...report,id:'c'},{...report,id:'d',placeId:'reported-d',area:''},{...report,id:'e',placeId:'reported-e',area:''}];
 assert.equal(count(plan(menus)),5);assert.equal(viewportCount(rows(menus)),5);
});

test('pixel proximity makes separate round groups rather than administrative-name totals',()=>{
 const sources=[sourceStore(1),sourceStore(2),sourceStore(3),sourceStore(4)];
 const display=plan([],sources,{project:point=>({x:point.group.source===sources[0]||point.group.source===sources[1]?20:200,y:20})});
 assert.equal(display.length,2);assert.deepEqual(display.map(item=>item.count),[2,2]);
 assert.equal(count(display),4);
});

test('nearby stores across a grid-cell boundary become one circle, with stable order-independent membership',()=>{
 const sources=[sourceStore(1),sourceStore(2),sourceStore(3),sourceStore(4)],x=[79.8,79.9,80.1,80.2];
 const project=point=>({x:x[sources.indexOf(point.group.source)],y:30});
 const first=plan([],sources,{project}),reversed=plan([],sources.toReversed(),{project});
 assert.equal(first.length,1);assert.equal(first[0].count,4);assert.equal(reversed[0].key,first[0].key);
});

test('dense neighboring groups render at separated seeds instead of colliding centroids',()=>{
 const pixel=[0,81,...Array(100).fill(39),...Array(100).fill(42)];
 const sources=pixel.map((x,i)=>sourceStore(i+1,{coordinates:{lat:37.5,lon:127+x/10000}}));
 const display=plan([],sources,{project:point=>({x:(point.lng-127)*10000,y:0})});
 assert.equal(display.length,2);assert.deepEqual(display.map(item=>item.count),[101,101]);
 assert.ok(Math.abs(display[0].lng-display[1].lng)*10000>80,'Visible centers retain separated seed spacing');
 assert.equal(count(display),202);
});

test('near zoom uses overlap circles only for colliding pins; disabled variants do not cluster',()=>{
 const sources=[sourceStore(1),sourceStore(2)];
 assert.equal(plan([],sources,{level:STORE_CLUSTER_MIN_LEVEL})[0].kind,'cluster');
 assert.equal(plan([],sources,{level:STORE_CLUSTER_MIN_LEVEL-1})[0].kind,'overlap');
 for(const options of [{level:STORE_CLUSTER_MIN_LEVEL-1,project:point=>({x:point.lat*100000,y:0})},{enabled:false}]){
  const display=plan([],sources,options);assert.equal(display.length,2);assert.ok(display.every(item=>item.kind==='store'));
 }
 assert.equal(clusterZoomLevel(8),6);assert.equal(clusterZoomLevel(6),4);assert.equal(clusterZoomLevel(1),1);
});

test('only located loaded stores within inclusive viewport bounds contribute; demos remain separate',()=>{
 const sources=[sourceStore(1,{coordinates:{lat:37,lon:126}}),sourceStore(2,{coordinates:{lat:38,lon:128}}),sourceStore(3,{coordinates:{lat:38.01,lon:128}}),sourceStore(4,{coordinates:null})];
 const demo={...report,id:'demo-1',isDemo:true},display=plan([demo],sources);
 assert.equal(count(display),2);assert.equal(display.find(item=>item.kind==='cluster').count,2);assert.equal(display.find(item=>item.kind==='store').point.isDemo,true);
 assert.equal(viewportCount(rows([demo]),sources),count(display));
 assert.equal(positionedStoreGroups(mapStoreGroups([],[sourceStore(9,{coordinates:{lat:NaN,lon:127}})])).length,0);
});

test('source coordinates beyond the catalog latitude ceiling retain existing source pin coverage',()=>{
 const sources=[sourceStore(1,{coordinates:{lat:39.2,lon:127}}),sourceStore(2,{coordinates:{lat:39.3,lon:127}})];
 const display=plan([],sources,{bounds:{south:39,north:39.6,west:126,east:128}});
 assert.equal(count(display),2);assert.equal(display[0].count,2);
});

test('cluster count cannot pretend to be the independently scanned viewport total or a partial minimum',()=>{
 const all=Array.from({length:150},(_,i)=>({...report,id:'r-'+i,placeId:'reported-'+i,shop:'가게 '+i,area:'서울 중구 길 '+i}));
 const displayed=plan(all.slice(0,100));assert.equal(count(displayed),100);assert.equal(viewportCount(rows(all)),150);
 assert.equal(viewportCount(rows(all.slice(0,100)),[],false),1,'Existing conservative incomplete-scan minimum is not the loaded-pin count');
 const ui=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
 assert.match(ui,/화면 전체 별도 집계 · 핀·목록은 불러온 자료 기준/);assert.match(ui,/원 안 숫자: 불러온 매장 수/);
});

test('duplicate point input and malformed projection cannot fabricate quantities',()=>{
 const points=positionedStoreGroups(mapStoreGroups([],[sourceStore(1),sourceStore(2)]));
 const display=clusterStorePoints([...points,...points],{level:8,bounds,project:()=>({x:NaN,y:0})});
 assert.equal(display.length,2);assert.equal(count(display),2);assert.ok(display.every(item=>item.kind==='store'));
});

test('cluster button is an accessible neutral quantity and blocks map/address-picker propagation',()=>{
 const dom={createElement(tag){return {tag,attributes:{},setAttribute(name,value){this.attributes[name]=value}}}};
 let zooms=0,prevented=0,stopped=0;const keyboard=[];const button=storeClusterButton(4000,value=>{zooms++;keyboard.push(value)},dom);
 assert.equal(button.tag,'button');assert.equal(button.type,'button');assert.equal(button.textContent,'4,000');assert.match(button.className,/map-store-cluster--large/);
 assert.match(button.attributes['aria-label'],/불러온 매장 4,000곳/);assert.doesNotMatch(button.attributes['aria-label'],/점주 확인|평점|중앙값/);
 for(let n=0;n<2;n++)button.onclick({detail:n,preventDefault(){prevented++},stopPropagation(){stopped++}});
 assert.equal(zooms,2);assert.equal(prevented,2);assert.equal(stopped,2);
 assert.deepEqual(keyboard,[true,false]);
});

test('4,000 synthetic unique stores create only cluster overlays and reuse unchanged overlays',()=>{
 const sources=Array.from({length:4000},(_,i)=>sourceStore(i+1,{coordinates:{lat:37.2+Math.floor(i/80)*.001,lon:126.8+(i%80)*.001}}));
 const start=performance.now(),points=positionedStoreGroups(mapStoreGroups([],sources));let projections=0,created=0,removed=0;
 const project=point=>{projections++;return {x:(point.lng-126.8)*10000,y:(point.lat-37.2)*10000}};
 const display=clusterStorePoints(points,{level:8,bounds,project});
 const layer=createStoreOverlayReconciler(()=>{created++;return {setMap(value){assert.equal(value,null);removed++}}});
 layer.update(display);assert.equal(points.length,4000);assert.equal(count(display),4000);assert.equal(projections,4000);
 assert.ok(display.length<100,`Expected fewer than 100 grid overlays, got ${display.length}`);assert.equal(created,display.length);
 layer.update(clusterStorePoints([...points].reverse(),{level:8,bounds,project}));assert.equal(created,display.length);assert.equal(removed,0);
 layer.update([]);assert.equal(removed,created);layer.dispose();assert.equal(removed,created);
 console.log(`Synthetic structure only: 4,000 stores -> ${display.length} overlays; grouping + reconciliation ${Math.round(performance.now()-start)} ms. This is not device/SDK performance.`);
});

test('zoom, filtering, pan-out, and disposal remove obsolete overlays without changing original records',()=>{
 const sources=[sourceStore(1),sourceStore(2)],points=positionedStoreGroups(mapStoreGroups([],sources));let created=0,removed=0;
 const layer=createStoreOverlayReconciler(()=>{created++;return {setMap(){removed++}}});
 layer.update(plan([],sources));assert.equal(created,1);
 layer.update(plan([],sources,{level:4,project:point=>({x:point.lat*100000,y:0})}));assert.equal(created,3);assert.equal(removed,1);
 layer.update(plan([],sources.slice(0,1),{level:4}));assert.equal(created,3);assert.equal(removed,2);
 layer.update(clusterStorePoints(points,{level:8,bounds:{south:35,north:36,west:126,east:128},project:()=>({x:0,y:0})}));assert.equal(removed,3);
 layer.dispose();layer.dispose();assert.equal(removed,3);assert.equal(sources.length,2);
});

test('component gates clusters to HOT and removes listeners, animation frames and resize observers',()=>{
 const ui=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
 assert.match(ui,/clusteringEnabled=variant==='hot'&&!sourcePreview/);assert.match(ui,/clickable:true/);
 assert.match(ui,/map\.setCenter\(position\);map\.setLevel\(clusterZoomLevel\(map\.getLevel\(\)\)\)/);
 for(const [event,handler] of [['idle','refresh'],['zoom_changed','moved']]){assert.ok(ui.includes(`addListener(map,'${event}',${handler})`));assert.ok(ui.includes(`removeListener(map,'${event}',${handler})`))}
 assert.match(ui,/disposed=true;cancelAnimationFrame\(frame\);resize\.disconnect\(\)/);
 assert.match(ui,/source=sourceIdentityStores\.find\(store=>store\.id===selectedSourceId\)/);assert.match(ui,/map\.setLevel\(4\)/);
});
