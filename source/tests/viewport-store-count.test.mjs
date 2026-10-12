import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {storeIdentity,menuStoreGroups} from '../lib/menu-store-groups.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
import * as storeIdentityModule from '../lib/store-identity.ts';
import {sourcedStoreMatches} from '../lib/map-sourced-stores.ts';
import {sourceStore,sixSources} from './fixtures/sourced-stores.mjs';
import * as menus from '../lib/menus.ts';

const source=fs.readFileSync(new URL('../lib/viewport-store-count.ts',import.meta.url),'utf8');
const bounds={south:37,north:38,west:126,east:128};
const params=(extra='')=>new URLSearchParams('south=37&north=38&west=126&east=128'+(extra?'&'+extra:''));
const row=(n,extra={})=>({id:String(n).padStart(8,'0'),place_id:'reported-'+n,owner_store_id:null,shop:'가게 '+n,address:'서울 중구 길 '+n,lat:37.56,lng:127,...extra});
const plain=value=>JSON.parse(JSON.stringify(value));

function load({ready=true,sourceFeed=async()=>({stores:[],complete:true}),pages=async()=>({data:[],error:null})}={}){
 const exports={},calls=[];
 const dependencies={
  './store-identity.ts':storeIdentityModule,'./map-sourced-stores.ts':{sourcedStoreMatches},'./sourced-store-feed.ts':{readSourcedStoreFeed:sourceFeed},'./korean-region.ts':{isKoreanCoordinate},
  './site-config':{siteConfig(variant){return {tables:{menus:'ng_map_'+variant+'_menu_catalog'},flavors:variant==='sweet'?menus.SWEET_FLAVORS:variant==='rich'?menus.RICH_FLAVORS:menus.FLAVORS,categories:variant==='sweet'?menus.SWEET_MENU_CATEGORIES:variant==='rich'?menus.RICH_MENU_CATEGORIES:menus.MENU_CATEGORIES}}},
  './supabase':{publicConfig:()=>({ready}),publicDb(...args){assert.equal(args.length,0,'No user token or elevated credential is needed');return {from(table){const operations=[['from',table]];const builder={};for(const name of ['select','gte','lte','or','eq','gt','order','limit','abortSignal'])builder[name]=(...args)=>{operations.push([name,...args]);return builder};builder.then=(resolve,reject)=>{calls.push(operations);return Promise.resolve().then(()=>pages(operations,calls.length)).then(resolve,reject)};return builder}}}},
 };
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URLSearchParams,AbortController,setTimeout,clearTimeout,require(name){assert.ok(name in dependencies,'Unexpected dependency: '+name);return dependencies[name]}});
 return {...exports,calls};
}

test('bounds and active filters are bounded, normalized, and variant-aware',()=>{
 const api=load(),input=api.parseViewportCountParams(params('q=서울%20닭발!&heat=3&flavor=칼칼한&category=닭발&budget=15000'));
 assert.deepEqual(plain(input),{bounds,query:'서울 닭발',heat:3,flavor:'칼칼한',category:'닭발',budget:15000});
 assert.equal(api.parseViewportCountParams(params('flavor=전체&category=전체&heat=0&budget=0')).flavor,'');
 assert.equal(api.parseViewportCountParams(params('category=케이크&flavor=프루티한'),'sweet').category,'케이크');
 assert.throws(()=>api.parseViewportCountParams(params('category=케이크'),'hot'),api.InvalidViewportCountQuery);
 for(const q of ['south=&north=38&west=126&east=128','south=NaN&north=38&west=126&east=128','south=-91&north=38&west=126&east=128','south=38&north=37&west=126&east=128','south=37&north=38&west=128&east=126','south=37&north=38&west=126&east=181','south=37&north=37&west=126&east=128'])assert.throws(()=>api.parseViewportCountParams(new URLSearchParams(q)),api.InvalidViewportCountQuery);
 for(const extra of ['south=36','q=a&q=b','heat=6','heat=-1','heat=1.5','heat=1e0','budget=99','budget=1000001','flavor=unknown','category=unknown','q='+'가'.repeat(121)])assert.throws(()=>api.parseViewportCountParams(params(extra)),api.InvalidViewportCountQuery,extra);
});

