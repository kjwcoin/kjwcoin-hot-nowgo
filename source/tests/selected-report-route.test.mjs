// Ready-path unit cases inject an isolated future-phase mock; real phase-one defaults are tested separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as phase from '../lib/hot-reporting-phase.ts';
import * as contract from '../lib/selected-report-target.ts';
import * as publication from '../lib/report-publication.ts';
import * as korean from '../lib/korean-region.ts';
import sourceRecords from '../lib/readonly-source-records.ts';
import {isReadonlySourceReportBinding,readonlySourceStoreFeed} from '../lib/readonly-source-listings.ts';
const source=fs.readFileSync(new URL('../app/api/[action]/route.ts',import.meta.url),'utf8');
const storeId='00000000-0000-4000-8000-000000000001',menuId='data-go-kr-15000000-1:menu:1',requestId='00000000-0000-4000-8000-000000000050';
const target={storeId,menuId,storeName:'자료 식당',menuName:'매운 닭발',address:'서울특별시 중구 자료길 1',placeId:'nowgo-'+storeId,kind:'sourced',lat:37.56,lng:126.98};
function harness({reportingEnabled=true,initial=null,targetError=null,variant='hot',resolveTarget=s=>({...target,...s,placeId:'nowgo-'+s.storeId})}={}){
 const exports={},calls=[];let row=initial;
 const client={from(table){calls.push(['from',table]);return {select(fields){calls.push(['select',fields]);return this},eq(){return this},async maybeSingle(){return {data:row,error:null}},async insert(value){calls.push(['insert',value]);row=value;return {error:null}}}},storage:{from(){return {async upload(...args){calls.push(['upload',...args]);return {error:null}}}}},async rpc(name){calls.push(['rpc',name]);row={...row,status:'published_unverified'};return {data:'published_unverified',error:null}}};
 const dependencies={
  '@/lib/hot-reporting-phase':{...phase,selectedReportingEnabled:()=>reportingEnabled},
  '@/lib/readonly-source-listings':{isReadonlySourceReportBinding},
  '@/lib/server':{reply:(_req,body,status=200)=>({body,status}),validOrigin:()=>true,failure:(_req,error)=>({body:{error:error.message},status:503}),config:()=>({})},
  '@/lib/menu-catalog':{communityMenus:()=>{},menuById:()=>{}},
  '@/lib/supabase':{publicDb:()=>{throw Error('Unexpected direct store read')},verifiedUser:async()=>({user:{id:'test-user'},client})},
  '@/lib/korean-region':korean,'@/lib/site-config':{variantForHost:()=>variant,siteConfig:()=>({tables:{reports:'reports'},menus:[],heat:Array.from({length:variant==='hot'?7:5},(_,index)=>String(index+1)),flavors:['전체','칼칼한'],categories:['닭발'],bucket:'private',publish:'publish_report'})},
  '@/lib/report-publication':publication,'@/lib/selected-report-target':contract,
  '@/lib/selected-report-target-server':{readSelectedReportTarget:async selection=>{calls.push(['target',selection]);if(targetError)throw targetError;return contract.parseSelectedReportTarget({target:resolveTarget(selection)},selection)}},
  sharp:()=>{calls.push(['sharp']);return {autoOrient(){return this},resize(){return this},webp(){return this},async toBuffer(){return Buffer.from('photo')}}},'next/server':{after:()=>{calls.push(['after'])}},
 };
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,URL,File,Buffer,Uint8Array,TextDecoder,TextEncoder,crypto,process:{env:{}},console:{error(){},warn(){}},require:name=>{assert.ok(name in dependencies,name);return dependencies[name]}});
 const submit=async(extra={})=>{
  const fields={requestId,role:'customer',selectionMode:'selected',selectedMenuId:menuId,storeId,shop:'위조 가게',address:'서울특별시 강남구 위조길 99',menu:'위조 메뉴',price:'14000',heat:'3',flavor:'칼칼한',category:'닭발',observedAt:publication.koreanToday(),note:'직접 확인',phone:'01012345678',rights:'yes',accuracy:'yes',lat:'35.1',lng:'129.1',...extra};
  const form=new FormData();for(const [key,value] of Object.entries(fields))if(value!==null)form.set(key,String(value));if(extra.photo!==null)form.set('photo',new File([new Uint8Array([255,216,255,1])],'menu.jpg',{type:'image/jpeg'}));
  return exports.POST(new Request('https://hot.nowgo.space/api/reports',{method:'POST',body:form}),{params:Promise.resolve({action:'reports'})});
 };
 return {calls,submit,get:async(menu=menuId)=>exports.GET(new Request('https://hot.nowgo.space/api/report-target?storeId='+storeId+'&menuId='+menu),{params:Promise.resolve({action:'report-target'})}),retry:async()=>exports.POST(new Request('https://hot.nowgo.space/api/report-retry',{method:'POST',body:JSON.stringify({id:requestId})}),{params:Promise.resolve({action:'report-retry'})}),get row(){return row}};
}
test('selected source report writes canonical identity and authoritative labels/coordinates, never browser labels',async()=>{
 const h=harness(),result=await h.submit();assert.equal(result.status,201);assert.equal(result.body.id,requestId);assert.equal(result.body.phone,undefined);assert.equal(result.body.business_number,undefined);assert.equal(result.body.user_id,undefined);
 const row=h.calls.find(c=>c[0]==='insert')[1];assert.equal(row.menu_id,menuId);assert.equal(row.id,requestId);assert.notEqual(row.id,row.menu_id);assert.equal(row.nowgo_store_id,storeId);assert.equal(row.place_id,target.placeId);assert.equal(row.shop,target.storeName);assert.equal(row.menu,target.menuName);assert.equal(row.address,target.address);assert.equal(row.lat,target.lat);assert.equal(row.lng,target.lng);assert.equal(row.price,14000);assert.equal(row.heat,3);
});
test('missing/failed target, owner mode, malformed selection, and non-HOT all fail before publication',async()=>{
 for(const [options,fields,status] of [[{targetError:new contract.ReportTargetError('missing',404)},{},404],[{targetError:new contract.ReportTargetError('offline')},{},503],[{}, {role:'owner',businessNumber:'1234567890'},400],[{}, {selectedMenuId:''},400],[{}, {requestId:'------------------------------------'},400],[{}, {selectionMode:'',selectedMenuId:menuId},400],[{}, {selectionMode:'automatic'},400],[{variant:'rich'}, {},400]]){
  const h=harness(options),result=await h.submit(fields);assert.equal(result.status,status);assert.equal(h.calls.some(c=>['insert','upload','rpc'].includes(c[0])),false);
 }
});
test('owned target UUID cannot also be the request UUID',async()=>{
 const ownerMenu='00000000-0000-4000-8000-000000000010';
 const h=harness({resolveTarget:s=>({...target,...s,kind:'owned'})});const result=await h.submit({requestId:ownerMenu,selectedMenuId:ownerMenu});assert.equal(result.status,400);assert.equal(h.calls.length,0);
 const valid=await h.submit({selectedMenuId:ownerMenu});assert.equal(valid.status,201);assert.equal(h.row.menu_id,ownerMenu);
});
test('mandatory actual fields remain required for canonical selected reports',async()=>{
 for(const extra of [{phone:''},{photo:null},{price:'0'},{price:'99'},{heat:''},{heat:'0'},{heat:'8'},{rights:''},{accuracy:''},{observedAt:'2999-01-01'}]){
  const h=harness(),result=await h.submit(extra);assert.equal(result.status,400,JSON.stringify(extra));assert.equal(h.calls.some(c=>c[0]==='insert'),false);
 }
});
test('HOT accepts seven heat levels while other flavors keep their five-level scale',async()=>{
 const hot=harness(),hotResult=await hot.submit({heat:'7'});assert.equal(hotResult.status,201);assert.equal(hot.row.heat,7);
 const rich=harness({variant:'rich'}),richResult=await rich.submit({selectionMode:'',selectedMenuId:'',storeId:'',heat:'6'});assert.equal(richResult.status,400);assert.equal(rich.calls.some(c=>c[0]==='insert'),false);
});
test('same immutable submission is idempotent but changed selected fields/targets receive 409',async()=>{
 const h=harness();assert.equal((await h.submit()).status,201);assert.equal((await h.submit()).status,201);assert.equal(h.calls.filter(c=>c[0]==='insert').length,1);assert.equal(h.calls.filter(c=>c[0]==='upload').length,1);
 for(const extra of [{selectedMenuId:'data-go-kr-15000000-1:menu:2'},{price:'15000'},{heat:'4'},{phone:'01011112222'},{note:'다른 내용'}])assert.equal((await h.submit(extra)).status,409);
 assert.equal(h.calls.filter(c=>c[0]==='insert').length,1);assert.equal(h.row.menu_id,menuId);
});
test('legacy free-text/correction menuId is not silently promoted into canonical aggregation',async()=>{
 const h=harness();const result=await h.submit({selectionMode:'',selectedMenuId:'',storeId:'',menuId});assert.equal(result.status,201);assert.equal(h.row.menu_id,requestId);assert.equal(h.row.nowgo_store_id,null);assert.match(h.row.place_id,/^reported-/);assert.equal(h.calls.some(c=>c[0]==='target'),false);
});
test('free mode cannot reuse a selected report receipt UUID',async()=>{
 const first=harness();await first.submit();const h=harness({initial:first.row});const result=await h.submit({selectionMode:'',selectedMenuId:'',storeId:''});assert.equal(result.status,409);assert.equal(h.calls.some(c=>c[0]==='insert'||c[0]==='upload'),false);
});

