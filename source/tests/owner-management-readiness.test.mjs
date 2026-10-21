import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path,deps={},globals={}){
 const exports={};
 const source=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>{assert.ok(name in deps,name);return deps[name]},URL,Request,Response,FormData,File,Uint8Array,TextDecoder,AbortSignal,crypto,Set,...globals});
 return exports;
}
const menus=load('lib/menus.ts');
const config=load('lib/site-config.ts',{'./menus':menus});
const taste=load('lib/owner-taste-level.ts');
const permission=load('lib/owner-publish-permission.ts');
const readback=load('lib/owner-save-readback.ts',{'./owner-taste-level.ts':taste});
const server=load('lib/server.ts',{}, {process:{env:{}},console:{error(){}}});
const ownerApi=load('lib/map-owner-api.ts',{'sharp':()=>{throw Error('unexpected photo conversion')},'./server':server});
const STORE='00000000-0000-4000-8000-000000000001';
const OTHER_STORE='00000000-0000-4000-8000-000000000099';
const MENU='00000000-0000-4000-8000-000000000002';
const OWNER='00000000-0000-4000-8000-000000000003';

function harness(options={}){
 const planet=options.planet||'hot';
 const theme=config.siteConfig(planet);
 const calls=[];const uploads=[];const removed=[];
 const state={storeId:STORE,access:{enabled:true},state:{status:{value:'open'},menus:[{id:MENU,name:'테스트 메뉴',price:8000,level:3,flavor:theme.flavors[1],category:theme.categories[0],photoPath:'existing.webp',soldout:false}]}};
 const client={rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='ng_map_can_publish')return {data:'grant' in options?options.grant:true,error:options.grantError||null};
  if(name==='ng_map_dashboard_access')return {data:options.readback?options.readback(structuredClone(state)):structuredClone(state),error:options.readbackError||null};
  if(options.writeError)return {error:options.writeError};
  if(name==='ng_map_save_menu')state.state.menus=[{id:MENU,name:args.p_name,price:args.p_price,level:args.p_level,flavor:args.p_flavor,category:args.p_category,photoPath:args.p_photo,soldout:false}];
  if(name==='ng_map_set_menu_taste')Object.assign(state.state.menus[0],{level:args.p_level,flavor:args.p_flavor,category:args.p_category});
  if(name==='ng_map_set_menu_soldout')state.state.menus[0].soldout=args.p_soldout;
  if(name==='ng_map_set_status')state.state.status.value=args.p_value;
  return {data:name==='ng_map_save_menu'?MENU:null,error:null};
 },storage:{from:()=>({upload:async(path)=>{uploads.push(path);return {error:null}},remove:async(paths)=>{removed.push(...paths);return {error:null}}})}};
 const route=load('app/api/owner/manage/route.ts',{
  '@/lib/supabase':{verifiedUser:async()=>options.signedIn===false?null:{user:{id:OWNER},client}},
  '@/lib/server':server,'@/lib/site-config':config,
  '@/lib/map-owner-api':{...ownerApi,readOwnerForm:async req=>req.formData(),prepareOwnerPhoto:async()=>new Uint8Array([1])},
  '@/lib/owner-taste-level':taste,'@/lib/owner-publish-permission':permission,'@/lib/owner-save-readback':readback,
 });
 const post=async(body,{form=false,origin=`https://${planet}.nowgo.space`}={})=>{
  const headers=origin===null?{}:{origin};if(!form)headers['content-type']='application/json';
  const request=new Request(`https://${planet}.nowgo.space/api/owner/manage`,{method:'POST',headers,body:form?body:typeof body==='string'?body:JSON.stringify(body)});
  const response=await route.POST(request);return {status:response.status,body:await response.json()};
 };
 const add=async(level)=>{const form=new FormData();for(const [k,v] of Object.entries({storeId:STORE,name:'테스트 메뉴',price:'8000',level:String(level),flavor:theme.flavors[1],category:theme.categories[0]}))form.set(k,v);form.set('photo',new File(['photo'],'menu.webp',{type:'image/webp'}));return post(form,{form:true})};
 return {post,add,calls,uploads,removed,theme,state};
}

