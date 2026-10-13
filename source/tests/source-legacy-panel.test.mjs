import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import {sourceUi,elements,textOf,hookHarness} from './helpers/source-ui-components.mjs';
const store=sourcePreviewStore();
const ui=sourceUi();

test('source detail keeps the old photo, taste-price, status, favorite and three-action sequence',()=>{
 const html=renderToStaticMarkup(React.createElement(ui.Detail,{store,preview:true,onBack(){}}));
 const ordered=['explorer-back','explorer-detail-photo','explorer-detail-content','explorer-tags','<h1>','explorer-taste-price','store-status','단골 · 계정 미리보기','explorer-quick-actions','source-detail-footer'];
 let position=-1;for(const marker of ordered){const next=html.indexOf(marker);assert.ok(next>position,marker);position=next;}
 for(const expected of ['회비빔국수','할매집회국수','가격 미확인','맵기 미확인','영업현황 미확인','현재 메뉴 제공 여부 미확인','길찾기','예약하기','웨이팅수 보기','실제 제보 등록·집계 공개는 아직 연결되지 않았','이용허락범위 제한 없음'])assert.ok(html.includes(expected),expected);
 assert.match(html,/map\.kakao\.com\/link\/to\/[^" ]+,35.09885,129.03146/);
 assert.ok((html.match(/disabled=""/g)||[]).length>=3);
 assert.match(html,/src="\/images\/nowgo-red.png"/);assert.doesNotMatch(html,/<iframe|data-live-component|0원|1단계|중앙값 [0-9]|참여 고객 0명|현재 영업 중/);
});

test('direct minihome SSR uses the map shell with source selected before any feed response',()=>{
 const html=renderToStaticMarkup(React.createElement(ui.Mini,{store,preview:false}));
 assert.match(html,/class="explorer"/);assert.match(html,/data-map-shell/);assert.match(html,/explorer-selected source-store-detail/);
 for(const value of [store.id,store.name,store.address,store.menus[0].name])assert.ok(html.includes(value));
 assert.doesNotMatch(html,/source-minihome-columns|source-minihome-heading|flavor-page-header/);
});

test('source row/pin selection, repeated clicks, Back and collapse are local and mutually exclusive',()=>{
 const harness=hookHarness();
 class Element {}
 const state=sourceUi({react:harness.react,globals:{document:{activeElement:null},HTMLElement:Element}});
 const render=()=>harness.render(()=>state.Explorer({previewStore:store}));
 let tree=render();let nodes=elements(tree);
 assert.equal(nodes.filter(node=>node.type===state.Detail).length,0);
 const row=nodes.find(node=>node.type===state.Card);assert.ok(row);
 row.props.onSelect(store);row.props.onSelect(store);
 tree=render();nodes=elements(tree);
 assert.equal(nodes.filter(node=>node.type===state.Detail).length,1);
 let map=nodes.find(node=>node.type===state.Map);assert.equal(map.props.selectedSourceId,store.id);assert.equal(map.props.selectedId,undefined);assert.equal(map.props.sourcePreview,true);assert.equal(map.props.onLocation,undefined);
 nodes.find(node=>node.type===state.Detail).props.onBack();tree=render();nodes=elements(tree);
 assert.ok(nodes.some(node=>node.type===state.Card));assert.equal(nodes.find(node=>node.type===state.Map).props.selectedSourceId,undefined);
 nodes.find(node=>node.type===state.Map).props.onSourceSelect(store);tree=render();nodes=elements(tree);
 nodes.find(node=>node.props?.className==='explorer-results-heading').props.onClick();tree=render();nodes=elements(tree);
 assert.match(nodes.find(node=>node.type==='aside'&&node.props['aria-label']==='검색된 메뉴').props.className,/collapsed/);assert.equal(nodes.find(node=>node.type===state.Map).props.selectedSourceId,undefined);
 nodes.find(node=>node.props?.className==='explorer-results-heading').props.onClick();tree=render();nodes=elements(tree);
 assert.ok(nodes.some(node=>node.type===state.Card));assert.equal(nodes.filter(node=>node.type===state.Detail).length,0);
 // Running the preview's mount effects must not need a browser, API, auth or GPS.
 harness.flushEffects();
});

test('legacy menu selection clears a selected source and a source click clears a legacy menu',()=>{
 const menu={id:'legacy-1',placeId:'reported-123',name:'회원 제보 메뉴',shop:'회원 제보 식당',area:'서울',category:'국수',flavor:'칼칼한',heat:3,price:12000,lat:37.55,lng:126.98,image:'/actual-report.jpg',isDemo:false,ownerRegistered:false,description:'실제 제보'};
 const harness=hookHarness();class Element {}
 const state=sourceUi({react:harness.react,stores:[store],menus:[menu],globals:{document:{activeElement:null},HTMLElement:Element,process:{env:{}}}});
 const render=()=>harness.render(()=>state.Explorer({initialSourceStore:store}));
 let nodes=elements(render());assert.ok(nodes.some(node=>node.type===state.Detail));
 nodes.find(node=>node.type===state.Map).props.onSelect(menu);nodes=elements(render());
 assert.equal(nodes.some(node=>node.type===state.Detail),false);let map=nodes.find(node=>node.type===state.Map);assert.equal(map.props.selectedSourceId,undefined);assert.equal(map.props.selectedId,menu.id);
 map.props.onSourceSelect(store);nodes=elements(render());map=nodes.find(node=>node.type===state.Map);assert.equal(map.props.selectedId,undefined);assert.equal(map.props.selectedSourceId,store.id);
});

test('preview request and claim explanations support repeat, switch and Close without persisted state',()=>{
 const harness=hookHarness(),{Actions}=sourceUi({react:harness.react});
 const render=()=>harness.render(()=>Actions());
 let tree=render();elements(tree).find(node=>node.type==='button'&&textOf(node).includes('영업정보 요청')).props.onClick();tree=render();assert.match(textOf(tree),/요청이 저장되지 않습니다/);
 elements(tree).find(node=>node.type==='button'&&textOf(node).includes('소유권')).props.onClick();tree=render();assert.match(textOf(tree),/점주 신청을 받지 않습니다/);assert.doesNotMatch(textOf(tree),/요청이 저장되지 않습니다/);
 elements(tree).find(node=>node.type==='button'&&textOf(node)==='닫기').props.onClick();tree=render();assert.equal(elements(tree).some(node=>node.props?.role==='status'),false);
 elements(tree).find(node=>node.type==='button'&&textOf(node).includes('소유권')).props.onClick();tree=render();assert.match(textOf(tree),/승인 전에는 공식 점주로 표시되지 않습니다/);
});

test('no-coordinate detail does not invent directions or enable bookings and forged heat stays pending in preview',()=>{
 const html=renderToStaticMarkup(React.createElement(ui.Detail,{store:{...store,coordinates:null,reportingState:'enabled'},preview:true,onBack(){}}));
 assert.doesNotMatch(html,/map\.kakao\.com\/link\/to/);assert.match(html,/지도 위치 미확인/);assert.match(html,/실제 제보 등록·집계 공개는 아직 연결되지 않았/);assert.doesNotMatch(html,/data-reporting-state="enabled"/);assert.ok((html.match(/disabled=""/g)||[]).length>=4);
});

test('source-specific CSS keeps original panel and photo geometry instead of a second document layout',()=>{
 const css=fs.readFileSync(new URL('../components/sourced-store-minihome.css',import.meta.url),'utf8');
 assert.match(css,/source-menu-photo\{width:78px;height:84px/);assert.match(css,/@media\(max-width:700px\).*source-menu-photo\{width:64px;height:66px/);
 assert.doesNotMatch(css,/\.explorer-results\s*\{|source-minihome-columns|1060px|source-detail-photo\s*\{/);
 const globals=fs.readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');assert.match(globals,/\.explorer-detail-photo\{width:100%;height:170px/);assert.match(globals,/\.explorer-detail-photo\{height:120px/);
});

test('a complete authoritative feed removing a source hides stale detail and selection',()=>{
 const stores=[store],harness=hookHarness();
 const state=sourceUi({react:harness.react,stores});
 const render=()=>harness.render(()=>state.Explorer({initialSourceStore:store}));
 let nodes=elements(render());assert.ok(nodes.some(node=>node.type===state.Detail));
 stores.splice(0,1);nodes=elements(render());assert.equal(nodes.some(node=>node.type===state.Detail),false);assert.equal(nodes.find(node=>node.type===state.Map).props.selectedSourceId,undefined);
});

test('multiple source menu rows preserve the clicked menu identity without numeric defaults',()=>{
 const second={...store.menus[0],id:store.sourceRef+':menu:2',name:'공공자료의 다른 메뉴'};
 const multiple={...store,menus:[store.menus[0],second]};let chosen;
 const card=ui.Card({store:multiple,onSelect:(value,menuId)=>{chosen={value,menuId}}});
 const rows=elements(card).filter(node=>node.type==='button');assert.equal(rows.length,2);rows[1].props.onClick();assert.strictEqual(chosen.value,multiple);assert.equal(chosen.menuId,second.id);
 const html=renderToStaticMarkup(React.createElement(ui.Detail,{store:multiple,menuId:chosen.menuId,preview:true,onBack(){}}));assert.match(html,/<h1>공공자료의 다른 메뉴<\/h1>/);assert.doesNotMatch(html,/<h1>회비빔국수/);
});

test('a refreshed loading/error feed drops the SSR source and filters hide a selected source',()=>{
 const sourceState={status:'ready',feed:{stores:[store],complete:true,asOf:store.source.checkedAt}},harness=hookHarness();
 const state=sourceUi({react:harness.react,sourceState});const render=()=>harness.render(()=>state.Explorer({initialSourceStore:store}));
 assert.ok(elements(render()).some(node=>node.type===state.Detail));
 sourceState.status='error';sourceState.feed=null;let nodes=elements(render());assert.equal(nodes.some(node=>node.type===state.Detail),false);assert.equal(nodes.find(node=>node.type===state.Map).props.sourcedStores.length,0);
 sourceState.status='loading';nodes=elements(render());assert.equal(nodes.some(node=>node.type===state.Detail),false);assert.equal(nodes.find(node=>node.type===state.Map).props.sourcedStores.length,0);
 sourceState.status='ready';sourceState.feed={stores:[store],complete:true,asOf:store.source.checkedAt};nodes=elements(render());assert.ok(nodes.some(node=>node.type===state.Detail));
 nodes.find(node=>node.props?.['aria-label']==='매운맛 단계').props.onChange({target:{value:'3'}});nodes=elements(render());assert.equal(nodes.some(node=>node.type===state.Detail),false);assert.equal(nodes.find(node=>node.type===state.Map).props.selectedSourceId,undefined);
});

test('Back restores the list scroll position and focuses the newly mounted source row',()=>{
 const harness=hookHarness(),state=sourceUi({react:harness.react});const render=()=>harness.render(()=>state.Explorer({previewStore:store}));
 let nodes=elements(render()),focused=null;
 const firstBody={scrollTop:128,querySelectorAll:()=>[]};nodes.find(node=>node.props?.id==='map-results').props.ref.current=firstBody;
 nodes.find(node=>node.type===state.Card).props.onSelect(store,store.menus[0].id);nodes=elements(render());harness.flushEffects();assert.equal(firstBody.scrollTop,0);
 nodes.find(node=>node.type===state.Detail).props.onBack();nodes=elements(render());
 const newRow={dataset:{sourceMenuId:store.menus[0].id},focus:options=>{focused=options}};
 const newBody={scrollTop:0,querySelectorAll:selector=>{assert.equal(selector,'[data-menu-id],[data-source-menu-id]');return [newRow]}};
 nodes.find(node=>node.props?.id==='map-results').props.ref.current=newBody;harness.flushEffects();assert.equal(newBody.scrollTop,128);assert.equal(focused.preventScroll,true);
});
