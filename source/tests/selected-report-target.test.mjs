// Ready-path unit cases inject an isolated future-phase mock; real phase-one defaults are tested separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as phase from '../lib/hot-reporting-phase.ts';
import * as contract from '../lib/selected-report-target.ts';
import {createSelectedReportLoader} from '../lib/selected-report-target-client.ts';
const storeId='00000000-0000-4000-8000-000000000001',menuId='data-go-kr-15000000-1:menu:1';
const selection={storeId,menuId};
const target={...selection,storeName:'자료 식당',menuName:'매운 닭발',address:'서울특별시 중구 자료길 1',placeId:'nowgo-'+storeId,kind:'sourced',lat:37.56,lng:126.98};
const params=(s=selection)=>new URLSearchParams({reportStore:s.storeId,reportMenu:s.menuId});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('selection parser and public DTO require exact store/menu/place identity and whitelist fields',()=>{
 assert.deepEqual(contract.readReportSelection(params()),selection);assert.equal(contract.readReportSelection(new URLSearchParams()),null);
 assert.deepEqual(contract.parseSelectedReportTarget({target:{...target,ownerId:'private',phone:'private'}},selection),target);
 for(const p of [new URLSearchParams('reportStore='+storeId),new URLSearchParams('reportMenu='+menuId),new URLSearchParams('reportStore='+storeId+'&reportStore='+storeId+'&reportMenu='+menuId),params({...selection,menuId:'https://evil.test/a'}),params({...selection,storeId:'bad'})])assert.throws(()=>contract.readReportSelection(p));
 for(const extra of [{storeId:'another'},{menuId:'other'},{placeId:'reported-1'},{kind:'report'},{address:'unknown'},{storeName:''},{lat:0,lng:0},{lat:null,lng:127}])assert.throws(()=>contract.parseSelectedReportTarget({target:{...target,...extra}},selection));
 assert.equal(contract.parseSelectedReportTarget({target:{...target,lat:null,lng:null}},selection).lat,null);
 const owned={...selection,menuId:'00000000-0000-4000-8000-000000000010'};assert.equal(contract.parseSelectedReportTarget({target:{...target,...owned,kind:'owned'}},owned).kind,'owned');
 assert.throws(()=>contract.parseSelectedReportTarget({target:{...target,kind:'owned'}},selection));
 assert.match(contract.reportSelectionUrl(selection),/^\/suggestion\?reportStore=.*&reportMenu=.*#report$/);
});
test('fixed-origin target reader sends only identifiers, no user information or credentials, and fails closed',async()=>{
 const source=fs.readFileSync(new URL('../lib/selected-report-target-server.ts',import.meta.url),'utf8');
 const load=(fetcher,enabled=true)=>{const exports={},calls=[];vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URLSearchParams,AbortSignal,fetch:async(...args)=>{calls.push(args);return fetcher(...args)},require:name=>name==='./hot-reporting-phase.ts'?{...phase,selectedReportingEnabled:()=>enabled}:contract});return {...exports,calls}};
 const pending=load(async()=>{throw Error('must not fetch')},phase.selectedReportingEnabled());await assert.rejects(pending.readSelectedReportTarget(selection),/준비 중/);assert.equal(pending.calls.length,0);
 const api=load(async()=>Response.json({target}));assert.deepEqual(await api.readSelectedReportTarget(selection),target);
 const [url,options]=api.calls[0];assert.equal(new URL(url).origin,'https://www.nowgo.space');assert.equal(new URL(url).pathname,'/api/nowgo/hot/report-target');assert.equal(new URL(url).searchParams.get('storeId'),storeId);assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.headers,undefined);
 for(const [response,status] of [[new Response('',{status:404}),404],[new Response('',{status:503}),503],[new Response('<html/>'),503],[Response.json({target:{...target,menuId:'wrong'}}),503]])await assert.rejects(load(async()=>response).readSelectedReportTarget(selection),error=>error.status===status);
});
test('latest selection wins; same-target repeats retain the form, Back reloads, and clear aborts pending work',async()=>{
 const states=[],pending=[];const loader=createSelectedReportLoader({onState:s=>states.push(s),load:(selection,signal)=>new Promise(resolve=>pending.push({selection,signal,resolve}))});
 const b={...selection,menuId:'data-go-kr-15000000-1:menu:2'};
 loader.select(params());loader.select(params(b));assert.equal(pending[0].signal.aborted,true);
 pending[1].resolve({target:{...target,...b}});await tick();assert.equal(states.at(-1).target.menuId,b.menuId);
 pending[0].resolve({target});await tick();assert.equal(states.at(-1).target.menuId,b.menuId);
 const count=states.length;loader.select(params(b));assert.equal(states.length,count);assert.equal(pending.length,2);
 loader.select(params());assert.equal(pending.length,3);loader.select(new URLSearchParams());assert.equal(pending[2].signal.aborted,true);assert.equal(states.at(-1).status,'none');
 pending[2].resolve({target});await tick();assert.equal(states.at(-1).status,'none');loader.dispose();
});
test('failed, invalid, and disposed selections never become a free report or resolve stale labels',async()=>{
 const states=[];let reads=0;const loader=createSelectedReportLoader({onState:s=>states.push(s),load:async()=>{reads++;throw Error('unavailable')}});
 loader.select(params());await tick();assert.equal(states.at(-1).status,'error');assert.equal(states.at(-1).message,'unavailable');
 loader.select(new URLSearchParams('reportStore='+storeId));assert.equal(states.at(-1).status,'error');assert.equal(reads,1);
 loader.select(params(),true);await tick();assert.equal(reads,2);loader.dispose();loader.select(params(),true);assert.equal(reads,2);
});
test('stored selected receipt fields cannot be changed or reused by free-text mode',()=>{
 const expected={id:'receipt',menu_id:menuId,nowgo_store_id:storeId,place_id:target.placeId,shop:target.storeName,menu:target.menuName,address:target.address,role:'customer',price:14000,heat:3};
 contract.assertSelectedReportRetry({...expected,status:'draft'},expected,true);
 for(const extra of [{menu_id:'other'},{nowgo_store_id:'other'},{price:12000},{heat:4},{shop:'changed'},{role:'owner'}])assert.throws(()=>contract.assertSelectedReportRetry({...expected,...extra},expected,true),error=>error.status===409);
 assert.throws(()=>contract.assertSelectedReportRetry(expected,{id:'receipt',menu_id:'receipt'},false),error=>error.status===409);
 contract.assertSelectedReportRetry({id:'receipt',menu_id:'receipt'},{id:'receipt',menu_id:'receipt'},false);
});

test('direct selected-link pending response remains an explicit pending selection, never a free form',async()=>{
 const states=[];const loader=createSelectedReportLoader({onState:s=>states.push(s),load:async()=>{throw new contract.ReportTargetError(phase.HOT_REPORTING_PENDING_MESSAGE,503,phase.HOT_REPORTING_PENDING_CODE)}});
 loader.select(params());await tick();assert.equal(states.at(-1).status,'pending');assert.match(states.at(-1).message,/준비 중/);assert.notEqual(states.at(-1).key,'');loader.dispose();
});
