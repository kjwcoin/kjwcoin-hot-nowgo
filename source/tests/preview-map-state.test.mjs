import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import {sourceUi,elements} from './helpers/source-ui-components.mjs';
const fixture=sourcePreviewStore();
const second={...fixture.menus[0],id:fixture.menus[0].id+':second',name:'다른 메뉴 · 테스트 전용'};
const store={...fixture,menus:[fixture.menus[0],second]};
// Local hook lifecycle fixture, not a browser or Supabase integration test.
function harness(){
 const cells=[];let cursor=0,pending=[];
 return {react:{...React,useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value}]},useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i]},useMemo:fn=>fn(),useEffect(fn,deps){const i=cursor++,old=cells[i];if(!old||!deps||deps.some((value,j)=>!Object.is(value,old.deps?.[j]))){pending.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()}})}}},render(fn){cursor=0;pending=[];return fn()},flush(){for(const fn of pending)fn();pending=[]},unmount(){for(const cell of cells)cell?.cleanup?.()}};
}
function setup(){const h=harness(),created=[],revoked=[];const URL={createObjectURL:file=>{created.push(file);return 'blob:preview-'+created.length},revokeObjectURL:url=>revoked.push(url)};const ui=sourceUi({react:h.react,globals:{URL}});const render=()=>{const nodes=elements(h.render(()=>ui.Explorer({previewStore:store})));h.flush();return nodes};let nodes=render();nodes.find(n=>n.type===ui.Card).props.onSelect(store);nodes=render();return{h,ui,created,revoked,render,detail:()=>nodes.find(n=>n.type===ui.Detail),setNodes:value=>nodes=value};}
const file={type:'image/png',size:32};

test('actual parent wiring shares validated photo, replaces/revokes URLs and rejects with an error',()=>{
 const s=setup();s.detail().props.onPreviewPhoto(store.menus[0].id,file,'@맛친구');let nodes=s.render();s.setNodes(nodes);
 assert.equal(s.detail().props.previewPhoto.url,'blob:preview-1');assert.equal(s.detail().props.previewPhoto.nickname,'@맛친구');
 assert.throws(()=>s.detail().props.onPreviewPhoto(store.menus[0].id,file,'test@example.com'),/invalid_preview_photo/);assert.throws(()=>s.detail().props.onPreviewPhoto('foreign',file,'탐험가'),/invalid_preview_photo/);assert.equal(s.created.length,1);
 s.detail().props.onPreviewPhoto(store.menus[0].id,file,'새 닉네임');nodes=s.render();s.setNodes(nodes);assert.deepEqual(s.revoked,['blob:preview-1']);assert.equal(s.detail().props.previewPhoto.nickname,'새 닉네임');
 s.detail().props.onPreviewPhoto(second.id,file,'다른 메뉴 사진');nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.menuId,second.id);assert.equal(s.detail().props.previewPhoto.url,'blob:preview-3');assert.deepEqual(s.revoked,['blob:preview-1']);
 s.detail().props.onPreviewPhotoReset();nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.previewPhoto,undefined);assert.deepEqual(s.revoked,['blob:preview-1','blob:preview-3']);
 nodes.find(n=>n.type===s.ui.Map).props.onSourceSelect(store,store.menus[0].id);nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.previewPhoto.url,'blob:preview-2');
 s.h.unmount();assert.deepEqual(s.revoked,['blob:preview-1','blob:preview-3','blob:preview-2']);
});

test('parent heat updates map and detail from one canonical latest vote; favorite persists only across local Back',()=>{
 const s=setup();s.detail().props.onPreviewHeat(store.menus[0].id,2);let nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.previewHeat.medianHeat,2);assert.equal(nodes.find(n=>n.type===s.ui.Map).props.previewSourceHeat.medianHeat,2);
 s.detail().props.onPreviewHeat(store.menus[0].id,5);nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.previewHeat.sampleCount,1);assert.equal(s.detail().props.previewHeat.medianHeat,5);
 s.detail().props.onPreviewFavoriteToggle();nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.previewFavorite,true);
 s.detail().props.onBack();nodes=s.render();nodes.find(n=>n.type===s.ui.Card).props.onSelect(store,second.id);nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.previewFavorite,true);assert.equal(s.detail().props.previewHeat.medianHeat,null);assert.equal(s.detail().props.previewHeat.sampleCount,0);
 s.detail().props.onPreviewHeatReset();nodes=s.render();nodes.find(n=>n.type===s.ui.Map).props.onSourceSelect(store,store.menus[0].id);nodes=s.render();s.setNodes(nodes);assert.equal(s.detail().props.previewHeat.medianHeat,null);
 assert.equal(fixture.menus[0].heat,null);assert.equal(fixture.ownerClaimVerified,false);s.h.unmount();const fresh=setup();assert.equal(fresh.detail().props.previewFavorite,false);assert.equal(fresh.detail().props.previewHeat.medianHeat,null);fresh.h.unmount();
});

test('actual composed SSR includes working preview controls and existing character art without account XP fabrication',()=>{
 const ui=sourceUi();const html=renderToStaticMarkup(React.createElement(ui.Mini,{store:fixture,preview:true}));
 for(const label of ['내 단골리스트 관리','탐험가 · 캐릭터 미리보기','로그인 후 확인','먹어본 메뉴 맵기 제보','사진 제보','매장정보 제보'])assert.ok(html.includes(label),label);
 assert.match(html,/characters-growth\.webp/);assert.match(html,/nowgo-red\.png/);assert.doesNotMatch(html,/data-live-component|method="post"|type="hidden"|\b0 EXP\b|계정 인증 완료/);
 const nodes=elements(ui.Detail({store:fixture,preview:true,onBack(){},onPreviewHeat(){},onPreviewPhoto(){},onPreviewFavoriteToggle(){}}));assert.equal(typeof nodes.find(n=>n.type===ui.PreviewHeat).props.onPreviewHeat,'function');assert.equal(typeof nodes.find(n=>n.type===ui.PreviewPhoto).props.onPreviewPhoto,'function');assert.equal(typeof nodes.find(n=>n.type===ui.PreviewRegular).props.onToggle,'function');
});

test('live source detail never receives local demo actions, photos, favorite or map heat',()=>{
 const h=harness(),ui=sourceUi({react:h.react,stores:[fixture]});const nodes=elements(h.render(()=>ui.Explorer({initialSourceStore:fixture})));const detail=nodes.find(n=>n.type===ui.Detail);assert.equal(detail.props.preview,false);for(const prop of ['onPreviewHeat','previewHeat','previewPhoto','onPreviewPhoto','onPreviewFavoriteToggle','previewFavorite'])assert.equal(detail.props[prop],undefined,prop);const map=nodes.find(n=>n.type===ui.Map);assert.equal(map.props.sourcePreview,false);assert.equal(map.props.previewSourceHeat,undefined);
});