for(const planet of ['hot','rich','sweet'])for(const level of [0,1,5,6,7,8,6.5]){
 test(`${planet} additional menu accepts only its supported integer range: ${level}`,async()=>{
  const h=harness({planet});const result=await h.add(level);const valid=Number.isInteger(level)&&level>=1&&level<=(planet==='hot'?7:5);
  assert.equal(result.status,valid?200:400);
  assert.equal(h.calls.some(x=>x.name==='ng_map_save_menu'),valid);
  if(valid){assert.equal(result.body.ok,true);assert.equal(h.calls.at(-1).name,'ng_map_dashboard_access');assert.equal(h.state.state.menus[0].level,level)}
  else assert.equal(h.uploads.length,0);
 });
}

for(const grant of [false,null,undefined,'true','false',1,{},[]])test(`non-boolean-true grant is denied: ${JSON.stringify(grant)}`,async()=>{
 const h=harness({grant});assert.equal((await h.add(7)).status,402);assert.equal(h.uploads.length,0);
 const h2=harness({grant});assert.equal((await h2.post({storeId:STORE,action:'status',value:'open'})).status,402);
 assert.deepEqual(h2.calls.map(x=>x.name),['ng_map_can_publish']);
});

for(const action of ['status','soldout','taste'])test(`${action} is acknowledged only after fresh readback`,async()=>{
 const h=harness();const body={storeId:STORE,action,menuId:MENU,soldout:true,value:'break_time',level:7,flavor:h.theme.flavors[1],category:h.theme.categories[0]};
 const result=await h.post(body);assert.equal(result.status,200);assert.equal(result.body.ok,true);assert.equal(h.calls.at(-1).name,'ng_map_dashboard_access');
 const mismatch=harness({readback:s=>({...s,storeId:OTHER_STORE})});const rejected=await mismatch.post(body);assert.equal(rejected.status,503);assert.equal(rejected.body.code,'SAVE_UNVERIFIED');assert.notEqual(rejected.body.ok,true);
});

test('readback failure never removes a photo already referenced by a committed menu',async()=>{
 const h=harness({readback:s=>({...s,state:{...s.state,menus:[]}})});const result=await h.add(7);
 assert.equal(result.status,503);assert.equal(result.body.code,'SAVE_UNVERIFIED');assert.equal(result.body.menuId,MENU);assert.equal(h.uploads.length,1);assert.equal(h.removed.length,0);
});
test('rejected database writes attempt safe cleanup and expose no database message',async()=>{
 const h=harness({writeError:{message:'private_database_connection_detail'}});const result=await h.add(7);
 assert.equal(result.status,503);assert.equal(result.body.code,'owner_write_unavailable');assert.equal(h.removed.length,1);assert.ok(!JSON.stringify(result.body).includes('private_database'));
});
test('missing login and cross-site requests are denied before mutation',async()=>{
 const body={storeId:STORE,action:'status',value:'open'};
 const guest=harness({signedIn:false});assert.equal((await guest.post(body)).status,401);assert.equal(guest.calls.length,0);
 for(const origin of [null,'https://untrusted.example']){const h=harness();assert.equal((await h.post(body,{origin})).status,403);assert.equal(h.calls.length,0)}
});
test('malformed JSON and oversized streams return client errors without a database call',async()=>{
 for(const raw of ['{','null','[]','"text"']){const h=harness();assert.equal((await h.post(raw)).status,400);assert.equal(h.calls.length,0)}
 const h=harness();assert.equal((await h.post('x'.repeat(4097))).status,413);assert.equal(h.calls.length,0);
});
test('forged menu IDs, invalid status and invalid taste values never call mutation RPCs',async()=>{
 const base={storeId:STORE,menuId:MENU,action:'taste',level:7,flavor:'얼큰한',category:'분식'};
 for(const patch of [{menuId:'------------------------------------'},{level:8},{level:0},{level:6.5},{flavor:'injected'},{category:'injected'},{action:'status',value:'invalid'},{action:'soldout',menuId:'bad',soldout:true}]){
  const h=harness();assert.equal((await h.post({...base,...patch})).status,400);assert.ok(h.calls.every(x=>x.name==='ng_map_can_publish'));
 }
});
