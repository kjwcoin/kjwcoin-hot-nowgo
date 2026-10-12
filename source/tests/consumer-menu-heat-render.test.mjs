import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as phase from '../lib/hot-reporting-phase.ts';
import * as heat from '../lib/hot-menu-heat.ts';
import * as loader from '../lib/menu-heat-client.ts';
const exports={},source=fs.readFileSync(new URL('../components/consumer-menu-heat.tsx',import.meta.url),'utf8');
const dependencies={'@/lib/hot-reporting-phase':phase,'react/jsx-runtime':jsx,react:React,'@/lib/hot-menu-heat':heat,'@/lib/menu-heat-client':loader};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>dependencies[name]});
const menus=[{id:'dish-a',name:'매운 닭발'},{id:'dish-b',name:'매운 우동'}];
const render=state=>renderToStaticMarkup(React.createElement(exports.MenuHeatSummary,{menus,state}));
test('five chili segments represent exact 2.5/5 independently of participant counts',()=>{
 const html=renderToStaticMarkup(React.createElement(exports.MedianPeppers,{heat:2.5}));
 assert.equal((html.match(/class="median-pepper"/g)||[]).length,5);assert.equal((html.match(/width:100%/g)||[]).length,2);assert.equal((html.match(/width:50%/g)||[]).length,1);assert.equal((html.match(/width:0%/g)||[]).length,2);assert.match(html,/aria-hidden="true"/);
 const counts=[2,2000].map(sampleCount=>render({status:'ready',summaries:[{menuId:'dish-a',medianHeat:2.5,sampleCount},{menuId:'dish-b',medianHeat:4,sampleCount:7}]}));
 for(const result of counts){assert.match(result,/중앙값 2.5\/5/);assert.match(result,/중앙값 4\/5/);assert.match(result,/1–5단계/);assert.match(result,/매운 닭발/);assert.match(result,/매운 우동/)}
 assert.deepEqual(counts.map(value=>[...value.matchAll(/style="width:([^\"]+)/g)].map(x=>x[1]))[0],counts.map(value=>[...value.matchAll(/style="width:([^\"]+)/g)].map(x=>x[1]))[1]);
 assert.match(counts[0],/참여 고객 2명/);assert.match(counts[1],/참여 고객 2000명/);
});
test('confirmed empty dish has no peppers/median zero, and loading/pending/error never imply zero participants',()=>{
 const zero=render({status:'ready',summaries:[{menuId:'dish-a',medianHeat:null,sampleCount:0},{menuId:'dish-b',medianHeat:3,sampleCount:1}]});assert.match(zero,/아직 이 메뉴의 고객 평가가 없어요/);assert.match(zero,/참여 고객 0명/);assert.doesNotMatch(zero,/중앙값 0/);
 for(const status of ['loading','pending','error']){const result=render({status});assert.doesNotMatch(result,/참여 고객 0명|중앙값 [0-9]/);assert.doesNotMatch(result,/class="median-pepper"/)}
 assert.match(render({status:'error'}),/확인하지 못했어요/);assert.match(render({status:'pending'}),/집계 준비 중/);
});
test('client source section batches only known menu IDs once visible, rather than retrieving raw reports',()=>{
 assert.match(source,/IntersectionObserver/);assert.match(source,/props\.menus\.map\(menu=>menu.id\)/);assert.doesNotMatch(source,/\/api\/reports|\.heat\s*\|\||reportCount|menuStoreGroups/);
 const card=fs.readFileSync(new URL('../components/sourced-store-card.tsx',import.meta.url),'utf8');assert.match(card,/<ConsumerMenuHeat storeId=\{store.id\} menus=\{store.menus\}/);
});

test('actual phase-one component renders pending at first paint even with missing or forged enabled state',()=>{
 for(const reportingState of [undefined,'pending','enabled',null,'bad']){
  const html=renderToStaticMarkup(React.createElement(exports.default,{storeId:'source',menus,reportingState}));assert.match(html,/평가 등록과 집계는 준비 중/);assert.doesNotMatch(html,/참여 고객 0명|중앙값 [0-9]|확인 중/);
 }
});
