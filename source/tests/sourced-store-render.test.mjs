import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourceStore,sixSources} from './fixtures/sourced-stores.mjs';
import {sourceUi} from './helpers/source-ui-components.mjs';
const {Card,Notice}=sourceUi();
test('rendered source cards expose canonical mini-pages and known facts without phantom media/prices/reports',()=>{
 const html=renderToStaticMarkup(React.createElement('section',{},sixSources.map(store=>React.createElement(Card,{store,key:store.id}))));
 assert.equal((html.match(/class="source-store-legacy-card"/g)||[]).length,6);
 assert.equal((html.match(/https:\/\/hot.nowgo.space\/p\/source-store-/g)||[]).length,6);
 assert.match(html,/공공자료 등록 · 점주 미등록/);assert.match(html,/가격 미확인/);assert.match(html,/맵기 미확인/);assert.match(html,/사진 미등록/);
 assert.match(html,/explorer-store-name/);assert.match(html,/class="explorer-menu-item"/);assert.doesNotMatch(html,/explorer-menu-item reporter-store/);assert.match(html,/explorer-item-copy/);assert.doesNotMatch(html,/reportStore|맵기 제보|참여 고객 0명/);
 assert.match(html,/src="\/images\/nowgo-red.png"/);assert.doesNotMatch(html,/0원|소비자 제보|1단계|현재 영업/);
});
test('rendered null-location and verified-without-menu states remain explicit',()=>{
 const unknown=renderToStaticMarkup(React.createElement(Card,{store:sourceStore(1,{coordinates:null})}));assert.match(unknown,/지도 위치 미확인/);
 const verified=renderToStaticMarkup(React.createElement(Card,{store:sourceStore(1,{ownership:'verified',ownerClaimVerified:true,pinStatus:'owner-verified'})}));assert.match(verified,/점주 확인 · 공공자료 메뉴/);assert.doesNotMatch(verified,/점주 미등록/);assert.match(verified,/가격 미확인/);assert.match(verified,/맵기 미확인/);
});
test('rendered feed failure/partial/loading are disclosed, success does not add redundant notices',()=>{
 const render=state=>renderToStaticMarkup(React.createElement(Notice,{state,retry:()=>{}}));
 assert.match(render({status:'error',feed:null}),/전체 매장은 아니에요/);assert.match(render({status:'error',feed:null}),/다시 확인/);
 assert.match(render({status:'loading',feed:null}),/불러오는 중/);assert.match(render({status:'ready',feed:{complete:false}}),/일부만 확인/);
 assert.equal(render({status:'ready',feed:{complete:true}}),'');
});
