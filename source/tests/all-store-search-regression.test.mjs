import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as runtime from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import * as search from '../lib/menu-search.ts';
import * as groups from '../lib/map-sourced-stores.ts';
import * as identities from '../lib/menu-store-groups.ts';
import * as scope from '../lib/map-browse-scope.ts';
import * as catalog from '../lib/map-menu-catalog.ts';
import * as korean from '../lib/korean-region.ts';
import {positionedStoreGroups} from '../lib/map-store-clusters.ts';
import {distanceKm,NEIGHBORHOOD_LEVEL} from '../lib/nearby-demo.ts';
import {readonlySourceStoreFeed} from '../lib/readonly-source-listings.ts';
import {elements,textOf} from './helpers/source-ui-components.mjs';

const stores=readonlySourceStoreFeed().stores;
const filters={heat:0,flavor:'전체',category:'전체',budget:0};
const origin={lat:37.5364745896207,lng:126.643696685757};
const report={id:'customer-a',placeId:'reported-a',name:'매운 메뉴',shop:'고유한 개인 가게',area:'서울특별시 중구 시험길 1',price:10000,heat:3,flavor:'칼칼한',category:'기타',image:'/fixture.jpg',lat:null,lng:null,isDemo:false,description:'Test fixture',verifiedOwner:false,ownerRegistered:false};
const owner={...report,id:'owner-a',placeId:'nowgo-owner-a',shop:'고유한 프랜차이즈 먼지점',area:'부산광역시 중구 시험길 2',ownerStoreId:'owner-a',verifiedOwner:true,ownerRegistered:true};
const located={...report,id:'located-a',placeId:'reported-located-a',shop:'좌표 있는 가게',lat:35.1796,lng:129.0756};
const matching=(query)=>stores.filter(store=>groups.sourcedStoreMatches(store,{...filters,query}));
const input=nodes=>nodes.find(node=>node.props?.['aria-label']==='지역명·상호명·매운 메뉴 검색');
const more=nodes=>nodes.find(node=>textOf(node)==='메뉴 더 보기');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Execute real map components with dependency-aware effects and controlled API
// completion order. All remote/owner actions and ancillary children are inert.
function harness({menus=[],sources=stores}={}){
 const cells=[],effects=[],timers=new Map(),calls=[];let cursor=0,timerId=0;
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={...React,useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return [cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value}]},useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i]},useMemo(fn,deps){const i=cursor++;if(!cells[i]||!equal(cells[i].deps,deps))cells[i]={deps,value:fn()};return cells[i].value},useCallback(fn,deps){return react.useMemo(()=>fn,deps)},useEffect(fn,deps){const i=cursor++,old=cells[i];if(!old||!equal(old.deps,deps)){const cell={deps,cleanup:old?.cleanup};cells[i]=cell;effects.push(()=>{cell.cleanup?.();cell.cleanup=fn()})}}};
 const MapView=()=>null,Detail=()=>null,Card=()=>null;
 const api=url=>new Promise(resolve=>calls.push({url,resolve}));
 const deps={react,'react/jsx-runtime':runtime,'lucide-react':icons,'@/lib/menu-search':search,'@/lib/map-sourced-stores':groups,'@/lib/menu-store-groups':identities,'@/lib/map-browse-scope':scope,'@/lib/map-menu-catalog':catalog,'@/lib/korean-region':korean,'@/lib/menus':{money:value=>value+'원'},'@/lib/menu-heat-attribution':{menuHeatAttribution:()=> '개별 제보 맵기'},'@/hooks/use-sourced-stores':{useSourcedStores:()=>({status:'ready',feed:{stores:sources,complete:true,asOf:'2026-10-14T00:00:00Z'},refresh(){}})},'@/lib/site-config':{siteConfig:()=>({name:'HOT',menus,heat:['1','2','3','4','5'],flavors:['전체'],categories:[],search:'메뉴 검색'})},'@/lib/client':{api,track(){}},'@/lib/app-embed':{appParentOrigin:()=>'',postAppEvent(){}},'@/lib/request-current-location':{locationStatusText:{}},'@/components/ui/input':{Input:'input'},'@/components/ui/button':{Button:'button'},'@/components/ui/native-select':{NativeSelect:'select'},'@/components/sourced-store-detail':{default:Detail},'@/components/sourced-store-card':{default:Card},'./kakao-map':{default:MapView}};
 const window={parent:{},addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:true})};
 const globals={AbortController,URLSearchParams,process:{env:{}},window,location:{hash:'',search:''},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),setInterval:()=>1,clearInterval(){}};
 const compile=file=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,...globals,require:name=>deps[name]||{default:()=>null}});return exports.default};
 const Explorer=compile('map-explorer.tsx'),App=compile('app-map.tsx');
 return {MapView,Detail,Card,calls,render({app=false,variant='hot',effects:runEffects=false}={}){cursor=0;const nodes=elements((app?App:Explorer)({variant}));if(runEffects){for(const effect of effects.splice(0))effect()}else effects.length=0;return nodes},runTimers(){const jobs=[...timers.values()];timers.clear();for(const job of jobs)job()},dispose(){for(const cell of cells)cell?.cleanup?.()}};
}

