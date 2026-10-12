import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as phase from '../lib/hot-reporting-phase.ts';
const source=fs.readFileSync(new URL('../app/suggestion/page.tsx',import.meta.url),'utf8');
function page(){
 const exports={},calls=[];
 const dependencies={'react/jsx-runtime':jsx,'@/lib/hot-reporting-phase':phase,'@/lib/seo':{flavorPageMetadata:()=>({})},'@/components/hot-app':{default:()=>{calls.push('form');return React.createElement('form',{'data-legacy-report':true})}},'next/link':{default:({children,...props})=>React.createElement('a',props,children)},'next/headers':{headers:async()=>{calls.push('headers');return new Headers({host:'hot.nowgo.space'})}},'@/lib/site-config':{variantForHost:()=> 'hot'}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{assert.ok(name in dependencies,name);return dependencies[name]}});
 return {calls,render:async query=>renderToStaticMarkup(await exports.default({searchParams:Promise.resolve(query)}))};
}
test('direct sourced/owned/partial/duplicate selected URLs render pending on server without mounting a report form',async()=>{
 for(const query of [{reportStore:'source-id',reportMenu:'data-go-kr-1-1:menu:1'},{reportStore:'owner-id',reportMenu:'00000000-0000-4000-8000-000000000001'},{reportStore:''},{reportMenu:['one','two']}]){
  const p=page(),html=await p.render(query);assert.match(html,/data-reporting-state="pending"/);assert.match(html,/평가 등록과 집계는 준비 중/);assert.doesNotMatch(html,/<form|type="file"|참여 고객 0명|중앙값 [0-9]/);assert.deepEqual(p.calls,[]);
 }
});
test('ordinary existing suggestion entrypoint still renders legacy report app and terms',async()=>{
 const p=page(),html=await p.render({});assert.match(html,/data-legacy-report/);assert.match(html,/href="\/signup-terms"/);assert.deepEqual(p.calls,['headers','form']);assert.doesNotMatch(html,/data-reporting-state="pending"/);
});
