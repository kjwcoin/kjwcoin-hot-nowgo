import {applyReviewedCorrections,correctedRows} from '../lib/reviewed-source-corrections.ts';
import * as menuSearch from '../lib/menu-search.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as runtime from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {readonlySourceStoreFeed} from '../lib/readonly-source-listings.ts';
import * as groups from '../lib/map-sourced-stores.ts';
import * as identities from '../lib/menu-store-groups.ts';
import * as scope from '../lib/map-browse-scope.ts';
import * as catalog from '../lib/map-menu-catalog.ts';
import * as korean from '../lib/korean-region.ts';
import {hookHarness,elements,textOf} from './helpers/source-ui-components.mjs';

import priorRegionalRows from '../data/hot-regional-source-records.json' with {type:'json'};
import sejongRows from '../data/hot-sejong-eight-source-records.json' with {type:'json'};
import nextSejongRows from '../data/hot-sejong-next30-source-records.json' with {type:'json'};
import next64Rows from '../data/hot-sejong-next64-source-records.json' with {type:'json'};
import next47Rows from '../data/hot-sejong-next47-source-records.json' with {type:'json'};
import next38Rows from '../data/hot-sejong-next38-source-records.json' with {type:'json'};
import busan23Rows from '../data/hot-busan-archive23-source-records.json' with {type:'json'};
import final13Rows from '../data/hot-sejong-final13-source-records.json' with {type:'json'};
import route7BusanRows from '../data/hot-route7-busan2-records.json' with {type:'json'};
import route7Busan8Rows from '../data/hot-route7-busan8-records.json' with {type:'json'};
import route7UlsanRows from '../data/hot-route7-ulsan1-records.json' with {type:'json'};
import gangwonRows from '../data/hot-gangwon7-records.json' with {type:'json'};
import jeonnamRows from '../data/hot-jeonnam5-records.json' with {type:'json'};
import inlandRows from '../data/hot-gangwon-inland8-records.json' with {type:'json'};
import countiesRows from '../data/hot-jeonnam-counties3-records.json' with {type:'json'};
import nextCountiesRows from '../data/hot-jeonnam-nextcounties5-records.json' with {type:'json'};
import chungbukRows from '../data/hot-chungbuk9-records.json' with {type:'json'};
import gwmRows from '../data/hot-jeonnam-gwm3-records.json' with {type:'json'};
import chungnamRows from '../data/hot-chungnam7-records.json' with {type:'json'};
import finalJeonnamRows from '../data/hot-jeonnam-final6-records.json' with {type:'json'};
import jeonbukRows from '../data/hot-jeonbuk9-records.json' with {type:'json'};
import gyeongbukRows from '../data/hot-gyeongbuk12-records.json' with {type:'json'};
import gyeongnamRows from '../data/hot-gyeongnam6-records.json' with {type:'json'};
import daejeonRows from '../data/hot-daejeon4-records.json' with {type:'json'};
import ulsanRows from '../data/hot-ulsan4-records.json' with {type:'json'};
import wehalmaeRows from '../data/hot-wehalmae8-records.json' with {type:'json'};
import nextWehalmaeRows from '../data/hot-wehalmae38-records.json' with {type:'json'};
import youngRows from '../data/hot-young-jangsu1-records.json' with {type:'json'};
import nextYoungRows from '../data/hot-young151-records.json' with {type:'json'};
import zipsinRows from '../data/hot-zipsin8-records.json' with {type:'json'};
import sungwangRows from '../data/hot-sungwang1-records.json' with {type:'json'};
const regionalRows=applyReviewedCorrections([...priorRegionalRows,...sejongRows,...nextSejongRows,...next64Rows,...next47Rows,...next38Rows,...busan23Rows,...final13Rows,...route7BusanRows,...route7Busan8Rows,...route7UlsanRows,...gangwonRows,...jeonnamRows,...inlandRows,...countiesRows,...nextCountiesRows,...chungbukRows,...gwmRows,...chungnamRows,...finalJeonnamRows,...jeonbukRows,...gyeongbukRows,...gyeongnamRows,...daejeonRows,...ulsanRows,...wehalmaeRows,...nextWehalmaeRows,...youngRows,...nextYoungRows,...zipsinRows,...sungwangRows],correctedRows);
const expectedCount=785+regionalRows.length;
const stores=readonlySourceStoreFeed().stores;
const onjeong=stores.find(store=>store.id==='65a5768f-5c9e-563e-a04f-cbb81835ec02');
const filters={query:'',heat:0,flavor:'전체',category:'전체',budget:0};
const matches=(store,query)=>groups.sourcedStoreMatches(store,{...filters,query});

