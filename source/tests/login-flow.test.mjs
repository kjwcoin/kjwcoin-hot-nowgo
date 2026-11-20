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
async function callback({host='hot.nowgo.space',accountType='user',returnTo='/',existingOwner=false,consentRequired=false,cookie='',mobile=false,pending=true,search='?code=oauth-code',exchangeError=null}={}){
 const redirects=[],calls=[],removed=[],cookies=[],authCalls=[],rendered=[];
 const state=['',null];let slot=0,effectRan=false;
 const document={get cookie(){return cookie},set cookie(value){cookies.push(value)}};
 const loaded=load('../app/account/callback/page.tsx',{
  react:{useState(){const index=slot++;return [state[index],value=>{state[index]=value}]},useEffect(fn){if(!effectRan){effectRan=true;fn()}}},'@/components/flavor-header':{default(){}},
  '@/lib/supabase-browser':{browserDb(){return {auth:{async exchangeCodeForSession(){authCalls.push('exchange');return {error:exchangeError}},async getSession(){authCalls.push('session');return {data:{session:{access_token:'test-token'}},error:null}}}}}},
  '@/lib/client':{async api(path){calls.push(path);return path.endsWith('login-target')?{existingOwner}:{customer:consentRequired?null:{id:'user'},consentRequired}}},
  '@/lib/integration-policy':policy,'@/lib/site-config':{variantForHost(host){return host.split('.')[0]}},
  globals:{document,React:{createElement(type,props,...children){if(type==='a')rendered.push({href:props.href,text:children[0]});return null}},navigator:{userAgent:mobile?'Mozilla/5.0 iPhone Mobile':'Mozilla/5.0 Desktop'},location:{host,search,replace(path){redirects.push(path)}},sessionStorage:{getItem(){return pending?JSON.stringify({accountType,returnTo}):null},removeItem(key){removed.push(key)}}},
 });loaded.default();await flush();slot=0;loaded.default();return {redirects,calls,removed,cookies,authCalls,rendered};
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
test('explicit owner login stays within the owner boundary',async()=>{assert.deepEqual((await callback({accountType:'owner',existingOwner:true})).redirects,['/owner/dashboard'])});
test('missing consent retains the review flow and local return, never automatic app routing',async()=>{assert.deepEqual((await callback({consentRequired:true,mobile:true})).redirects,['/account/join?finish=1&type=user&returnTo=%2F'])});
test('an explicit new owner retains the signup/consent flow',async()=>{assert.match((await callback({accountType:'owner',consentRequired:true})).redirects[0],/^\/account\/join\?finish=1&type=owner/)});
for(const authenticated of [true,false])test(`login-target ${authenticated?'uses only the verified user ID':'rejects unauthenticated callers'}`,async()=>{
 const lookups=[];const loaded=load('../app/api/customer/[action]/route.ts',{
  '@/lib/readonly-source-listings':{isReadonlySourceStoreId:()=>false},
  '@/lib/menu-catalog':{menuByPlaceId(){}},'node:crypto':{createHash},
  '@/lib/server':{reply(req,body,status=200){return {body,status}},failure(req,e){throw e}},
  '@/lib/supabase':{async verifiedUser(){return authenticated?{user:{id:'verified-owner'},client:{}}:null},publicConfig(){return {ready:true}}},
  '@/lib/existing-owner':{async isExistingOwner(client,id){lookups.push(id);return true}},'@/lib/loyalty':{LEVELS:[]},'@/lib/site-config':{siteConfig(){return {}},variantForHost(){return 'hot'}},
 });const result=await loaded.GET(new Request('https://hot.nowgo.space/api/customer/login-target?userId=someone-else'),{params:Promise.resolve({action:'login-target'})});assert.equal(result.status,authenticated?200:401);assert.deepEqual(lookups,authenticated?['verified-owner']:[]);
});
test('new NAVER reference page is an allowed local return; external parameters are removed',()=>{assert.equal(policy.returnPath('/naver-search?next=https://evil.test'),'/naver-search')});

const ownerDashboard='/owner/dashboard';
const ownerLink=ownerDashboard+'/550e8400-e29b-41d4-a716-446655440000';
const signupLink='/owner/signup?sourceStore=source-1';
for(const host of ['hot.nowgo.space','sweet.nowgo.space','rich.nowgo.space']){
 test(host+' explicit owner chooser is visible regardless of existing local login',()=>{
  for(const signedIn of [false,true]){
   const rendered=[];let state=0;
   const loaded=load('../app/account/join/page.tsx',{
    react:{useEffect(){},useState(value){return [++state===1?signedIn:state===2?true:value,()=>{}]},useSyncExternalStore(subscribe,get){return get()}},
    'next/link':{default(){}},'@/components/flavor-header':{default(){}},'@/components/oauth-buttons':{default:function OAuthButtons(){}},
    '@/lib/supabase-browser':{},'@/lib/client':{},'@/lib/integration-policy':policy,
    '@/lib/site-config':{variantForHost(value){return value.split('.')[0]},siteConfig(){return {name:host}}},
    globals:{location:{host,search:'?type=owner&returnTo='+encodeURIComponent(ownerDashboard)},React:{createElement(type,props,...children){if(type?.name==='OAuthButtons')rendered.push(props);return null}}},
   });
   loaded.default();assert.equal(rendered.length,1);assert.equal(rendered[0].accountType,'owner');assert.equal(rendered[0].returnTo,ownerDashboard);
  }
 });
 test(host+' owner callback preserves local dashboard link while regular user does not',async()=>{
  for(const returnTo of [ownerDashboard,ownerLink,signupLink,'/owner/subscribe'])assert.deepEqual((await callback({host,accountType:'owner',returnTo,existingOwner:true})).redirects,[returnTo]);
  assert.deepEqual((await callback({host,returnTo:ownerLink,existingOwner:true})).redirects,['/']);
  assert.deepEqual((await callback({host,accountType:'owner',returnTo:ownerDashboard})).redirects,['/owner/signup']);
  assert.deepEqual((await callback({host,accountType:'owner',returnTo:signupLink})).redirects,[signupLink]);
 });
}
test('owner destination allowlist never accepts arbitrary URLs, encoded paths or link query strings',()=>{
 for(const raw of ['//other.test/owner/dashboard','https://sweet.nowgo.space/owner/dashboard','/owner/../account','/owner%2Fdashboard',ownerLink+'?x=y',ownerDashboard+'\n','/owner/signup?sourceStore=ok&next=https://other.test','/owner/signup?sourceStore=%2Ffoo']){
  assert.equal(policy.ownerReturnPath(raw),null,raw);
 }
});

test('explicit owner OAuth errors and missing codes do not read an existing session and retry safely',async()=>{
 for(const search of ['', '?error=access_denied', '?code=unexpected&error_code=access_denied']){
  const result=await callback({accountType:'owner',returnTo:ownerLink,existingOwner:true,search});
  assert.deepEqual(result.authCalls,[]);assert.deepEqual(result.calls,[]);assert.deepEqual(result.redirects,[]);
  assert.deepEqual(result.rendered,[{href:'/account/join?type=owner&returnTo='+encodeURIComponent(ownerLink),text:'점주 로그인 다시 하기 ↗'}]);
 }
 const exchange=await callback({accountType:'owner',returnTo:'https://other.test',exchangeError:new Error('Exchange failed')});
 assert.deepEqual(exchange.authCalls,['exchange']);assert.deepEqual(exchange.calls,[]);assert.deepEqual(exchange.redirects,[]);
 assert.equal(exchange.rendered[0]?.href,'/account/join?type=owner&returnTo=%2Fowner%2Fdashboard');
});
test('native recovery still uses its established no-code session path',async()=>{
 const path='/app/report-login?mode=entry&channel=550e8400-e29b-41d4-a716-446655440000';
 const result=await callback({accountType:'owner',search:'',existingOwner:true,cookie:policy.APP_RETURN_COOKIE+'='+encodeURIComponent(path)});
 assert.deepEqual(result.redirects,[path]);assert.deepEqual(result.authCalls,['session']);assert.deepEqual(result.rendered,[]);
});

test('Kakao reauthentication is requested only for web owner OAuth; Google and native behavior stay unchanged',async()=>{
 const calls=[];
 for(const [accountType,returnTo,expected] of [
  ['owner',ownerDashboard,'login'],
  ['user','/',undefined],
  ['owner','/app/entry',undefined],
  ['owner','/app/report-login?mode=entry&channel=550e8400-e29b-41d4-a716-446655440000',undefined],
 ]){
  const buttons=[];
  const loaded=load('../components/oauth-buttons.tsx',{
   react:{useCallback(fn){return fn},useEffect(){},useRef(){return {current:false}},useState(value){return [value,()=>{}]}},
   '@/lib/supabase-browser':{browserDb(){return {auth:{async signInWithOAuth(args){calls.push(args);return {error:null}}}}}},
   '@/lib/integration-policy':policy,
   globals:{Event,window:{dispatchEvent(){}},localStorage:{removeItem(){}},sessionStorage:{setItem(){}},document:{},location:{hostname:'hot.nowgo.space',origin:'https://hot.nowgo.space'},React:{createElement(type,props){if(type==='button')buttons.push(props);return null}}},
  });
  loaded.default({flavor:'hot',returnTo,accountType});
  buttons[0].onClick();buttons[1].onClick();await flush();
  const [kakao,google]=calls.splice(0);
  assert.equal(kakao.provider,'kakao');assert.equal(kakao.options.queryParams?.prompt,expected);
  assert.equal(google.provider,'google');assert.equal(google.options.queryParams?.prompt,'select_account');
  assert.equal(kakao.options.redirectTo,'https://hot.nowgo.space/account/callback');
 }
});
