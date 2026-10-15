import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as policy from '../lib/integration-policy.ts';
const source=new URL('../',import.meta.url);
const require=createRequire(new URL('package.json',source));
const ts=require('typescript');
const React=require('react');
const jsx=require('react/jsx-runtime');
const {renderToStaticMarkup}=require('react-dom/server');
function load(path,deps,globals={}){
 const exports={};
 const text=fs.readFileSync(new URL(path,source),'utf8');
 const code=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require(name){assert.ok(name in deps,`Unexpected import ${name}`);return deps[name]},URL,URLSearchParams,queueMicrotask,...globals});
 return exports;
}
const model=load('lib/activity/model.ts',{});
const view=load('components/source-account-character.tsx',{
 'react/jsx-runtime':jsx,'./activity/use-activity':{useActivity(){assert.fail('Pure account view may not invoke a hook')}},
 './activity/character-art':{default:()=>null},'@/lib/activity/model':model,'./source-account-character.module.css':{default:{}},
}).SourceAccountCharacterView;
const guest={signedIn:false,owner:null,data:null,error:''};
function cardHref(returnTo){return renderToStaticMarkup(React.createElement(view,{state:guest,returnTo})).match(/href="([^"]+)"/)[1].replaceAll('&amp;','&')}
async function callback(returnTo,consentRequired=false){
 const redirects=[];
 const component=load('app/account/callback/page.tsx',{
  'react/jsx-runtime':jsx,react:{useState(){return ['',()=>{}]},useEffect(fn){fn()}},
  '@/components/flavor-header':{default:()=>null},
  '@/lib/supabase-browser':{browserDb(){return {auth:{async exchangeCodeForSession(){return {error:null}},async getSession(){return {data:{session:{access_token:'local-mock-only'}},error:null}}}}}},
  '@/lib/client':{async api(path){if(path.endsWith('/login-target'))return {existingOwner:false};if(path.endsWith('/me'))return {customer:consentRequired?null:{id:'mock'},consentRequired};assert.fail(`Unexpected API ${path}`)}},
  '@/lib/integration-policy':policy,'@/lib/site-config':{variantForHost:()=> 'hot'},
 },{document:{cookie:''},location:{host:'hot.nowgo.space',search:'?code=mock-code',replace(path){redirects.push(path)}},sessionStorage:{getItem(){return JSON.stringify({accountType:'user',returnTo})},removeItem(){}}});
 component.default();for(let i=0;i<30;i++)await Promise.resolve();return redirects;
}
test('new account card return survives the join-page policy',()=>{
 const href=cardHref('/account');
 const requested=new URL(href,'https://hot.nowgo.space').searchParams.get('returnTo');
 assert.equal(requested,'/account');
 assert.equal(policy.returnPath(requested),'/account');
});
test('completed existing-user callback returns to the requested account character',async()=>{
 assert.deepEqual(await callback('/account'),['/account']);
});
test('consent-needed callback preserves account character destination',async()=>{
 assert.deepEqual(await callback('/account',true),['/account/join?finish=1&type=user&returnTo=%2Faccount']);
});
test('card accepts only exact account return, preserving fallback for crafted account variants',()=>{
 for(const path of ['/account/','/account?next=https://evil.example','/account#x',' /account','/account\n','//evil.example/account','https://evil.example/account','/account/../owner','/Account','/account%2f']){
  assert.equal(new URL(cardHref(path),'https://hot.nowgo.space').searchParams.get('returnTo'),'/');
 }
});

test('exact internal account allowlist leaves external, encoded and normalization variants rejected',()=>{
 for(const value of ['//evil.example/account','https://evil.example/account','https://hot.nowgo.space/account','/account?next=https://evil.example','/account#x','/%61ccount','/%2561ccount','/account%2f','/x/../account','/%2e%2e/account','/account/','/Account','/account\\x',' /account','/account\n'])assert.equal(policy.returnPath(value),'/',value);
 assert.equal(policy.returnPath('/account'),'/account');assert.equal(policy.returnPath('/'),'/');assert.equal(policy.returnPath('/suggestion#report'),'/suggestion#report');
});
test('actual OAuth button preserves account through pending consent without changing callback or app routing',async()=>{
 const saved=[],oauth=[],cookies=[];
 const doc={set cookie(v){cookies.push(v)}};
 const component=load('components/oauth-buttons.tsx',{'react/jsx-runtime':jsx,react:{useState(v){return[v,()=>{}]},useCallback(fn){return fn},useRef(v){return{current:v}},useEffect(){}},'@/lib/supabase-browser':{browserDb(){return{auth:{async signInWithOAuth(value){oauth.push(value);return{error:null}}}}}},'@/lib/integration-policy':policy},{window:{dispatchEvent(){}},Event:class{},localStorage:{removeItem(){}},document:doc,sessionStorage:{setItem(k,v){saved.push([k,JSON.parse(v)])}},location:{hostname:'hot.nowgo.space',origin:'https://hot.nowgo.space'}}).default;
 const rendered=component({flavor:'hot',returnTo:policy.returnPath('/account'),accountType:'user'});
 rendered.props.children[0].props.children[0].props.onClick();
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(saved[0][0],'hot-pending-consent');assert.equal(saved[0][1].returnTo,'/account');assert.equal(oauth[0].options.redirectTo,'https://hot.nowgo.space/account/callback');
 assert.equal(policy.appLoginReturn('/account'),null);assert.ok(cookies.some(v=>v.startsWith(policy.APP_RETURN_COOKIE+'=;')));
});
test('logout still uses local sign-out and reload, and guest account login returns to account',()=>{
 const panel=fs.readFileSync(new URL('components/customer-panel.tsx',source),'utf8');assert.match(panel,/signOut\(\{scope:'local'\}\)/);assert.match(panel,/window\.location\.reload\(\)/);
 assert.equal(new URL(cardHref('/account'),'https://hot.nowgo.space').searchParams.get('returnTo'),'/account');
});
