import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function compile(path,mocks){const exports={};const js=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(js,{exports,require:n=>n in mocks?mocks[n]:require(n),window:mocks.window,document:mocks.document,location:mocks.location,sessionStorage:mocks.sessionStorage,localStorage:{removeItem(){}},setTimeout,URLSearchParams,URL});return exports;}
const policy=compile('../lib/integration-policy.ts',{});
const walk=(node)=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node.props?.children)?node.props.children:[node.props?.children]).flatMap(walk)];
test('real red-screen login controls call OAuth with app callback and no popup',async()=>{
 for(const provider of ['google','kakao']){
  const calls=[];let cookie='',pending;
  const react={useState:init=>[init,v=>pending=v],useCallback:fn=>fn,useEffect(){},useRef:v=>({current:v})};
  // Event is a browser global; provide one for the handler's draft-save signal.
  const source=fs.readFileSync(new URL('../components/oauth-buttons.tsx',import.meta.url),'utf8');
  const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Event:class {},require:n=>n==='react'?react:n==='@/lib/supabase-browser'?{browserDb:()=>({auth:{signInWithOAuth:async request=>{calls.push(request);return {error:null}}}})}:n==='@/lib/integration-policy'?policy:require(n),window:{dispatchEvent(){}},document:{set cookie(v){cookie+=v}},location:{origin:'https://hot.nowgo.space',hostname:'hot.nowgo.space'},sessionStorage:{setItem(){}},localStorage:{removeItem(){}}});
  const tree=exports.default({flavor:'hot',returnTo:'/app/report-login?role=customer&mode=app'});
  const button=walk(tree).find(n=>n.type==='button'&&String(n.props.className).includes(provider));assert.ok(button);await button.props.onClick();assert.equal(calls.length,1);assert.equal(calls[0].provider,provider);assert.equal(calls[0].options.redirectTo,'https://hot.nowgo.space/account/callback');assert.ok(cookie.includes('mode%3Dapp'));
 }
});
test('authenticated home and browse home use the same artwork and all five menus',()=>{
 const render=(preview)=>{let i=0;const values=['hot','app','home',preview,'',null];const react={useState:()=>[values[i++],()=>{}],useRef:()=>({current:null}),useEffect(){}};const m=compile('../components/app-shell.tsx',{'react':react,'@/lib/supabase-browser':{},'@/lib/client':{},'./oauth-buttons':{default:()=>null},'./app-native-session':{default:()=>null}});return require('react-dom/server').renderToStaticMarkup(require('react').createElement(m.default,{variant:'hot'}))};
 for(const preview of [true,false]){const html=render(preview);assert.equal((html.match(/<img src="\/assets\/citypop-planets.webp"/g)||[]).length,3);for(const menu of ['행성','지도','제보','단골리스트','내 캐릭터'])assert.ok(html.includes(menu));assert.ok(html.includes('오늘은 어떤 맛의 행성으로?'));assert.equal(html.includes('로그아웃'),!preview)}
});