test('store/menu search retains all reviewed menu-bearing source identities',()=>{
 assert.equal(stores.length,expectedCount);assert.equal(new Set(stores.map(s=>s.id)).size,expectedCount);
 assert.ok(stores.every(store=>store.menus.length));
 for(const query of ['', '   ', '  ·  '])assert.equal(stores.filter(s=>matches(s,query)).length,expectedCount);
});

test('approved store aliases, menu variants, spacing and cross-field words match in either order',()=>{
 assert.ok(onjeong);
 for(const query of ['온정돈까스','온정 돈까스','온 정 돈 까스','디진다 돈가스','디진다돈가스','디진다 돈까스','디진다돈까스','온정돈까스 디진다','디진다 온정돈까스','온정 돈까스 디진다 돈가스','신대방 온정돈까스 디진다']){
  assert.ok(matches(onjeong,query),query);
 }
 assert.equal(matches(onjeong,'온정돈까스 존재하지않는메뉴'),false);
 assert.equal(matches(onjeong,'디진다 부산'),false);
 const snapshot=JSON.stringify(onjeong);matches(onjeong,'온정돈까스 디진다');assert.equal(JSON.stringify(onjeong),snapshot);
 const latin={...onjeong,name:'ABC 치킨',menus:[],sourceRef:'unreviewed-fixture'};
 assert.ok(matches(latin,'ａｂｃ 치킨'));assert.ok(matches(latin,'치킨 abc'));
});

test('withdrawn menu aliases and unverified heat/price/category never become searchable facts',()=>{
 assert.equal(matches({...onjeong,menus:[]},'온정돈까스 디진다'),false);
 assert.equal(matches({...onjeong,sourceRef:'different-source',name:'다른매장',menus:[]},'온정돈까스'),false);
 for(const condition of [{heat:3},{budget:10000},{flavor:'칼칼한'},{category:'분식'}])assert.equal(groups.sourcedStoreMatches(onjeong,{...filters,...condition,query:'온정돈까스'}),false);
 const point={lat:37.5364745896207,lng:126.643696685757};
 assert.equal(groups.sourcedStoresNearby(stores,scope.mapBrowseOrigin('hot',point)).length,expectedCount);
 assert.ok(groups.sourcedStoresNearby(stores,scope.mapBrowseOrigin('sweet',point)).length<expectedCount);
 const params=new URLSearchParams();scope.appendMapBrowseLocation(params,'sweet',point);assert.equal(params.get('radiusKm'),'15');
});

// Execute the real components and real source matcher. Ancillary UI/remote API
// components are inert so these interaction regressions perform no live writes.
function ui(h){
 const Map=()=>null,Detail=()=>null;
 const deps={'@/lib/menu-search':menuSearch,
  react:h.react,'react/jsx-runtime':runtime,'lucide-react':icons,
  '@/lib/map-sourced-stores':groups,'@/lib/menu-store-groups':identities,
  '@/lib/map-browse-scope':scope,'@/lib/map-menu-catalog':catalog,'@/lib/korean-region':korean,
  '@/lib/menus':{money:value=>value+'원'},
  '@/hooks/use-sourced-stores':{useSourcedStores:()=>({status:'ready',feed:{stores,complete:true,asOf:'2026-10-13T00:00:00Z'},refresh(){}})},
  '@/lib/site-config':{siteConfig:()=>({name:'HOT',menus:[],heat:['1','2','3','4','5'],flavors:['전체'],categories:[],search:'매장·메뉴 검색'})},
  '@/lib/client':{api:async()=>({menus:[],hasMore:false}),track(){}},
  '@/lib/app-embed':{appParentOrigin:()=>'',postAppEvent(){}},
  '@/lib/request-current-location':{locationStatusText:{}},
  '@/components/ui/input':{Input:'input'},'@/components/ui/button':{Button:'button'},'@/components/ui/native-select':{NativeSelect:'select'},
  '@/components/sourced-store-detail':{default:Detail},'./kakao-map':{default:Map},
 };
 const compile=path=>{
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URLSearchParams,window:{matchMedia:()=>({matches:true})},require:name=>deps[name]||{default:()=>null}});
  return exports.default;
 };
 return {Explorer:compile('map-explorer.tsx'),App:compile('app-map.tsx'),Map,Detail};
}
function explorer(h,components,props={}){return elements(h.render(()=>components.Explorer({variant:'hot',...props})));}
const search=nodes=>nodes.find(node=>node.props?.['aria-label']==='지역명·상호명·매운 메뉴 검색');
const sheet=nodes=>nodes.find(node=>node.type==='aside'&&node.props?.['aria-label']==='검색된 메뉴');

