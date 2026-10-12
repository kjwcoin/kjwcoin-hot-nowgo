import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as clustering from '../lib/map-store-clusters.ts';
import {mapStoreGroups,sourceIsPrimaryPin} from '../lib/map-sourced-stores.ts';
import {storePinMenu,hasVerifiedOwner} from '../lib/menu-store-groups.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
import {readViewportBounds} from '../lib/viewport-count-client.ts';
import {sourcedStoreMarker,bindSourceMarkerSelection,appendPreviewMarkerHeat} from '../lib/source-map-marker.ts';
import {money} from '../lib/menus.ts';
import {menuHeatAttribution} from '../lib/menu-heat-attribution.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';

// Local SDK/DOM mock regression only: execute the actual component effect bodies.
// This does not load React, a browser, map tiles, live Kakao, a key, or any network.
// Effect cleanup/remount is driven explicitly, matching a React dependency change.
const component=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('kakao-map.tsx',component,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const effects={};let gate;
function visit(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='clusteringEnabled')gate=node.initializer.getText(ast);
 if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'){
  const text=node.arguments[0]?.getText(ast)||'';
  if(text.includes('createStoreOverlayReconciler'))effects.mount=text;
  if(text.includes('sourceIdentityStores.find(store=>store.id===selectedSourceId)'))effects.selection=text;
 }
 ts.forEachChild(node,visit);
}
visit(ast);
assert.ok(effects.mount&&effects.selection&&gate,'Locate the actual layer, selection, and variant-gating implementation');
const compiled=ts.transpileModule(Object.entries(effects).map(([name,body])=>`exports.${name} = ${body};`).join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const initialBounds={south:37,north:38,west:126,east:128};
const report={id:'report-a',placeId:'reported-a',shop:'제보 식당',area:'서울 중구 제보길 1',name:'매운 메뉴',price:12000,heat:2,flavor:'칼칼한',category:'닭발',image:'/photo',lat:37.56,lng:126.99,isDemo:false,description:'회원 제보',verifiedOwner:false,ownerRegistered:false};

function harness(options={}){
 const stats={created:0,removed:0,relayouts:0,centers:[],levels:[],pans:[],focus:[],selected:[],sourceSelected:[]};
 const frames=new Map(),listeners=new Map(),observers=[],live=new Set();let nextFrame=0,cleanup;
 const dom={activeElement:null,createElement(tag){return new Element(tag)},createElementNS(namespace,tag){return new Element(tag)}};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.attributes={};this.children=[];this.style={};this.className='';this.isConnected=false;this.textContent='';}
  setAttribute(name,value){this.attributes[name]=String(value)}
  getAttribute(name){return this.attributes[name]??(name==='target'?this.target??null:null)}
  removeAttribute(name){delete this.attributes[name];if(name==='target')delete this.target}
  append(...children){this.children.push(...children);for(const child of children)child.isConnected=this.isConnected}
  focus(options){stats.focus.push({element:this,options,connected:this.isConnected});if(this.isConnected)dom.activeElement=this}
 }
 dom.body=dom.createElement('body');dom.body.isConnected=true;dom.activeElement=dom.body;
 const canvas=dom.createElement('div');canvas.isConnected=true;canvas.tabIndex=-1;
 const outside=dom.createElement('button');outside.isConnected=true;
 const state={level:options.level??8,bounds:{...initialBounds}};
 function emit(name){for(const callback of [...listeners.get(name)||[]])callback()}
 const map={
  getProjection:()=>({containerPointFromCoords:point=>options.project?options.project(point,state):({x:50+(point.lng-126.98)*10000*2**(8-state.level),y:50+(point.lat-37.55)*10000*2**(8-state.level)})}),
  getBounds:()=>({getSouthWest:()=>({getLat:()=>state.bounds.south,getLng:()=>state.bounds.west}),getNorthEast:()=>({getLat:()=>state.bounds.north,getLng:()=>state.bounds.east})}),
  getLevel:()=>state.level,
  setLevel(level){state.level=level;stats.levels.push(level);emit('zoom_changed');emit('idle')},
  setCenter(position){stats.centers.push(position);emit('idle')},
  panTo(position){stats.pans.push(position);emit('idle')},
  relayout(){stats.relayouts++},
 };
 Object.assign(map,options.mapOverrides);
 const k={maps:{
  LatLng:class{constructor(lat,lng){this.lat=lat;this.lng=lng}getLat(){return this.lat}getLng(){return this.lng}},
  CustomOverlay:class{
   constructor(options){this.options=options;stats.created++;live.add(this);options.content.isConnected=true}
   setMap(value){assert.equal(value,null);if(live.delete(this)){stats.removed++;this.options.content.isConnected=false;if(dom.activeElement===this.options.content)dom.activeElement=dom.body}}
  },
  event:{
   addListener(target,name,callback){assert.strictEqual(target,map);if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(callback)},
   removeListener(target,name,callback){assert.strictEqual(target,map);assert.ok(listeners.get(name)?.delete(callback),'Remove the exact registered callback');if(!listeners.get(name).size)listeners.delete(name)},
  },
 }};
 const sources=options.sources??[sourceStore(1),sourceStore(2)];
 const context={
  exports:{},mapState:'ready',mapRef:{current:map},kakaoRef:{current:k},overlaysRef:{current:[]},rootRef:{current:{}},canvasRef:{current:canvas},
  menus:options.menus??[],sourcedStores:sources,sourceIdentityStores:options.identitySources??sources,
  appLocationBridge:false,selectedId:undefined,selectedSourceId:undefined,sourceSelectionEnabled:options.sourceSelectionEnabled??true,
  sourcePreview:options.sourcePreview??false,previewSourceHeat:undefined,variant:options.variant??'hot',
  callbacksRef:{current:{onSelect:menu=>stats.selected.push(menu),onSourceSelect:store=>stats.sourceSelected.push(store)}},
  ...clustering,mapStoreGroups,sourceIsPrimaryPin,storePinMenu,hasVerifiedOwner,isKoreanCoordinate,readViewportBounds,money,menuHeatAttribution,
  document:dom,
  sourcedStoreMarker:store=>sourcedStoreMarker(store,dom),bindSourceMarkerSelection,
  appendPreviewMarkerHeat:(link,store,summary)=>appendPreviewMarkerHeat(link,store,summary,dom),
  storeClusterButton:(count,onZoom)=>clustering.storeClusterButton(count,onZoom,dom),
  requestAnimationFrame(callback){const id=++nextFrame;frames.set(id,callback);return id},
  cancelAnimationFrame(id){frames.delete(id)},
  ResizeObserver:class{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this)}observe(target){this.target=target}disconnect(){this.disconnected=true}},
 };
 vm.createContext(context);vm.runInContext(compiled,context);
 const mount=()=>{context.clusteringEnabled=vm.runInContext(gate,context);cleanup=context.exports.mount()};
 const unmount=()=>{cleanup?.();cleanup=undefined};
 const nodes=()=>[...live].map(overlay=>overlay.options.content);
 const clusters=()=>nodes().filter(node=>node.className.startsWith('map-store-cluster'));
 const singles=()=>nodes().filter(node=>!node.className.startsWith('map-store-cluster'));
 const flush=()=>{const ready=[...frames.values()];frames.clear();for(const callback of ready)callback()};
 const click=(node,detail=1,extras={})=>{
  const event={detail,button:0,defaultPrevented:false,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.propagationStopped=true},...extras};
  node.onclick?.(event);return event;
 };
 mount();
 return {stats,state,dom,canvas,outside,map,context,frames,listeners,observers,live,nodes,clusters,singles,emit,flush,click,unmount,
  update(props){unmount();Object.assign(context,props);mount()},
  runSelection(){context.exports.selection()},
 };
}

