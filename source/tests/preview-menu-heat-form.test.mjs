import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import {sourceUi,elements,textOf,hookHarness} from './helpers/source-ui-components.mjs';

const first=sourcePreviewStore();
const store={...first,menus:[...first.menus,{...first.menus[0],id:first.sourceRef+':menu:2',name:'같은 매장의 다른 메뉴'}]};
const button=(tree,text)=>elements(tree).find(node=>node.type==='button'&&textOf(node)===text);
const opener=tree=>elements(tree).find(node=>node.props?.className==='source-preview-heat-open');
const form=tree=>elements(tree).find(node=>node.type==='form');
const select=tree=>elements(tree).find(node=>node.type==='select');
const checkbox=tree=>elements(tree).find(node=>node.type==='input'&&node.props.type==='checkbox');
const radio=(tree,heat)=>elements(tree).find(node=>node.type==='input'&&node.props.type==='radio'&&node.props.value===heat);
const submit=tree=>elements(tree).find(node=>node.type==='button'&&node.props.type==='submit');
function setup(extra={}){
 const harness=hookHarness(),ui=sourceUi({react:harness.react}),calls=[];
 const props={storeId:store.id,menus:store.menus,menuId:store.menus[0].id,onPreviewHeat:(...args)=>calls.push(args),...extra};
 return {ui,harness,calls,props,render:()=>harness.render(()=>ui.PreviewHeat(props))};
}