test('phase-one forged source and owned selected POSTs fail before target, image, storage or database work',async()=>{
 assert.equal(phase.selectedReportingEnabled(),false);
 for(const selectedMenuId of [menuId,'00000000-0000-4000-8000-000000000010'])for(const role of ['customer','owner']){
  const h=harness({reportingEnabled:phase.selectedReportingEnabled()});const result=await h.submit({selectedMenuId,role});
  assert.equal(result.status,503);assert.equal(result.body.state,'pending');assert.equal(result.body.code,'hot_reporting_pending');assert.match(result.body.error,/준비 중/);assert.deepEqual(h.calls,[]);
 }
});
test('direct source and owned GET selection fail pending before any resolver',async()=>{
 for(const menu of [menuId,'00000000-0000-4000-8000-000000000010']){
  const h=harness({reportingEnabled:phase.selectedReportingEnabled()});const result=await h.get(menu);assert.equal(result.status,503);assert.equal(result.body.state,'pending');assert.deepEqual(h.calls,[]);
 }
});
const sourceStores=readonlySourceStoreFeed().stores;
const revokedMenuIds=new Map(sourceRecords.map(row=>[row.id,row.source_metadata.revokedMenuIds||[]]));
const sourceMenuIds=store=>[...store.menus.map(menu=>menu.id),...revokedMenuIds.get(store.id)];
function sourceBindings(store){
 const ids=[store.id,store.id.toUpperCase(),store.id.replaceAll('-',''),'{'+store.id+'}','  '+store.id+'  '];
 return [
  ...ids.map(id=>({nowgo_store_id:id,menu_id:'unrelated-legacy-menu',place_id:'forged'})),
  ...ids.map(id=>({nowgo_store_id:null,menu_id:'unrelated-legacy-menu',place_id:'NOWGO-'+id})),
  ...sourceMenuIds(store).map(menu_id=>({nowgo_store_id:null,menu_id,place_id:null})),
 ];
}
test('each manifest source identity independently blocks saved draft retry before publication and photo review',async()=>{
 for(const store of sourceStores)for(const binding of sourceBindings(store)){
  const h=harness({reportingEnabled:false,initial:{id:requestId,status:'draft',...binding}});const result=await h.retry();
  assert.equal(result.status,503,JSON.stringify(binding));assert.equal(result.body.state,'pending');assert.equal(result.body.code,'hot_reporting_pending');assert.match(result.body.error,/준비 중/);assert.equal(h.calls.some(c=>['insert','upload','rpc','sharp','after'].includes(c[0])),false);
 }
});
test('ordinary free-text report and saved legacy retry remain usable while canonical reporting is off',async()=>{
 const h=harness({reportingEnabled:false});const result=await h.submit({selectionMode:'',selectedMenuId:'',storeId:'',menuId});assert.equal(result.status,201);assert.equal(h.row.menu_id,requestId);assert.equal(h.row.nowgo_store_id,null);
 const saved=harness({reportingEnabled:false,initial:{id:requestId,menu_id:requestId,status:'draft'}});assert.equal((await saved.retry()).status,200);assert.equal(saved.calls.some(c=>c[0]==='rpc'),true);
});