// Every test drives only the deterministic mock environment described above.
test('SDK/DOM mock: initial invalid or throwing SDK reads fall back to existing pins with working cleanup',()=>{
 const failures=[
  ...['getBounds','getProjection','getLevel'].map(name=>({[name]:()=>{throw Error('temporary SDK read failure')}})),
  {getBounds:()=>null},{getProjection:()=>({})},{getLevel:()=>NaN},
  {getProjection:()=>({containerPointFromCoords:()=>{throw Error('temporary point projection failure')}})},
 ];
 for(const mapOverrides of failures){const h=harness({mapOverrides});assert.equal(h.singles().length,2);assert.equal(h.clusters().length,0);assert.equal(h.listeners.size,2);h.unmount();assert.equal(h.live.size,0);assert.equal(h.listeners.size,0)}
});

test('SDK/DOM mock: a later SDK read failure keeps pins usable and a restored read reclusters',()=>{
 const h=harness(),original=h.map.getProjection;assert.equal(h.clusters().length,1);
 h.map.getProjection=()=>{throw Error('temporary failure')};h.emit('idle');h.flush();assert.equal(h.singles().length,2);
 h.click(h.singles()[0]);assert.equal(h.stats.sourceSelected.length,1);
 h.map.getProjection=original;h.emit('idle');h.flush();assert.equal(h.clusters().length,1);h.unmount();assert.equal(h.live.size,0);
});