test('text filter strips PostgREST syntax exactly like communityMenus',()=>{
 const api=load(),input=api.parseViewportCountParams(params('q='+encodeURIComponent('서울%,address.not.is.null( )')));
 assert.equal(input.query,'서울addressnotisnull');
 assert.equal(api.parseViewportCountParams(params('q='+'가'.repeat(70))).query.length,60);
});

test('identity-only dedup matches canonical menu grouping across owner, text, and place cases',()=>{
 const api=load();
 const rows=[row(1),row(2,{shop:'가게1',address:'서울중구길1',place_id:'naver-2'}),row(3,{shop:'가게1',address:'서울중구길1',owner_store_id:'owner-a'}),row(4,{shop:'가게4',address:'서울중구길4',owner_store_id:'owner-a'}),row(5,{address:''}),row(6,{address:'',place_id:'reported-5'}),row(7,{shop:'가게7',address:'서울중구길7',owner_store_id:'owner-b'}),row(8,{shop:'가게7',address:'서울중구길7',owner_store_id:'owner-c'}),row(9,{shop:'가게7',address:'서울중구길7'})];
 const canonical=menuStoreGroups(rows.map(item=>({...item,placeId:item.place_id,ownerStoreId:item.owner_store_id,area:item.address,isDemo:false})));
 assert.equal(api.countViewportStores(rows,bounds),canonical.length);
 assert.equal(api.countViewportStores(rows,bounds),5);
 assert.equal(api.countViewportStores([row(1),row(1)],bounds),1);
 assert.equal(api.countViewportStores([row(1),row(2,{shop:'가게1',address:'부산 중구 길1'})],bounds),2);
});

test('NFKC name/address normalization and authoritative-owner conflicts are preserved',()=>{
 const api=load(),a=row(1,{shop:' ＡＢＣ ',address:'서울 중구 １'}),b=row(2,{shop:'abc',address:'서울중구1'});
 assert.equal(api.countViewportStores([a,b],bounds),1);
 assert.equal(api.countViewportStores([a,{...b,owner_store_id:'a'},{...b,id:'00000003',owner_store_id:'b'}],bounds),3);
});

test('only real rows with valid coordinates inside inclusive viewport boundaries count',()=>{
 const api=load(),good=row(1);
 const bad=[{id:'demo-1'},{place_id:'fixture-1'},{place_id:'test-store'},{shop:' 나우고 '},{shop:'나우고 카페'},{shop:'Rollback fixture'},{shop:'Operations regression fixture'},{lat:null},{lng:null},{lat:Infinity},{lat:'37.5'},{lng:0},{lat:36.99},{lng:128.001},{lat:0,lng:0}].map((extra,index)=>row(index+10,extra));
 assert.equal(api.countViewportStores([good,...bad],bounds),1);
 assert.equal(api.countViewportStores([row(1,{lat:37,lng:126}),row(2,{lat:38,lng:128})],bounds),2);
 assert.equal(api.countViewportStores([row(1,{lat:40,lng:127})],{south:-90,north:90,west:-180,east:180}),0);
});

test('scan traverses more than 100 and 1000 rows, with exact unique stores across pages',async()=>{
 const api=load(),rows=Array.from({length:1203},(_,i)=>row(i+1,{shop:'가게 '+(i%601),address:'서울 길 '+(i%601)}));
 const calls=[];
 const result=await api.scanViewportStoreCount(({afterId,limit,signal})=>{calls.push({afterId,limit,signal});return Promise.resolve({data:rows.filter(x=>!afterId||x.id>afterId).slice(0,limit),error:null})},bounds);
 assert.deepEqual(plain(result),{count:601,complete:true,scope:'viewport',isMinimum:false,scannedRows:1203,limit:5000});
 assert.deepEqual(calls.map(x=>x.afterId),[null,'00000500','00001000','00001203']);
 assert.ok(calls.every(call=>call.signal instanceof AbortSignal&&call.limit===500));
});