test('ordinary resubmission cannot publish a source-bound stored receipt even with missing or forged companion bindings',async()=>{
 for(const store of sourceStores)for(const binding of sourceBindings(store)){
  const h=harness({reportingEnabled:false,initial:{id:requestId,status:'draft',...binding}});
  const result=await h.submit({selectionMode:'',selectedMenuId:'',storeId:''});
  assert.equal(result.status,503,JSON.stringify(binding));assert.equal(result.body.code,'hot_reporting_pending');assert.equal(h.calls.some(c=>['insert','upload','rpc','after'].includes(c[0])),false);
 }
});

test('even an already-published manifest-source receipt cannot restart photo-review work through retry',async()=>{
 for(const store of sourceStores)for(const menu_id of sourceMenuIds(store)){
  const h=harness({reportingEnabled:false,initial:{id:requestId,status:'published_unverified',menu_id}});const result=await h.retry();assert.equal(result.status,503);assert.equal(result.body.code,'hot_reporting_pending');assert.equal(h.calls.some(c=>['rpc','after','upload','insert'].includes(c[0])),false);
 }
});

test('unrelated historical differing menu IDs preserve saved retry and ordinary resubmission while selected creation is pending',async()=>{
 for(const historicalMenuId of ['legacy-correction-menu','00000000-0000-4000-8000-000000000010',menuId]){
  const initial={id:requestId,status:'draft',menu_id:historicalMenuId,nowgo_store_id:storeId,place_id:'nowgo-'+storeId};
  const saved=harness({reportingEnabled:false,initial});
  const retried=await saved.retry();assert.equal(retried.status,200);assert.equal(retried.body.id,requestId);assert.equal(saved.row.menu_id,historicalMenuId);assert.equal(saved.calls.filter(c=>c[0]==='rpc').length,1);assert.equal(saved.calls.some(c=>['target','insert','upload','sharp'].includes(c[0])),false);
  const resubmission=harness({reportingEnabled:false,initial});
  const submitted=await resubmission.submit({selectionMode:'',selectedMenuId:'',storeId:''});
  assert.equal(submitted.status,201);assert.equal(submitted.body.id,requestId);assert.equal(resubmission.row.menu_id,historicalMenuId);assert.equal(resubmission.row.nowgo_store_id,storeId);assert.equal(resubmission.calls.filter(c=>c[0]==='rpc').length,1);assert.equal(resubmission.calls.some(c=>['target','insert'].includes(c[0])),false);
 }
});

test('source receipt guard needs an actual manifest binding and cannot classify unrelated historical IDs by shape alone',()=>{
 for(const value of [null,undefined,[],{}, {id:requestId,menu_id:'historical-menu'}, {nowgo_store_id:storeId,place_id:'nowgo-'+storeId,menu_id:menuId}])assert.equal(isReadonlySourceReportBinding(value),false);
 for(const store of sourceStores){assert.equal(isReadonlySourceReportBinding({nowgo_store_id:store.id}),true);assert.equal(isReadonlySourceReportBinding({place_id:'nowgo-'+store.id}),true);for(const menu_id of sourceMenuIds(store))assert.equal(isReadonlySourceReportBinding({menu_id}),true);}
});