test('SDK/DOM mock: HOT zoom-out clusters, zoom-in restores existing source pins, repeated idle retains overlays',()=>{
 const sources=[sourceStore(1,{registrationState:'source-only'}),sourceStore(2,{registrationState:'source-only'})],before=JSON.stringify(sources);
 const h=harness({level:4,sources});assert.equal(h.singles().length,2);assert.equal(h.clusters().length,0);
 const hrefs=h.singles().map(node=>node.href);
 h.map.setLevel(8);h.flush();assert.equal(h.clusters().length,1);assert.equal(h.clusters()[0].textContent,'2');assert.equal(h.singles().length,0);
 const created=h.stats.created;h.emit('idle');h.flush();assert.equal(h.stats.created,created);
 h.map.setLevel(4);h.flush();assert.deepEqual(h.singles().map(node=>node.href),hrefs);assert.ok(h.singles().every(node=>node.className==='map-anchor map-anchor--sourced'));
 assert.equal(JSON.stringify(sources),before);h.unmount();assert.equal(h.live.size,0);
});

test('SDK/DOM mock: mouse cluster activation zooms without stealing focus or selecting a store',()=>{
 const h=harness({level:6});h.outside.focus();const event=h.click(h.clusters()[0],1);
 assert.equal(event.defaultPrevented,true);assert.equal(event.propagationStopped,true);assert.equal(h.state.level,4);assert.equal(h.stats.centers.length,1);
 h.flush();assert.equal(h.singles().length,2);assert.strictEqual(h.dom.activeElement,h.outside);assert.equal(h.stats.focus.length,1);
 assert.equal(h.stats.selected.length+h.stats.sourceSelected.length,0);h.unmount();
});

test('SDK/DOM mock: keyboard activation focuses a newly-created child cluster, then a newly-created source pin',()=>{
 const h=harness({sources:[sourceStore(1),sourceStore(2),sourceStore(3),sourceStore(4)]});
 const original=h.clusters()[0];original.focus();h.click(original,0);h.flush();
 assert.equal(h.state.level,6);assert.equal(h.clusters().length,2);
 const child=h.dom.activeElement;assert.ok(h.clusters().includes(child));assert.notStrictEqual(child,original);assert.equal(original.isConnected,false);
 h.click(child,0);h.flush();assert.equal(h.state.level,4);assert.equal(h.singles().length,4);assert.ok(h.singles().includes(h.dom.activeElement));
 assert.ok(h.stats.focus.every(call=>call.connected),'Focus only after CustomOverlay attaches newly created content');
 assert.equal(h.stats.focus.at(-1).options.preventScroll,true);h.unmount();
});

test('SDK/DOM mock: keyboard activation can retain the surviving cluster button',()=>{
 const h=harness({sources:[sourceStore(1),sourceStore(2)]}),original=h.clusters()[0];original.focus();h.click(original,0);h.flush();
 assert.equal(h.state.level,6);assert.strictEqual(h.clusters()[0],original);assert.strictEqual(h.dom.activeElement,original);assert.equal(h.stats.created,1);h.unmount();
});

test('SDK/DOM mock: keyboard activation falls back to a focusable canvas when no child survives the viewport',()=>{
 assert.match(component,/className="map-canvas"[^>]*tabIndex=\{-1\}/);
 const h=harness({level:6});h.clusters()[0].focus();h.click(h.clusters()[0],0);h.state.bounds={south:35,north:36,west:126,east:128};h.flush();
 assert.equal(h.live.size,0);assert.strictEqual(h.dom.activeElement,h.canvas);assert.equal(h.stats.focus.at(-1).options.preventScroll,true);h.unmount();
});

test('SDK/DOM mock: source selection keeps the exact source object and list selection centers its existing coordinates',()=>{
 const source=sourceStore(1,{registrationState:'source-only'}),h=harness({level:4,sources:[source]});
 const link=h.singles()[0],event=h.click(link);assert.equal(event.defaultPrevented,true);assert.strictEqual(h.stats.sourceSelected[0],source);
 h.update({selectedSourceId:source.id});assert.equal(h.singles()[0].getAttribute('aria-current'),'true');
 h.runSelection();h.flush();assert.equal(h.state.level,4);assert.equal(h.stats.pans.at(-1).lat,source.coordinates.lat);assert.equal(h.stats.pans.at(-1).lng,source.coordinates.lon);
 h.click(h.singles()[0],1,{ctrlKey:true});assert.equal(h.stats.sourceSelected.length,1,'Modified clicks keep their direct-link behavior');h.unmount();
});

