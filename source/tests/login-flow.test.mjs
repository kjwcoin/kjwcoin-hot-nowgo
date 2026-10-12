import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import * as policy from '../lib/integration-policy.ts';
function load(path,dependencies){
 const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(!(name in dependencies))throw Error('Unexpected import: '+name);return dependencies[name]},URL,URLSearchParams,queueMicrotask,React:{createElement(){return null}},...dependencies.globals},{filename:path});return exports;
}
async function flush(){for(let i=0;i<30;i++)await Promise.resolve()}
async function callback({host='hot.nowgo.space',accountType='user',returnTo='/',existingOwner=false,consentRequired=false,cookie='',mobile=false,pending=true}={}){
 const redirects=[],calls=[],removed=[],cookies=[];
 const document={get cookie(){return cookie},set cookie(value){cookies.push(value)}};
 const loaded=load('../app/account/callback/page.tsx',{
  react:{useState(){return ['',()=>{}]},useEffect(fn){fn()}},'@/components/flavor-header':{default(){}},
  '@/lib/supabase-browser':{browserDb(){return {auth:{async exchangeCodeForSession(){return {error:null}},async getSession(){return {data:{session:{access_token:'test-token'}},error:null}}}}}},
  '@/lib/client':{async api(path){calls.push(path);return path.endsWith('login-target')?{existingOwner}:{customer:consentRequired?null:{id:'user'},consentRequired}}},
  '@/lib/integration-policy':policy,'@/lib/site-config':{variantForHost(host){return host.split('.')[0]}},
  globals:{document,navigator:{userAgent:mobile?'Mozilla/5.0 iPhone Mobile':'Mozilla/5.0 Desktop'},location:{host,search:'?code=oauth-code',replace(path){redirects.push(path)}},sessionStorage:{getItem(){return pending?JSON.stringify({accountType,returnTo}):null},removeItem(key){removed.push(key)}}},
 });loaded.default();await flush();return {redirects,calls,removed,cookies};
}
for(const host of ['hot.nowgo.space','sweet.nowgo.space','rich.nowgo.space'])for(const mobile of [false,true]){
 test(`${host} ${mobile?'mobile web':'desktop'} ordinary login returns to its own map`,async()=>{
  const result=await callback({host,mobile,existingOwner:true});assert.deepEqual(result.redirects,['/']);assert.deepEqual(result.calls,['/api/customer/login-target','/api/customer/me']);assert.equal(result.removed.length,1);
 });
}
test('an explicit report return stays on HOT after login',async()=>{assert.deepEqual((await callback({returnTo:'/suggestion#report'})).redirects,['/suggestion#report'])});
test('external and malformed returns cannot redirect away or to app by default',async()=>{
 for(const returnTo of ['https://nowgo.space/flavors','https://evil.test','//evil.test','/\\evil.test','javascript:alert(1)','/app/arbitrary'])assert.deepEqual((await callback({returnTo})).redirects,['/']);
});
test('missing tab state defaults to the local map',async()=>{assert.deepEqual((await callback({pending:false,mobile:true})).redirects,['/'])});
test('native app explicitly initiated callback remains supported when tab storage is lost',async()=>{
 const path='/app/report-login?mode=entry&channel=550e8400-e29b-41d4-a716-446655440000';
 const result=await callback({pending:false,cookie:policy.APP_RETURN_COOKIE+'='+encodeURIComponent(path)});
 assert.deepEqual(result.redirects,[path]);assert.ok(result.cookies.some(value=>value.includes('Max-Age=0')));
});
test('explicit owner login stays within the owner boundary',async()=>{assert.deepEqual((await callback({accountType:'owner',existingOwner:true})).redirects,['/owner'])});
test('missing consent retains the review flow and local return, never automatic app routing',async()=>{assert.deepEqual((await callback({consentRequired:true,mobile:true})).redirects,['/account/join?finish=1&type=user&returnTo=%2F'])});
test('an explicit new owner retains the signup/consent flow',async()=>{assert.match((await callback({accountType:'owner',consentRequired:true})).redirects[0],/^\/account\/join\?finish=1&type=owner/)});
for(const authenticated of [true,false])test(`login-target ${authenticated?'uses only the verified user ID':'rejects unauthenticated callers'}`,async()=>{
 const lookups=[];const loaded=load('../app/api/customer/[action]/route.ts',{
  '@/lib/menu-catalog':{menuByPlaceId(){}},'node:crypto':{createHash},
  '@/lib/server':{reply(req,body,status=200){return {body,status}},failure(req,e){throw e}},
  '@/lib/supabase':{async verifiedUser(){return authenticated?{user:{id:'verified-owner'},client:{}}:null},publicConfig(){return {ready:true}}},
  '@/lib/existing-owner':{async isExistingOwner(client,id){lookups.push(id);return true}},'@/lib/loyalty':{LEVELS:[]},'@/lib/site-config':{siteConfig(){return {}},variantForHost(){return 'hot'}},
 });const result=await loaded.GET(new Request('https://hot.nowgo.space/api/customer/login-target?userId=someone-else'),{params:Promise.resolve({action:'login-target'})});assert.equal(result.status,authenticated?200:401);assert.deepEqual(lookups,authenticated?['verified-owner']:[]);
});
test('new NAVER reference page is an allowed local return; external parameters are removed',()=>{assert.equal(policy.returnPath('/naver-search?next=https://evil.test'),'/naver-search')});