test('preview begins without seeded heat, customer count or a mounted form',()=>{
 const {PreviewHeat}=sourceUi();
 const html=renderToStaticMarkup(React.createElement(PreviewHeat,{storeId:store.id,menus:store.menus,onPreviewHeat(){}}));
 for(const text of ['이 메뉴를 먹고 느낀 맵기','새로고침·초기화하면 지워져요','내 최신 입력 1개','실제 제보 등록·집계 공개는 아직 연결되지 않았'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/<form|미리보기 중앙값 [0-9]|참여 고객|등록 완료|<input/);
 assert.match(html,/aria-expanded="false"/);
});

test('form contains exact canonical menu options and requires heat plus eaten-here acknowledgement',()=>{
 const state=setup({menuId:store.menus[1].id});let tree=state.render();opener(tree).props.onClick();tree=state.render();
 assert.equal(select(tree).props.value,store.menus[1].id);
 assert.deepEqual(elements(tree).filter(node=>node.type==='option').map(node=>[node.props.value,textOf(node)]),store.menus.map(menu=>[menu.id,menu.name]));
 assert.deepEqual(elements(tree).filter(node=>node.props?.type==='radio').map(node=>node.props.value),[1,2,3,4,5,6,7]);
 assert.equal(elements(tree).filter(node=>node.props?.type==='radio'&&node.props.checked).length,0);
 assert.equal(submit(tree).props.disabled,true);form(tree).props.onSubmit({preventDefault(){}});assert.deepEqual(state.calls,[]);
 radio(tree,4).props.onChange();tree=state.render();assert.equal(submit(tree).props.disabled,true);
 checkbox(tree).props.onChange({target:{checked:true}});tree=state.render();assert.equal(submit(tree).props.disabled,false);
 select(tree).props.onChange({target:{value:store.menus[0].id}});tree=state.render();assert.equal(submit(tree).props.disabled,true);assert.equal(checkbox(tree).props.checked,false);assert.equal(radio(tree,4).props.checked,false);
});

test('submit sends the selected canonical menu once per opening; repeat editing never invents a person',()=>{
 const state=setup();let tree=state.render();opener(tree).props.onClick();tree=state.render();
 select(tree).props.onChange({target:{value:store.menus[1].id}});tree=state.render();radio(tree,5).props.onChange();checkbox(tree).props.onChange({target:{checked:true}});tree=state.render();
 const callback=form(tree).props.onSubmit;callback({preventDefault(){}});callback({preventDefault(){}});
 assert.deepEqual(state.calls,[[store.menus[1].id,5]]);tree=state.render();assert.equal(form(tree),undefined);
 state.props.menuId=store.menus[1].id;state.props.summary={medianHeat:7,sampleCount:1,myHeat:7};tree=state.render();assert.match(textOf(tree),/미리보기 중앙값 7\/7/);assert.match(textOf(tree),/지도 아이콘 미리보기/);assert.match(textOf(tree),/내 입력 1건/);assert.doesNotMatch(textOf(tree),/참여 고객|등록 완료/);
 opener(tree).props.onClick();tree=state.render();assert.equal(radio(tree,7).props.checked,true);assert.equal(checkbox(tree).props.checked,false);
 radio(tree,2).props.onChange();checkbox(tree).props.onChange({target:{checked:true}});tree=state.render();form(tree).props.onSubmit({preventDefault(){}});
 assert.deepEqual(state.calls,[[store.menus[1].id,5],[store.menus[1].id,2]]);
});

test('Cancel, Close, Escape and repeated toggle discard unsubmitted drafts and restore focus',()=>{
 for(const action of ['cancel','close','escape','toggle']){
  const state=setup();let tree=state.render(),focused=0;opener(tree).props.ref.current={focus(){focused++}};opener(tree).props.onClick();tree=state.render();
  radio(tree,3).props.onChange();checkbox(tree).props.onChange({target:{checked:true}});tree=state.render();
  if(action==='cancel')button(tree,'취소').props.onClick();
  if(action==='close')button(tree,'닫기').props.onClick();
  if(action==='escape')form(tree).props.onKeyDown({key:'Escape',preventDefault(){},stopPropagation(){}});
  if(action==='toggle')opener(tree).props.onClick();
  tree=state.render();assert.equal(form(tree),undefined);assert.equal(focused,1);assert.deepEqual(state.calls,[]);
  opener(tree).props.onClick();tree=state.render();assert.equal(radio(tree,3).props.checked,false);assert.equal(checkbox(tree).props.checked,false);assert.equal(submit(tree).props.disabled,true);
 }
});

test('unknown menu injection stays disabled and missing callback cannot pretend to submit',()=>{
 const state=setup();let tree=state.render();opener(tree).props.onClick();tree=state.render();
 select(tree).props.onChange({target:{value:'unrelated-store-menu'}});tree=state.render();radio(tree,1).props.onChange();checkbox(tree).props.onChange({target:{checked:true}});tree=state.render();
 assert.equal(submit(tree).props.disabled,true);form(tree).props.onSubmit({preventDefault(){}});assert.deepEqual(state.calls,[]);
 const missing=setup({onPreviewHeat:undefined});assert.equal(opener(missing.render()).props.disabled,true);
});

test('a captured valid submit cannot publish after Cancel, Close, Escape, or Reset',()=>{
 for(const action of ['cancel','close','escape','reset']){
  const state=setup({onPreviewHeatReset(){}});let tree=state.render();opener(tree).props.onClick();tree=state.render();
  radio(tree,4).props.onChange();checkbox(tree).props.onChange({target:{checked:true}});tree=state.render();
  const staleSubmit=form(tree).props.onSubmit;
  if(action==='cancel')button(tree,'취소').props.onClick();
  if(action==='close')button(tree,'닫기').props.onClick();
  if(action==='escape')form(tree).props.onKeyDown({key:'Escape',preventDefault(){},stopPropagation(){}});
  if(action==='reset')button(tree,'미리보기 초기화').props.onClick();
  staleSubmit({preventDefault(){}});tree=state.render();
  assert.equal(form(tree),undefined);assert.deepEqual(state.calls,[],action);
  opener(tree).props.onClick();tree=state.render();radio(tree,2).props.onChange();checkbox(tree).props.onChange({target:{checked:true}});tree=state.render();
  form(tree).props.onSubmit({preventDefault(){}});assert.deepEqual(state.calls,[[store.menus[0].id,2]]);
 }
});

test('reset delegates clearing to the parent and dismisses an open draft',()=>{
 let resets=0;const state=setup({summary:{medianHeat:4,sampleCount:1,myHeat:4},onPreviewHeatReset(){resets++}});let tree=state.render();
 opener(tree).props.onClick();tree=state.render();button(tree,'미리보기 초기화').props.onClick();state.props.summary={medianHeat:null,sampleCount:0,myHeat:null};tree=state.render();
 assert.equal(resets,1);assert.equal(form(tree),undefined);assert.doesNotMatch(textOf(tree),/미리보기 중앙값/);assert.deepEqual(state.calls,[]);
});

test('live source detail ignores all local preview values and remains reporting-pending',()=>{
 const {Detail}=sourceUi();const html=renderToStaticMarkup(React.createElement(Detail,{store:{...store,reportingState:'enabled'},preview:false,onBack(){},previewHeat:{medianHeat:5,sampleCount:1,myHeat:5},previewPhoto:{url:'blob:local-photo',nickname:'내 별명'},onPreviewHeat(){throw Error('Must never run')}}));
 assert.match(html,/data-reporting-state="pending"/);assert.match(html,/disabled=""[^>]*>먹어본 메뉴 맵기 제보/);assert.doesNotMatch(html,/data-heat-mode="local-preview"|blob:local-photo|미리보기 중앙값/);
});

test('logo uses the existing asset and original footprint; photo attribution is scoped to the canonical preview menu',()=>{
 const {Photo,Card,Detail}=sourceUi();const photo={url:'blob:local-photo',nickname:'국수친구'};
 const logo=renderToStaticMarkup(React.createElement(Photo,{}));assert.match(logo,/src="\/images\/nowgo-red.png"/);assert.match(logo,/alt="NOWGO 로고 · 매장 사진 미등록"/);
 const html=renderToStaticMarkup(React.createElement(Card,{store,preview:true,previewPhoto:photo,previewPhotoMenuId:store.menus[1].id}));
 assert.equal((html.match(/src="blob:local-photo"/g)||[]).length,1);assert.equal((html.match(/src="\/images\/nowgo-red.png"/g)||[]).length,1);assert.match(html,/source-photo-preview-nickname/);assert.match(html,/국수친구/);assert.doesNotMatch(html,/explorer-menu-item reporter-store/);
 const detail=renderToStaticMarkup(React.createElement(Detail,{store,preview:true,previewPhoto:photo,onBack(){}}));assert.match(detail,/src="blob:local-photo"/);assert.doesNotMatch(detail,/explorer-selected reporter-store/);
 const live=renderToStaticMarkup(React.createElement(Card,{store,preview:false,previewPhoto:photo,previewPhotoMenuId:store.menus[1].id}));assert.doesNotMatch(live,/blob:local-photo/);
 const css=fs.readFileSync(new URL('../components/sourced-store-minihome.css',import.meta.url),'utf8');assert.match(css,/source-photo-placeholder>img\{[^}]*object-fit:contain/);assert.match(css,/source-photo-preview-nickname\{[^}]*right:6px;bottom:6px[^}]*border-radius:999px;background:#fff;color:#000/);
});

test('heat and information preview components contain no network or persistent storage',()=>{
 for(const file of ['preview-menu-heat.tsx','preview-store-information.tsx']){
  const source=fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8');
  assert.doesNotMatch(source,/fetch\(|\bapi\(|supabase|localStorage|sessionStorage|\.rpc\(|\/api\//);
 }
 const harness=hookHarness(),{PreviewInformation}=sourceUi({react:harness.react});const render=()=>harness.render(()=>PreviewInformation());
 let tree=render();button(tree,'매장정보 제보 · 미리보기').props.onClick();tree=render();assert.match(textOf(tree),/저장하거나 공개하지 않아요/);button(tree,'닫기').props.onClick();tree=render();assert.equal(elements(tree).some(node=>node.props?.role==='status'),false);
});