test('all 1424 registered franchise and independent names match exact, partial and whitespace-normalized queries',()=>{
 assert.equal(stores.length,1424);assert.equal(new Set(stores.map(s=>s.id)).size,1424);
 const snapshot=JSON.stringify(stores);
 for(const store of stores){
  const compact=store.name.replace(/\s+/gu,''),partial=Array.from(compact).slice(0,Math.max(1,Math.floor(Array.from(compact).length/2))).join('');
  for(const query of [store.name,compact,'  '+store.name.replace(/\s+/gu,'\t  ')+'  ',partial])assert.ok(groups.sourcedStoreMatches(store,{...filters,query}),`${store.name}: ${query}`);
  for(const brand of new Set(store.menus.map(menu=>menu.provenance?.brandName).filter(Boolean)))assert.ok(groups.sourcedStoreMatches(store,{...filters,query:brand}),`${store.name}: ${brand}`);
 }
 assert.equal(JSON.stringify(stores),snapshot);
});

test('actual main and embedded views find far franchise branches and independent stores without changing nearby map behavior',()=>{
 const names=['삼첩분식 합포점','삼첩분식 호매실점','신전떡볶이 조치원점','온정돈까스'];
 const queries=['삼첩 분식 합포점','호매실점 삼첩분식','삼첩분식호매실점','신전 떡볶이 조치원점','온정 돈까스'];
 assert.ok(distanceKm(origin,{lat:matching(names[0])[0].coordinates.lat,lng:matching(names[0])[0].coordinates.lon})>15);
 for(const app of [false,true]){
  const h=harness();let nodes=h.render({app});nodes.find(n=>n.type===h.MapView).props.onLocation(origin);nodes=h.render({app});
  for(const query of queries){input(nodes).props.onChange({target:{value:query}});nodes=h.render({app});const visible=nodes.find(n=>n.type===h.MapView).props.sourcedStores;
   assert.ok(visible.length,query);assert.deepEqual(visible.map(s=>s.id),matching(query).map(s=>s.id));assert.equal(new Set(visible.map(s=>s.id)).size,visible.length);
  }
  input(nodes).props.onChange({target:{value:''}});nodes=h.render({app});assert.equal(nodes.find(n=>n.type===h.MapView).props.sourcedStores.length,1424);
 }
 assert.equal(scope.mapBrowseOrigin('hot',origin),null);
 for(const variant of ['sweet','rich']){assert.strictEqual(scope.mapBrowseOrigin(variant,origin),origin);const params=new URLSearchParams();scope.appendMapBrowseLocation(params,variant,origin);assert.equal(params.get('radiusKm'),'15')}
 const code=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');assert.match(code,/map\.setLevel\(NEIGHBORHOOD_LEVEL\)/);assert.ok(NEIGHBORHOOD_LEVEL);
});

test('main HOT search keeps coordinate-less customer and owner stores in the list, never creates a pin, and preserves detail/back',()=>{
 const duplicate={...report,id:'customer-b',placeId:'reported-b'},demo={...report,id:'demo',isDemo:true};
 const h=harness({menus:[report,duplicate,owner,located,demo,{...report,id:'invalid-coordinate',lat:NaN,lng:127}],sources:[]});let nodes=h.render();
 assert.deepEqual(Array.from(nodes.find(n=>n.type===h.MapView).props.menus,m=>m.id),[located.id]);
 for(const [query,target] of [['개인 가게',report],['프랜차이즈 먼지점',owner]]){
  input(nodes).props.onChange({target:{value:query}});nodes=h.render();const map=nodes.find(n=>n.type===h.MapView),matches=map.props.menus;
  assert.ok(matches.some(m=>m.id===target.id));assert.ok(matches.every(m=>!m.isDemo&&m.id!=='invalid-coordinate'));
  assert.equal(positionedStoreGroups(groups.mapStoreGroups(matches,[])).length,0,'missing coordinates never yield invented pins');
  const cards=nodes.filter(n=>n.props?.['data-menu-id']);assert.equal(cards.length,1,'duplicate reports remain one card');cards[0].props.onClick();nodes=h.render();
  assert.equal(nodes.find(n=>n.type===h.MapView).props.selectedId,target.id);assert.ok(nodes.some(n=>n.type==='h1'&&textOf(n)===target.name));
  assert.ok(!nodes.some(n=>typeof n.props?.href==='string'&&n.props.href.startsWith('https://map.kakao.com/link/to/')));
  assert.ok(nodes.some(n=>n.type==='button'&&textOf(n).includes('내 위치 확인')));
  nodes.find(n=>n.props?.className==='explorer-back').props.onClick();nodes=h.render();assert.equal(nodes.filter(n=>n.props?.['data-menu-id']).length,1);
 }
 for(const query of ['','   ',' %(),. ']){input(nodes).props.onChange({target:{value:query}});nodes=h.render();assert.deepEqual(Array.from(nodes.find(n=>n.type===h.MapView).props.menus,m=>m.id),[located.id])}
});

