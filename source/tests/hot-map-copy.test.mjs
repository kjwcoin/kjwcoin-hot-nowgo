import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourceUi,hookHarness,elements,textOf,moduleAt} from './helpers/source-ui-components.mjs';
import {readonlySourceStoreFeed} from '../lib/readonly-source-listings.ts';
import {menuHeatAttribution} from '../lib/menu-heat-attribution.ts';
import * as runtime from 'react/jsx-runtime';
const ui=sourceUi(),source=readonlySourceStoreFeed().stores[0];
const sentence='맵기는 같은 메뉴를 먹은 분들이 제보한 맵기 단계의 중앙값으로 정해집니다.';

test('all HOT source card/detail paths omit preparation wording while facts and disabled actions remain honest',()=>{
 for(const store of [source,{...source,registrationState:'database'}])for(const preview of [false,true]){
  const detail=renderToStaticMarkup(React.createElement(ui.Detail,{store,preview,onBack(){}}));
  const card=renderToStaticMarkup(React.createElement(ui.Card,{store,preview}));
  assert.doesNotMatch(detail+card,/준비\s*중/);assert.match(detail,/맵기 미확인/);assert.match(detail,/가격 미확인/);
  assert.doesNotMatch(detail,/참여 고객 0명|중앙값 [0-9]|단골저장됨|접수 완료/);
  assert.ok((detail.match(/disabled=""/g)||[]).length>=2);
  if(!preview&&store.registrationState==='source-only'){
   assert.ok(detail.includes(sentence));assert.match(detail,/맵기와 제보 수는 미확인/);assert.doesNotMatch(detail,/<form|<input|<select|<textarea/);
  }
 }
});

test('all opened source action disclosures omit preparation wording without enabling writes',()=>{
 for(const kind of ['favorite','report','owner']){
  const h=hookHarness(),view=sourceUi({react:h.react});const render=()=>h.render(()=>view.ReadonlyActions({kind}));
  let tree=render();for(const label of elements(tree).filter(n=>n.type==='button').map(textOf)){
   const button=elements(render()).find(n=>n.type==='button'&&textOf(n)===label);button.props.onClick({currentTarget:{focus(){}}});tree=render();
   assert.doesNotMatch(textOf(tree),/준비\s*중|저장됨|접수 완료|요청 [0-9]+/);assert.equal(elements(tree).some(n=>['form','input','select','textarea'].includes(n.type)),false);
  }
 }
});

test('HOT status fallback uses unconfirmed wording, while SWEET/RICH and unrelated reporting APIs remain unchanged',()=>{
 const h=hookHarness();
 const statusReact={...h.react,useState:initial=>h.react.useState(initial===null?{source:'NOWGO 매장 연결 준비 중'}:initial)};
 const Status=moduleAt('components/store-status.tsx',{'react/jsx-runtime':runtime,react:statusReact,'@/lib/client':{api(){throw Error('No network in render test')}},'next/navigation':{useRouter:()=>({refresh(){}})}}).default;
 for(const variant of ['hot','sweet','rich']){
  const tree=h.render(()=>Status({menuId:'real',isDemo:false,ownerRegistered:true,variant}));
  if(variant==='hot'){assert.doesNotMatch(textOf(tree),/준비\s*중/);assert.match(textOf(tree),/연결 미확인/)}else assert.match(textOf(tree),/연결 준비 중/);
 }
 assert.match(menuHeatAttribution({heat:3,isDemo:false,verifiedOwner:false}),/개별 제보 맵기 3\/5 · 메뉴별 중앙값 미집계/);
 assert.match(fs.readFileSync(new URL('../lib/hot-reporting-phase.ts',import.meta.url),'utf8'),/평가 등록과 집계는 준비 중/);
});
