import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as runtime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as sourcedStore from '../lib/sourced-store.ts';
import {sourceStore,sixSources} from './fixtures/sourced-stores.mjs';
function component(path){
 const exports={},dependencies={'react/jsx-runtime':runtime,'@/lib/sourced-store':sourcedStore,'@/components/consumer-menu-heat':{__esModule:true,default:props=>{assert.equal(props.reportingState,'pending');return React.createElement('section',{'aria-label':'메뉴별 매운맛 평가 준비 중'},'메뉴별 매운맛 평가 등록과 집계는 준비 중이에요.')}}};
 const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(name){assert.ok(name in dependencies,name);return dependencies[name]}});
 return exports.default;
}
const Card=component('../components/sourced-store-card.tsx'),Notice=component('../components/sourced-store-notice.tsx');
test('rendered source cards expose canonical mini-pages and known facts without phantom media/prices/reports',()=>{
 const html=renderToStaticMarkup(React.createElement('section',{},sixSources.map(store=>React.createElement(Card,{store,key:store.id}))));
 assert.equal((html.match(/class="sourced-store-card"/g)||[]).length,6);
 assert.equal((html.match(/https:\/\/hot.nowgo.space\/p\/source-store-/g)||[]).length,6);
 assert.match(html,/공공자료 등록 · 점주 미등록/);assert.match(html,/가격 · 매운맛 단계 · 사진 미확인/);assert.match(html,/영업 여부 · 현재 메뉴 제공 여부 미확인/);
 assert.match(html,/평가 등록과 집계는 준비 중/);assert.doesNotMatch(html,/reportStore|맵기 제보|참여 고객 0명/);
 assert.doesNotMatch(html,/<img|0원|소비자 제보|1단계|현재 영업/);
});
test('rendered null-location and verified-without-menu states remain explicit',()=>{
 const unknown=renderToStaticMarkup(React.createElement(Card,{store:sourceStore(1,{coordinates:null})}));assert.match(unknown,/지도 위치 미확인/);
 const verified=renderToStaticMarkup(React.createElement(Card,{store:sourceStore(1,{ownership:'verified',ownerClaimVerified:true,pinStatus:'owner-verified'})}));assert.match(verified,/점주 확인 · 공공자료 메뉴/);assert.doesNotMatch(verified,/점주 미등록/);assert.match(verified,/가격 · 매운맛 단계 · 사진 미확인/);
});
test('rendered feed failure/partial/loading are disclosed, success does not add redundant notices',()=>{
 const render=state=>renderToStaticMarkup(React.createElement(Notice,{state,retry:()=>{}}));
 assert.match(render({status:'error',feed:null}),/전체 매장은 아니에요/);assert.match(render({status:'error',feed:null}),/다시 확인/);
 assert.match(render({status:'loading',feed:null}),/불러오는 중/);assert.match(render({status:'ready',feed:{complete:false}}),/일부만 확인/);
 assert.equal(render({status:'ready',feed:{complete:true}}),'');
});