test('short server pages are not mistaken for end-of-catalog',async()=>{
 const api=load(),rows=Array.from({length:250},(_,i)=>row(i+1));let calls=0;
 const result=await api.scanViewportStoreCount(({afterId,limit})=>{calls++;return Promise.resolve({data:rows.filter(x=>!afterId||x.id>afterId).slice(0,Math.min(limit,100)),error:null})},bounds);
 assert.equal(result.count,250);assert.equal(result.complete,true);assert.equal(calls,4);
});

test('empty catalog is an explicit complete zero; null payload is an unavailable result',async()=>{
 const api=load();assert.equal((await api.scanViewportStoreCount(async()=>({data:[],error:null}),bounds)).count,0);
 await assert.rejects(api.scanViewportStoreCount(async()=>({data:null,error:null}),bounds),api.ViewportCountUnavailable);
});

test('row cap is a true conservative minimum even when later owner links would merge identities',async()=>{
 const api=load(),rows=[row(1),row(2),row(3,{shop:'가게 1',address:'서울 중구 길 1',owner_store_id:'same-owner'}),row(4,{shop:'가게 2',address:'서울 중구 길 2',owner_store_id:'same-owner'})];
 const read=async({afterId,limit})=>({data:rows.filter(x=>!afterId||x.id>afterId).slice(0,limit),error:null});
 const limited=await api.scanViewportStoreCount(read,bounds,{maxRows:2,pageSize:2});
 const full=await api.scanViewportStoreCount(read,bounds);
 assert.equal(limited.complete,false);assert.equal(limited.isMinimum,true);assert.equal(limited.reason,'scan_limit');assert.equal(limited.scannedRows,2);assert.equal(limited.count,1);assert.equal(full.count,1);
 assert.ok(limited.count<=full.count);
});

test('incomplete lower bound retains proven owners, ambiguous identities, and fallback place groups',()=>{
 const api=load(),rows=[row(1,{owner_store_id:'a'}),row(2,{shop:'가게 1',address:'서울 중구 길 1',owner_store_id:'b'}),row(3,{shop:'가게 1',address:'서울 중구 길 1'}),row(4,{address:''}),row(5)];
 assert.equal(api.countViewportStores(rows,bounds,false),4);assert.equal(api.countViewportStores(rows,bounds,true),5);
});

test('one-row lookahead verifies an exact cap and bounded page budget stops small-page loops',async()=>{
 const api=load(),rows=[row(1),row(2)];let calls=0;
 const exact=await api.scanViewportStoreCount(async({afterId,limit})=>{calls++;return {data:rows.filter(x=>!afterId||x.id>afterId).slice(0,limit),error:null}},bounds,{maxRows:2,pageSize:2});
 assert.equal(exact.complete,true);assert.equal(exact.count,2);assert.equal(calls,2);
 const pageCap=await api.scanViewportStoreCount(async({afterId})=>({data:[row(afterId?Number(afterId)+1:1)],error:null}),bounds,{maxPages:2});
 assert.equal(pageCap.complete,false);assert.equal(pageCap.scannedRows,2);
});

test('network failures and non-advancing pagination never become a partial/zero success',async()=>{
 const api=load();
 await assert.rejects(api.scanViewportStoreCount(async()=>({data:null,error:Error('offline')}),bounds),api.ViewportCountUnavailable);
 await assert.rejects(api.scanViewportStoreCount(async()=>{throw Error('offline')},bounds));
 let calls=0;await assert.rejects(api.scanViewportStoreCount(async()=>({data:[row(1)],error:++calls===2?Error('second page failed'):null}),bounds),api.ViewportCountUnavailable);
 await assert.rejects(api.scanViewportStoreCount(async()=>({data:[row(1)],error:null}),bounds),api.ViewportCountUnavailable);
 await assert.rejects(api.scanViewportStoreCount(async()=>({data:[row(2),row(1)],error:null}),bounds),api.ViewportCountUnavailable);
});