test('SWEET and RICH retain coordinate-only radius browsing even while searching',()=>{
 for(const variant of ['sweet','rich']){const h=harness({menus:[report,owner,located],sources:[]});let nodes=h.render({variant});const box=nodes.find(n=>n.type==='input');box.props.onChange({target:{value:'고유한'}});nodes=h.render({variant});assert.equal(nodes.find(n=>n.type===h.MapView).props.menus.length,0)}
});

for(const replacement of ['새 가게',''])test(`a stale load-more response cannot overwrite ${replacement?'a newer search':'cleared search'} or its pagination`,async()=>{
 const h=harness({sources:[]});let nodes=h.render({effects:true});h.runTimers();h.calls[0].resolve({menus:[],hasMore:false});await tick();nodes=h.render({effects:true});
 input(nodes).props.onChange({target:{value:'가게'}});nodes=h.render({effects:true});h.runTimers();h.calls[1].resolve({menus:[located],hasMore:true});await tick();nodes=h.render({effects:true});
 more(nodes).props.onClick();const stale=h.calls[2];
 input(nodes).props.onChange({target:{value:replacement}});nodes=h.render({effects:true});h.runTimers();const current=h.calls[3],fresh={...located,id:'fresh',shop:replacement||'현재 가게'};current.resolve({menus:[fresh],hasMore:true});await tick();nodes=h.render({effects:true});
 stale.resolve({menus:[{...located,id:'stale',shop:'새 가게 오래된 응답'}],hasMore:false});await tick();nodes=h.render({effects:true});
 assert.deepEqual(Array.from(nodes.find(n=>n.type===h.MapView).props.menus,m=>m.id),['fresh']);assert.ok(more(nodes),'stale hasMore must not replace current result');
 more(nodes).props.onClick();assert.equal(new URL(h.calls[4].url,'https://example.invalid').searchParams.get('page'),'1');h.dispose();
});

test('valid same-query pages still append, repeating a page does not duplicate menu IDs, and later pages remain reachable',async()=>{
 const h=harness({sources:[]});let nodes=h.render({effects:true});h.runTimers();h.calls[0].resolve({menus:[],hasMore:false});await tick();nodes=h.render({effects:true});input(nodes).props.onChange({target:{value:'가게'}});nodes=h.render({effects:true});h.runTimers();h.calls[1].resolve({menus:[located],hasMore:true});await tick();nodes=h.render({effects:true});
 const button=more(nodes);button.props.onClick();button.props.onClick();const page={...located,id:'page-1',placeId:'reported-page-1',shop:'다음 가게'};
 h.calls[2].resolve({menus:[located,page],hasMore:true});await tick();h.calls[3].resolve({menus:[located,page],hasMore:true});await tick();nodes=h.render({effects:true});
 assert.deepEqual(Array.from(nodes.find(n=>n.type===h.MapView).props.menus,m=>m.id),[located.id,'page-1']);more(nodes).props.onClick();assert.equal(new URL(h.calls[4].url,'https://example.invalid').searchParams.get('page'),'2');h.dispose();
});


test('changing or clearing the query invalidates pages immediately, before the next passive effect runs',async()=>{
 for(const replacement of ['새 가게','']){
  const h=harness({sources:[]});let nodes=h.render({effects:true});h.runTimers();h.calls[0].resolve({menus:[located],hasMore:true});await tick();nodes=h.render({effects:true});
  input(nodes).props.onChange({target:{value:'가게'}});nodes=h.render({effects:true});h.runTimers();h.calls[1].resolve({menus:[located],hasMore:true});await tick();nodes=h.render({effects:true});more(nodes).props.onClick();const stale=h.calls[2];
  input(nodes).props.onChange({target:{value:replacement}});stale.resolve({menus:[{...located,id:'stale',shop:'새 가게 오래된 응답'}],hasMore:false});await tick();nodes=h.render({effects:true});
  assert.ok(!nodes.find(n=>n.type===h.MapView).props.menus.some(m=>m.id==='stale'));h.dispose();
 }
});
