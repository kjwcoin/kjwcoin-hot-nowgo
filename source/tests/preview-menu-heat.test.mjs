import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {previewHeatMedian,replacePreviewHeat,previewMenuHeat} from '../lib/preview-menu-heat.ts';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import {sourcedStoreMarker,appendPreviewMarkerHeat} from '../lib/source-map-marker.ts';
const store=sourcePreviewStore(),menuId=store.menus[0].id;

test('preview starts empty and replaces this visitor’s vote without inventing contributors',()=>{
 const empty=previewMenuHeat({},store,menuId);assert.equal(empty.scope,'preview-local');assert.equal(empty.medianHeat,null);assert.equal(empty.sampleCount,0);assert.equal(empty.myHeat,null);
 const first=replacePreviewHeat({},store,menuId,2),again=replacePreviewHeat(first,store,menuId,5);
 assert.equal(previewMenuHeat(first,store,menuId).medianHeat,2);
 assert.deepEqual(previewMenuHeat(again,store,menuId),{scope:'preview-local',storeId:store.id,menuId,menuName:store.menus[0].name,medianHeat:5,sampleCount:1,myHeat:5});
 assert.equal(Object.keys(again).length,1);assert.equal(store.menus[0].heat,null);assert.equal(store.ownerClaimVerified,false);
 assert.equal(previewMenuHeat({},store,menuId).medianHeat,null);
});
test('canonical store and menu identities isolate votes; names, requests and other fields do not merge',()=>{
 const otherMenu={...store,menus:[...store.menus,{...store.menus[0],id:menuId+'-other'}]},otherStore={...store,id:'eac80fbe-a1c5-4ba6-9939-6527fae8af90'};
 const votes=replacePreviewHeat({},otherMenu,menuId,4);
 assert.equal(previewMenuHeat(votes,otherMenu,menuId+'-other').medianHeat,null);
 assert.equal(previewMenuHeat(votes,otherStore,menuId).medianHeat,null);
 assert.equal(previewMenuHeat(votes,{...store,requestCount:99999},menuId).medianHeat,4);
 assert.throws(()=>replacePreviewHeat(votes,store,'unknown-menu',4));
});
test('median preserves 1–5 integer input and exact half-step results without seven/eight-step conversion',()=>{
 assert.equal(previewHeatMedian([]),null);assert.equal(previewHeatMedian([5,1,3]),3);assert.equal(previewHeatMedian([1,4]),2.5);assert.equal(previewHeatMedian([1,1,4,5]),2.5);
 for(const heat of [0,6,7,8,1.5,NaN,Infinity]){assert.throws(()=>previewHeatMedian([heat]));assert.throws(()=>replacePreviewHeat({},store,menuId,heat))}
});
function dom(){const create=tag=>({tag,style:{},children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},append(...items){this.children.push(...items)}});return {createElement:create,createElementNS:(_ns,tag)=>create(tag)}}
test('map preview heat fills follow median, while unclaimed ownership pin remains gray and explicit',()=>{
 const document=dom(),link=sourcedStoreMarker(store,document),summary=previewMenuHeat(replacePreviewHeat({},store,menuId,3),store,menuId);
 appendPreviewMarkerHeat(link,store,summary,document);
 assert.equal(link.className,'map-anchor map-anchor--sourced');assert.match(link.children[1].textContent,/점주 미등록/);
 const note=link.children.at(-1);assert.equal(note.className,'map-preview-heat');assert.match(note.children[0].textContent,/미리보기 · 회비빔국수/);
 assert.deepEqual(note.children[1].children.map(frame=>frame.children[1].style.width),['100%','100%','100%','0%','0%']);
 assert.equal(note.children[2].textContent,'중앙값 3/5 · 내 입력 1건');assert.match(link.attributes['aria-label'],/실제 고객 평가 아님/);
});
test('empty, foreign and forged actual-style map summaries are not displayed as preview ratings',()=>{
 for(const change of [{medianHeat:null},{scope:'actual'},{storeId:'other'},{menuId:'other'},{sampleCount:99},{myHeat:1},{medianHeat:7}]){
  const document=dom(),link=sourcedStoreMarker(store,document),valid=previewMenuHeat(replacePreviewHeat({},store,menuId,3),store,menuId);
  appendPreviewMarkerHeat(link,store,{...valid,...change},document);assert.equal(link.children.length,2);
 }
 const source=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');assert.match(source,/if\(sourcePreview\)appendPreviewMarkerHeat\(link,store,previewSourceHeat\)/);
});
