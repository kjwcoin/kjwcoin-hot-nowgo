import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies) {
 const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const exports={};
 vm.runInNewContext(output,{exports,require(name){if(!(name in dependencies))throw new Error('Unexpected import: '+name);return dependencies[name]},URL,URLSearchParams,queueMicrotask,React:{createElement(){return null}},...dependencies.globals},{filename:path});
 return exports;
}
async function flush(){for(let i=0;i<20;i++)await Promise.resolve()}
for(const host of ['hot.nowgo.space','sweet.nowgo.space','rich.nowgo.space']){
 test(host+' callback sends an existing owner directly to its own root map',async()=>{
  const redirects=[],calls=[],removed=[];
  const db={auth:{async exchangeCodeForSession(){return {error:null}},async getSession(){return {data:{session:{access_token:'token'}},error:null}}}};
  const globals={location:{host,search:'?code=oauth-code',replace(path){redirects.push(path)}},sessionStorage:{getItem(){return JSON.stringify({accountType:'owner',returnTo:'/suggestion#report'})},removeItem(key){removed.push(key)}}};
  const module=load('../app/account/callback/page.tsx',{
   react:{useState(){return ['',()=>{}]},useEffect(fn){fn()}},
   '@/components/brand':{default(){}},'@/lib/supabase-browser':{browserDb(){return db}},
   '@/lib/client':{async api(path){calls.push(path);return {existingOwner:true}}},
   '@/lib/integration-policy':{returnPath(path){return path||'/'}},
   '@/lib/site-config':{variantForHost(host){return host.split('.')[0]}},globals,
  });
  module.default();await flush();
  assert.deepEqual(redirects,['/']);assert.deepEqual(calls,['/api/customer/login-target']);
  assert.equal(removed.length,1);
 });
}
test('a new owner retains the existing signup/consent flow',async()=>{
 const redirects=[];
 const module=load('../app/account/callback/page.tsx',{
  react:{useState(){return ['',()=>{}]},useEffect(fn){fn()}},'@/components/brand':{default(){}},
  '@/lib/supabase-browser':{browserDb(){return {auth:{async getSession(){return {data:{session:{}},error:null}}}}}},
  '@/lib/client':{async api(path){return path.endsWith('login-target')?{existingOwner:false}:{customer:null,consentRequired:true}}},
  '@/lib/integration-policy':{returnPath(){return '/suggestion#report'}},
  '@/lib/site-config':{variantForHost(){return 'hot'}},
  globals:{location:{host:'hot.nowgo.space',search:'',replace(path){redirects.push(path)}},sessionStorage:{getItem(){return JSON.stringify({accountType:'owner'})},removeItem(){}}},
 });
 module.default();await flush();assert.match(redirects[0],/^\/account\/join\?finish=1/);
});
test('login-target uses the verified user and ignores supplied user IDs',async()=>{
 const lookups=[];
 const module=load('../app/api/customer/[action]/route.ts',{
  '@/lib/server':{reply(req,body,status=200){return {body,status}},failure(req,e){throw e}},
  '@/lib/supabase':{async verifiedUser(){return {user:{id:'verified-owner'},client:{}}},publicConfig(){return {ready:true}}},
  '@/lib/existing-owner':{async isExistingOwner(client,id){lookups.push(id);return true}},
  '@/lib/loyalty':{LEVELS:[]},'@/lib/site-config':{siteConfig(){return {}},variantForHost(){return 'hot'}},
 });
 const result=await module.GET(new Request('https://hot.nowgo.space/api/customer/login-target?userId=someone-else'),{params:Promise.resolve({action:'login-target'})});
 assert.equal(result.body.existingOwner,true);assert.deepEqual(lookups,['verified-owner']);
});
test('login-target rejects an unauthenticated or anonymous account before the owner query',async()=>{
 const module=load('../app/api/customer/[action]/route.ts',{
  '@/lib/server':{reply(req,body,status=200){return {body,status}},failure(req,e){throw e}},
  '@/lib/supabase':{async verifiedUser(){return null},publicConfig(){return {ready:true}}},
  '@/lib/existing-owner':{async isExistingOwner(){throw new Error('must not query')}},
  '@/lib/loyalty':{LEVELS:[]},'@/lib/site-config':{siteConfig(){return {}},variantForHost(){return 'hot'}},
 });
 const result=await module.GET(new Request('https://hot.nowgo.space/api/customer/login-target'),{params:Promise.resolve({action:'login-target'})});
 assert.equal(result.status,401);assert.equal(result.body.existingOwner,false);
});