test('SDK/DOM mock: catalog pin and list selection preserve the selected menu, reports, heat, and callbacks',()=>{
 const menus=[{...report},{...report,id:'report-b',name:'다른 메뉴',heat:5}],before=JSON.stringify(menus),h=harness({level:4,sources:[],menus});
 h.update({selectedId:'report-b'});assert.equal(h.singles().length,1);const button=h.singles()[0];assert.match(button.className,/selected/);assert.match(button.getAttribute('aria-label'),/다른 메뉴/);
 h.click(button);assert.equal(h.stats.selected[0].id,'report-b');assert.equal(h.stats.selected[0].heat,5);assert.equal(h.stats.selected[0].reportCount,2);
 h.runSelection();h.flush();assert.equal(h.stats.pans.at(-1).lat,report.lat);assert.equal(h.stats.pans.at(-1).lng,report.lng);
 let refreshed;h.context.callbacksRef.current.onSelect=menu=>{refreshed=menu};h.click(button);assert.equal(refreshed.id,'report-b');assert.equal(JSON.stringify(menus),before);h.unmount();
});

test('SDK/DOM mock: rapid idle, zoom, and resize bursts coalesce, cleanup cancels pending work and late callbacks',()=>{
 const h=harness(),stale=[...h.listeners.values()].flatMap(callbacks=>[...callbacks]);
 for(let i=0;i<50;i++){h.emit('idle');h.emit('zoom_changed');h.observers[0].callback()}
 assert.equal(h.frames.size,1);h.flush();assert.equal(h.stats.created,1);h.emit('idle');assert.equal(h.frames.size,1);
 const pending=[...h.frames.values()],created=h.stats.created;h.unmount();assert.equal(h.frames.size,0);assert.equal(h.listeners.size,0);assert.ok(h.observers.every(observer=>observer.disconnected));assert.equal(h.live.size,0);
 for(const callback of [...stale,...pending])callback();assert.equal(h.frames.size,0);assert.equal(h.live.size,0);assert.equal(h.stats.created,created);h.unmount();
});

test('SDK/DOM mock: filter changes, empty results, pan-out and remount remove stale overlays',()=>{
 const sources=[sourceStore(1),sourceStore(2)],h=harness({sources}),old=h.clusters()[0];
 h.emit('idle');h.update({sourcedStores:[sources[0]]});assert.equal(h.frames.size,0);assert.equal(old.isConnected,false);assert.equal(h.singles().length,1);
 h.update({sourcedStores:[]});assert.equal(h.live.size,0);assert.equal(h.context.overlaysRef.current.length,0);
 h.update({sourcedStores:sources});assert.equal(h.clusters().length,1);h.state.bounds={south:35,north:36,west:126,east:128};h.emit('idle');h.flush();assert.equal(h.live.size,0);
 h.state.bounds={...initialBounds};h.emit('idle');h.flush();assert.equal(h.clusters().length,1);h.unmount();assert.equal(h.stats.created,h.stats.removed);
});

for(const variant of ['rich','sweet'])test(`SDK/DOM mock: ${variant.toUpperCase()} preserves individual pins and installs no cluster refresh listeners`,()=>{
 const h=harness({variant,level:10});assert.equal(h.clusters().length,0);assert.equal(h.singles().length,2);assert.equal(h.listeners.size,0);assert.equal(h.observers.length,0);
 h.map.setLevel(12);assert.equal(h.frames.size,0);assert.equal(h.singles().length,2);h.unmount();assert.equal(h.live.size,0);
});

test('SDK/DOM mock: HOT sourcePreview remains unclustered with preview links and separate read-only source data',()=>{
 const sources=[sourceStore(1,{registrationState:'source-only'}),sourceStore(2,{registrationState:'source-only'})],before=JSON.stringify(sources);
 const h=harness({sources,sourcePreview:true,sourceSelectionEnabled:false,level:10});assert.equal(h.clusters().length,0);assert.equal(h.singles().length,2);assert.equal(h.listeners.size,0);assert.equal(h.observers.length,0);
 for(const link of h.singles()){assert.match(link.href,/^\/p\/source-store-\d+\?preview=source$/);assert.equal(link.target,undefined);assert.equal(link.onclick,undefined)}
 assert.equal(JSON.stringify(sources),before);h.unmount();assert.equal(h.live.size,0);
});

test('SDK/DOM mock: changing HOT to RICH and back disposes the old mode cleanly',()=>{
 const h=harness();h.emit('idle');h.update({variant:'rich'});assert.equal(h.frames.size,0);assert.equal(h.listeners.size,0);assert.equal(h.clusters().length,0);assert.equal(h.singles().length,2);
 h.update({variant:'hot'});assert.equal(h.clusters().length,1);assert.equal(h.singles().length,0);assert.equal(h.listeners.size,2);h.unmount();assert.equal(h.stats.created,h.stats.removed);
});