test('typing opens actual main results, editing leaves detail, clearing restores all reviewed stores without GPS',()=>{
 const h=hookHarness(),components=ui(h);let nodes=explorer(h,components);
 assert.match(sheet(nodes).props.className,/collapsed/);
 search(nodes).props.onChange({target:{value:'온정돈까스 디진다'}});nodes=explorer(h,components);
 assert.match(sheet(nodes).props.className,/expanded/);assert.ok(nodes.some(node=>node.props?.id==='map-results'));
 assert.deepEqual(nodes.find(node=>node.type===components.Map).props.sourcedStores.map(s=>s.id),[onjeong.id]);
 assert.equal(nodes.find(node=>node.type===components.Map).props.initialCenter,undefined);
 nodes.find(node=>node.type===components.Map).props.onSourceSelect(onjeong,onjeong.menus[0].id);nodes=explorer(h,components);
 assert.ok(nodes.some(node=>node.type===components.Detail));
 search(nodes).props.onChange({target:{value:'디진다'}});nodes=explorer(h,components);
 assert.ok(!nodes.some(node=>node.type===components.Detail));
 assert.equal(nodes.find(node=>node.type===components.Map).props.selectedSourceId,undefined);
 nodes.find(node=>node.props?.['aria-label']==='검색어 지우기').props.onClick();nodes=explorer(h,components);
 assert.equal(nodes.find(node=>node.type===components.Map).props.sourcedStores.length,expectedCount);
 assert.match(sheet(nodes).props.className,/expanded/);
});

test('main sheet can stay closed with an unchanged query; whitespace/clearing does not reopen it',()=>{
 const h=hookHarness(),components=ui(h);let nodes=explorer(h,components);
 search(nodes).props.onChange({target:{value:'온정돈까스'}});nodes=explorer(h,components);
 const header=nodes.find(node=>node.props?.className==='explorer-results-header');
 header.props.onTouchStart({touches:[{clientY:0}]});header.props.onTouchMove({touches:[{clientY:100}]});header.props.onTouchEnd();nodes=explorer(h,components);
 assert.match(sheet(nodes).props.className,/collapsed/);
 nodes=explorer(h,components);assert.match(sheet(nodes).props.className,/collapsed/);
 search(nodes).props.onChange({target:{value:'  '}});nodes=explorer(h,components);assert.match(sheet(nodes).props.className,/collapsed/);
 search(nodes).props.onChange({target:{value:'없는가게123'}});nodes=explorer(h,components);
 assert.match(sheet(nodes).props.className,/expanded/);assert.equal(nodes.find(node=>node.type===components.Map).props.sourcedStores.length,0);
});

test('actual embedded search opens results and honors explicit close until a new nonempty edit',()=>{
 const h=hookHarness(),components=ui(h),render=()=>elements(h.render(()=>components.App({variant:'hot'})));
 let nodes=render();const input=()=>nodes.find(node=>node.props?.['aria-label']==='지역명·상호명·매운 메뉴 검색');
 const toggle=()=>nodes.find(node=>node.props?.['aria-controls']==='app-map-results-list');
 assert.equal(toggle().props['aria-expanded'],false);
 input().props.onChange({target:{value:'온정돈까스 디진다 돈까스'}});nodes=render();
 assert.equal(toggle().props['aria-expanded'],true);assert.ok(nodes.some(node=>node.props?.id==='app-map-results-list'));
 assert.deepEqual(nodes.find(node=>node.type===components.Map).props.sourcedStores.map(s=>s.id),[onjeong.id]);
 toggle().props.onClick();nodes=render();assert.equal(toggle().props['aria-expanded'],false);
 nodes=render();assert.equal(toggle().props['aria-expanded'],false);
 input().props.onChange({target:{value:''}});nodes=render();assert.equal(toggle().props['aria-expanded'],false);
 assert.equal(nodes.find(node=>node.type===components.Map).props.sourcedStores.length,expectedCount);
 input().props.onChange({target:{value:'디진다'}});nodes=render();assert.equal(toggle().props['aria-expanded'],true);
});

test('main results explain excessive meaningful query terms instead of showing broad matches',()=>{
 const h=hookHarness(),components=ui(h);let nodes=explorer(h,components);
 for(const [query,message] of [['가 나 다 라 마 바 사 아 자','8개 단어'],['가'.repeat(61),'60자']]){
  search(nodes).props.onChange({target:{value:query}});nodes=explorer(h,components);
  assert.equal(nodes.find(node=>node.type===components.Map).props.sourcedStores.length,0);assert.ok(nodes.map(textOf).join(' ').includes(message));
 }
});

test('new regional names and menus participate in the existing full search path',()=>{for(const row of regionalRows){const store=stores.find(s=>s.id===row.id);assert.ok(store);for(const query of [row.name,row.source_metadata.menus[0].name])assert.ok(matches(store,query));for(const condition of [{heat:3},{budget:10000}])assert.equal(groups.sourcedStoreMatches(store,{...filters,...condition}),false)}});
