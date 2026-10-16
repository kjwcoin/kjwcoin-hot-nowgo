// Ready-path unit cases inject an isolated future-phase mock; real phase-one defaults are tested separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as phase from '../lib/hot-reporting-phase.ts';
import * as heat from '../lib/hot-menu-heat.ts';
import {createMenuHeatLoader} from '../lib/menu-heat-client.ts';
import {menuHeatAttribution} from '../lib/menu-heat-attribution.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';
const source=sourceStore(),storeId=source.id,menuIds=[source.menus[0].id,source.sourceRef+':menu:2'];
const ready=(h=2.5,n=2)=>({state:'ready',coverage:'canonical_selected_reports_only',scale:7,summaries:menuIds.map((menuId,index)=>({storeId,menuId,medianHeat:index?4:h,sampleCount:index?3:n}))});
const query=()=>{const p=new URLSearchParams({storeId});menuIds.forEach(id=>p.append('menuId',id));return p};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('query bounds enforce one store, at most 50 repeated canonical menu IDs, and known parameters',()=>{
 assert.deepEqual(heat.parseMenuHeatQuery(query()),{storeId,menuIds});
 const duplicate=query();duplicate.append('menuId',menuIds[0]);assert.deepEqual(heat.parseMenuHeatQuery(duplicate).menuIds,menuIds);
 const owned=new URLSearchParams({storeId,menuId:'00000000-0000-4000-8000-000000000002'});assert.equal(heat.parseMenuHeatQuery(owned).menuIds.length,1);
 for(const bad of [new URLSearchParams(),new URLSearchParams({storeId}),new URLSearchParams({storeId,menuId:'reported-123'}),new URLSearchParams({storeId,menuId:'https://evil.test'}),new URLSearchParams({storeId:'bad',menuId:menuIds[0]})])assert.throws(()=>heat.parseMenuHeatQuery(bad),heat.InvalidMenuHeatQuery);
 const tooMany=new URLSearchParams({storeId});for(let n=0;n<51;n++)tooMany.append('menuId',menuIds[0]);assert.throws(()=>heat.parseMenuHeatQuery(tooMany));
 const extra=query();extra.append('storeId',storeId);assert.throws(()=>heat.parseMenuHeatQuery(extra));
 const unknown=query();unknown.set('ownerRequestCount','20');assert.throws(()=>heat.parseMenuHeatQuery(unknown));
 const huge=query();huge.set('menuId','a'.repeat(9000));assert.throws(()=>heat.parseMenuHeatQuery(huge));
});
test('canonical parser preserves fractional median and per-dish sample counts without blending',()=>{
 assert.deepEqual(heat.parsePublicMenuHeat(ready(),storeId,menuIds),ready().summaries);
 const output=heat.parsePublicMenuHeat({...ready(),privateReports:[{phone:'private'}],summaries:ready().summaries.map(r=>({...r,ownerRequestCount:1000,userId:'private'}))},storeId,menuIds);
 assert.equal(output[0].medianHeat,2.5);assert.equal(output[0].sampleCount,2);assert.equal(output[1].medianHeat,4);assert.equal(output[0].ownerRequestCount,undefined);assert.equal(output[0].userId,undefined);
 assert.deepEqual(heat.medianPepperFills(2.5),[1,1,.5,0,0,0,0]);assert.deepEqual(heat.medianPepperFills(7),[1,1,1,1,1,1,1]);
 for(const value of [null,0,7.5,2.25,NaN,Infinity])assert.throws(()=>heat.medianPepperFills(value));
});
test('only explicitly complete canonical responses can display a confirmed zero count',()=>{
 const zero=ready(null,0);assert.equal(heat.parsePublicMenuHeat(zero,storeId,menuIds)[0].medianHeat,null);
 assert.equal(heat.parsePublicMenuHeat({state:'pending',scale:7,summaries:[]},storeId,menuIds),null);
 for(const data of [{...ready(),coverage:'all_reports'},{...ready(),scale:10},{...ready(),summaries:[]},{...ready(),summaries:[ready().summaries[0],ready().summaries[0]]},{state:'pending',scale:7,summaries:ready().summaries},{...ready(),summaries:ready().summaries.map(r=>({...r,storeId:'other'}))}])assert.throws(()=>heat.parsePublicMenuHeat(data,storeId,menuIds));
 for(const [medianHeat,sampleCount] of [[0,1],[2.25,2],[8,3],[null,3],[2,0],[2,-1],[2,1.5],[2,Infinity],[2,'2']])assert.throws(()=>heat.parsePublicMenuHeat(ready(medianHeat,sampleCount),storeId,menuIds));
});
test('source heat metadata stays unknown and legacy declarations explicitly remain unaggregated',()=>{
 assert.equal(source.menus[0].heat,null);
 assert.equal(menuHeatAttribution({heat:3,isDemo:false,verifiedOwner:false}),'개별 제보 맵기 3/7 · 메뉴별 중앙값 미집계');
 assert.equal(menuHeatAttribution({heat:4,isDemo:false,verifiedOwner:true}),'점주 안내 맵기 4/7 · 메뉴별 중앙값 미집계');
 assert.match(menuHeatAttribution({heat:2,isDemo:true}),/예시 맵기 2\/7 · 소비자 중앙값 아님/);
 assert.equal(menuHeatAttribution({heat:0,isDemo:false}),'맵기 미확인 · 메뉴별 중앙값 미집계');
 for(const component of ['map-explorer','app-map','hot-app','kakao-map'])assert.match(fs.readFileSync(new URL('../components/'+component+'.tsx',import.meta.url),'utf8'),/menuHeatAttribution/);
 assert.doesNotMatch(fs.readFileSync(new URL('../components/consumer-menu-heat.tsx',import.meta.url),'utf8'),/menuStoreGroups|\.price|menus\.reduce|reportCount/);
});
test('pending, missing and forged enabled reporting state never fetch a median or invent zero',async()=>{
 for(const reportingState of [undefined,'pending','enabled',null,'invalid']){
  const states=[],calls=[];const loader=createMenuHeatLoader({storeId,menuIds,reportingState,onState:s=>states.push(s),request:async(...args)=>{calls.push(args);return Response.json(ready(null,0))}});
  loader.start();loader.start();await tick();assert.deepEqual(states,[{status:'pending'}]);assert.equal(calls.length,0);loader.dispose();
 }
});
function server(fetcher,enabled=true){
 const exports={},calls=[],timeouts=[];const source=fs.readFileSync(new URL('../lib/hot-menu-heat-server.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URLSearchParams,AbortSignal:{any:AbortSignal.any,timeout:ms=>{timeouts.push(ms);return AbortSignal.timeout(ms)}},fetch:(...args)=>{calls.push(args);return fetcher(...args)},require:name=>{if(name==='./hot-reporting-phase.ts')return {...phase,selectedReportingEnabled:()=>enabled};assert.equal(name,'./hot-menu-heat.ts');return heat}});
 return {...exports,calls,timeouts};
}
test('public server proxy has fixed origin, five-second timeout, no credentials/redirects, and strict response validation',async()=>{
 const disabled=server(async()=>{throw Error('must not fetch')},phase.selectedReportingEnabled());assert.equal((await disabled.readPublicMenuHeat({storeId,menuIds})).state,'pending');assert.equal(disabled.calls.length,0);
 const api=server(async()=>Response.json(ready()));const result=await api.readPublicMenuHeat({storeId,menuIds});assert.equal(result.state,'ready');assert.equal(result.summaries[0].medianHeat,2.5);
 const [url,options]=api.calls[0];assert.equal(new URL(url).origin,'https://www.nowgo.space');assert.equal(new URL(url).pathname,'/api/nowgo/hot/menu-heat');assert.equal(options.headers,undefined);assert.equal(options.credentials,undefined);assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.deepEqual(api.timeouts,[5000]);
 for(const [response,status] of [[new Response('',{status:429}),429],[new Response('',{status:503}),503],[new Response('<html>'),503],[Response.json({...ready(),coverage:'legacy_names'}),503]])await assert.rejects(server(async()=>response).readPublicMenuHeat({storeId,menuIds}),error=>error.status===status);
 assert.equal((await server(async()=>Response.json({state:'pending',scale:7,summaries:[]})).readPublicMenuHeat({storeId,menuIds})).state,'pending');
});
test('GET heat proxy rejects invalid/cross-variant queries before fetching and preserves 429/no-store',async()=>{
 const routeSource=fs.readFileSync(new URL('../app/api/menu-heat/route.ts',import.meta.url),'utf8');
 for(const variant of ['hot','sweet'])for(const code of [0,429,503]){
  const api=server(async()=>Response.json(ready())),calls=[];const exports={};
  const dependencies={'@/lib/hot-reporting-phase':{...phase,selectedReportingEnabled:()=>true},'@/lib/site-config':{variantForHost:()=>variant},'@/lib/hot-menu-heat':heat,'@/lib/hot-menu-heat-server':{MenuHeatUnavailable:api.MenuHeatUnavailable,readPublicMenuHeat:async(q,signal)=>{calls.push({q,signal});if(code)throw new api.MenuHeatUnavailable(code);return ready()}}};
  vm.runInNewContext(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Response,require:name=>dependencies[name]});
  const result=await exports.GET(new Request('https://hot.nowgo.space/api/menu-heat?'+query()));assert.equal(result.headers.get('Cache-Control'),'no-store');assert.equal(result.status,variant!=='hot'?400:code||200);
  if(variant==='hot'&&code===429)assert.equal(result.headers.get('Retry-After'),'30');
  assert.equal(calls.length,variant==='hot'?1:0);
  const bad=await exports.GET(new Request('https://hot.nowgo.space/api/menu-heat?storeId='+storeId));assert.equal(bad.status,400);assert.equal(calls.length,variant==='hot'?1:0);
 }
});

test('GET median route returns pending without calling proxy in actual phase one for source and owned menus',async()=>{
 const routeSource=fs.readFileSync(new URL('../app/api/menu-heat/route.ts',import.meta.url),'utf8'),exports={};let calls=0;
 const dependencies={'@/lib/hot-reporting-phase':phase,'@/lib/site-config':{variantForHost:()=> 'hot'},'@/lib/hot-menu-heat':heat,'@/lib/hot-menu-heat-server':{readPublicMenuHeat:async()=>{calls++;return ready(null,0)}}};
 vm.runInNewContext(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Response,require:name=>dependencies[name]});
 for(const menuId of [menuIds[0],'00000000-0000-4000-8000-000000000002']){
  const response=await exports.GET(new Request('https://hot.nowgo.space/api/menu-heat?'+new URLSearchParams({storeId,menuId})));
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{state:'pending',scale:7,summaries:[]});assert.equal(calls,0);
 }
});