test('timeout and caller cancellation abort upstream work, including a stalled reader',async()=>{
 const api=load();let signal;
 await assert.rejects(api.scanViewportStoreCount(request=>{signal=request.signal;return new Promise(()=>{})},bounds,{timeoutMs:10}),api.ViewportCountUnavailable);
 assert.equal(signal.aborted,true);
 const controller=new AbortController();let calls=0;
 const pending=api.scanViewportStoreCount(request=>{calls++;signal=request.signal;return new Promise(()=>{})},bounds,{signal:controller.signal});
 controller.abort();await assert.rejects(pending,api.ViewportCountUnavailable);assert.equal(signal.aborted,true);assert.equal(calls,1);
 await assert.rejects(api.scanViewportStoreCount(async()=>{calls++;return {data:[],error:null}},bounds,{signal:controller.signal}),api.ViewportCountUnavailable);assert.equal(calls,1);
});

test('public query uses only existing catalog identity fields, geo/filter predicates, and ascending keyset',async()=>{
 const api=load({pages:async(ops,number)=>({data:number===1?[row(1)]:[],error:null})});
 const input=api.parseViewportCountParams(params('q=닭발&heat=3&flavor=칼칼한&category=닭발&budget=15000'));
 const result=await api.viewportStoreCount(input,'hot');assert.equal(result.count,1);
 const first=api.calls[0];
 assert.deepEqual(first.find(x=>x[0]==='from'),['from','ng_map_hot_menu_catalog']);
 assert.deepEqual(first.find(x=>x[0]==='select'),['select','id,place_id,owner_store_id,shop,address,lat,lng']);
 for(const op of [['gte','lat',37],['lte','lat',38],['gte','lng',126],['lte','lng',128],['eq','heat',3],['eq','flavor','칼칼한'],['eq','category','닭발'],['lte','price',15000],['order','id',{ascending:true}],['limit',500]])assert.ok(first.some(x=>JSON.stringify(x)===JSON.stringify(op)),JSON.stringify(op));
 assert.equal(first.find(x=>x[0]==='or')[1],'menu.ilike.%닭발%,shop.ilike.%닭발%,address.ilike.%닭발%');
 assert.deepEqual(api.calls[1].find(x=>x[0]==='gt'),['gt','id','00000001']);
 assert.equal(first.find(x=>x[0]==='abortSignal')[1] instanceof AbortSignal,true);
 await api.viewportStoreCount(input,'hot');assert.equal(api.calls.length,2,'Repeated exact viewport uses bounded short-lived cache');
});

test('variant scope cannot leak through cache and out-of-country viewport avoids any scan',async()=>{
 const api=load();const input=api.parseViewportCountParams(params());
 for(const variant of ['hot','sweet','rich'])await api.viewportStoreCount(input,variant);
 assert.deepEqual(api.calls.map(c=>c[0][1]),['ng_map_hot_menu_catalog','ng_map_sweet_menu_catalog','ng_map_rich_menu_catalog']);
 const outside=api.parseViewportCountParams(new URLSearchParams('south=1&north=2&west=3&east=4'));
 assert.equal((await api.viewportStoreCount(outside)).count,0);assert.equal(api.calls.length,3);
 await assert.rejects(load({ready:false}).viewportStoreCount(input),/not configured/);
});

test('country clamp constrains a world viewport and failed reads are never cached',async()=>{
 const api=load({pages:async()=>({data:null,error:Error('offline')})});
 const input=api.parseViewportCountParams(new URLSearchParams('south=-90&north=90&west=-180&east=180'));
 for(let attempt=0;attempt<2;attempt++)await assert.rejects(api.viewportStoreCount(input));
 assert.equal(api.calls.length,2);
 for(const op of [['gte','lat',32.5],['lte','lat',39],['gte','lng',124],['lte','lng',132]])assert.ok(api.calls[0].some(x=>JSON.stringify(x)===JSON.stringify(op)));
});

test('six sources add unique bounded stores without invented catalog rows and canonical duplicates count once',()=>{
 const api=load();assert.equal(api.countViewportStores([],bounds,true,sixSources),6);
 const s=sixSources[0],matched=row(1,{place_id:'nowgo-'+s.id,shop:'다른 표기',address:'다른 주소'});
 assert.equal(api.countViewportStores([matched],bounds,true,sixSources),6);
 assert.equal(api.countViewportStores([row(1,{shop:s.name,address:s.address})],bounds,true,sixSources),6);
 assert.equal(api.countViewportStores([row(1,{shop:s.name,address:s.address,place_id:'nowgo-distinct'})],bounds,true,sixSources),7);
 assert.equal(api.countViewportStores([],bounds,true,[sourceStore(1,{coordinates:null}),sourceStore(2,{coordinates:{lat:35,lon:127}})]),0);
});
test('source name heuristics never suppress a real source identity',()=>{
 const api=load();for(const name of ['나우고','나우고 카페','Rollback fixture'])assert.equal(api.countViewportStores([],bounds,true,[sourceStore(1,{name})]),1);
});
test('two explicit canonical IDs at same full address never merge or claim legacy reports',()=>{
 const api=load(),a=sourceStore(),b=sourceStore(2,{name:a.name,address:a.address});
 assert.equal(api.countViewportStores([row(1,{shop:a.name,address:a.address})],bounds,true,[a,b]),3);
 assert.equal(api.countViewportStores([row(1,{shop:a.name,address:a.address,place_id:'nowgo-'+a.id})],bounds,true,[a,b]),2);
});
test('viewport applies source keywords and excludes unknown sources under factual filters',async()=>{
 for(const extra of ['', 'q=매운%20닭발', 'q=서울특별시']){const api=load({sourceFeed:async()=>({stores:sixSources,complete:true})});assert.equal((await api.viewportStoreCount(api.parseViewportCountParams(params(extra)))).count,6)}
 for(const extra of ['heat=3','budget=15000','flavor=칼칼한','category=닭발','q=없음']){const api=load({sourceFeed:async()=>({stores:sixSources,complete:true})});assert.equal((await api.viewportStoreCount(api.parseViewportCountParams(params(extra)))).count,0)}
});
test('feed failure cannot quietly become a catalog-only complete count, including retries',async()=>{
 let reads=0;const api=load({sourceFeed:async()=>{reads++;throw Error('source unavailable')},pages:async(ops,n)=>({data:n%2?[row(1)]:[],error:null})});
 for(let n=0;n<2;n++)await assert.rejects(api.viewportStoreCount(api.parseViewportCountParams(params())),/source unavailable/);
 assert.equal(reads,2);
});
test('partial source feed returns conservative minimum, is not cached, and source rows remain distinct',async()=>{
 let reads=0;const api=load({sourceFeed:async()=>{reads++;return {stores:sixSources,complete:false}}});
 for(let n=0;n<2;n++){const result=await api.viewportStoreCount(api.parseViewportCountParams(params()));assert.equal(result.count,6);assert.equal(result.complete,false);assert.equal(result.isMinimum,true);assert.equal(result.reason,'source_partial')}
 assert.equal(reads,2);
});
test('source coordinates beyond catalog latitude ceiling still count within actual viewport',async()=>{
 const api=load({sourceFeed:async()=>({stores:[sourceStore(1,{coordinates:{lat:39.3,lon:127}})],complete:true})});
 const input=api.parseViewportCountParams(new URLSearchParams('south=39.1&north=39.5&west=126&east=128'));
 assert.equal((await api.viewportStoreCount(input)).count,1);assert.equal(api.calls.length,0);
});
