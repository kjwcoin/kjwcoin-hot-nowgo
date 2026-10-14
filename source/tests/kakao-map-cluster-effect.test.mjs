import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {storeOverlapContent} from '../lib/map-store-overlap.ts';
import * as clustering from '../lib/map-store-clusters.ts';
import {mapStoreGroups,sourceIsPrimaryPin} from '../lib/map-sourced-stores.ts';
import {storePinMenu,hasVerifiedOwner} from '../lib/menu-store-groups.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
import {loadedMapStoreCount} from '../lib/loaded-map-count.ts';
import {readViewportBounds} from '../lib/viewport-count-client.ts';
import {sourcedStoreMarker,bindSourceMarkerSelection,appendPreviewMarkerHeat} from '../lib/source-map-marker.ts';
import {money} from '../lib/menus.ts';
import {menuHeatAttribution} from '../lib/menu-heat-attribution.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';

// Local SDK/DOM mock regression only: execute the actual component effect bodies.
// This does not load React, a browser, map tiles, live Kakao, a key, or any network.
// Real dependency arrays drive cleanup/remount versus an in-place data update.
const component=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('kakao-map.tsx',component,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const effects={},dependencies={};let gate,inputDefaults;
function visit(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='clusteringEnabled')gate=node.initializer.getText(ast);
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='overlayInputsRef')inputDefaults=node.initializer.arguments[0].getText(ast);
 if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'){
  const text=node.arguments[0]?.getText(ast)||'';
  if(text.includes('createStoreOverlayReconciler')){effects.mount=text;dependencies.mount=node.arguments[1].getText(ast)}
  if(text.includes('overlayInputsRef.current=')){effects.inputs=text;dependencies.inputs=node.arguments[1].getText(ast)}
  if(text.includes('sourceIdentityStores.find(store=>store.id===selectedSourceId)'))effects.selection=text;
 }
 ts.forEachChild(node,visit);
}
visit(ast);
assert.ok(effects.mount&&effects.inputs&&effects.selection&&gate&&inputDefaults,'Locate the actual layer, data update, selection, refs, and variant gating');
const compiled=ts.transpileModule([...Object.entries(effects).map(([name,body])=>`exports.${name} = ${body};`),...Object.entries(dependencies).map(([name,body])=>`exports.${name}Dependencies = () => (${body});`)].join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const initialBounds={south:37,north:38,west:126,east:128};
const report={id:'report-a',placeId:'reported-a',shop:'제보 식당',area:'서울 중구 제보길 1',name:'매운 메뉴',price:12000,heat:2,flavor:'칼칼한',category:'닭발',image:'/photo',lat:37.56,lng:126.99,isDemo:false,description:'회원 제보',verifiedOwner:false,ownerRegistered:false};

function harness(options={}){
 const stats={created:0,removed:0,relayouts:0,centers:[],levels:[],pans:[],focus:[],selected:[],sourceSelected:[]};
 const frames=new Map(),listeners=new Map(),listenerTargets=new WeakMap(),observers=[],live=new Set();let nextFrame=0,cleanup;
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
 const canvas=dom.createElement('div');canvas.isConnected=true;canvas.tabIndex=-1;canvas.clientWidth=1100;canvas.clientHeight=560;
 const outside=dom.createElement('button');outside.isConnected=true;
 const state={level:options.level??8,bounds:{...initialBounds}};
 function emit(name){for(const callback of [...listeners.get(name)||[]])callback()}
 let map={
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
   addListener(target,name,callback){assert.strictEqual(target,map);listenerTargets.set(callback,target);if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(callback)},
   removeListener(target,name,callback){assert.strictEqual(target,listenerTargets.get(callback),'Remove listener from its original map');assert.ok(listeners.get(name)?.delete(callback),'Remove the exact registered callback');if(!listeners.get(name).size)listeners.delete(name)},
  },
 }};
 const sources=options.sources??[sourceStore(1),sourceStore(2)];
 const context={
  exports:{},selectionTargetRef:{current:null},mapState:'ready',mapRevision:1,mapRef:{current:map},kakaoRef:{current:k},overlaysRef:{current:[]},rootRef:{current:{}},canvasRef:{current:canvas},overlayInputsRef:{current:null},refreshOverlaysRef:{current:null},
  menus:options.menus??[],sourcedStores:sources,sourceIdentityStores:options.identitySources??sources,
  appLocationBridge:false,selectedId:undefined,selectedSourceId:undefined,sourceSelectionEnabled:options.sourceSelectionEnabled??true,
  sourcePreview:options.sourcePreview??false,previewSourceHeat:undefined,variant:options.variant??'hot',
  callbacksRef:{current:{onSelect:menu=>stats.selected.push(menu),onSourceSelect:store=>stats.sourceSelected.push(store)}},
  loadedMapStoreCount,setLoadedVisibleCount:count=>{stats.visibleCount=count},...clustering,mapStoreGroups,sourceIsPrimaryPin,storePinMenu,hasVerifiedOwner,isKoreanCoordinate,readViewportBounds,money,menuHeatAttribution,
  document:dom,
  storeOverlapContent:options=>storeOverlapContent({...options,dom}),
  sourcedStoreMarker:store=>sourcedStoreMarker(store,dom),bindSourceMarkerSelection,
  appendPreviewMarkerHeat:(link,store,summary)=>appendPreviewMarkerHeat(link,store,summary,dom),
  storeClusterButton:(count,onZoom)=>clustering.storeClusterButton(count,onZoom,dom),
  requestAnimationFrame(callback){const id=++nextFrame;frames.set(id,callback);return id},
  cancelAnimationFrame(id){frames.delete(id)},
  ResizeObserver:class{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this)}observe(target){this.target=target}disconnect(){this.disconnected=true}},
 };
 vm.createContext(context);vm.runInContext(compiled,context);
 context.overlayInputsRef.current=vm.runInContext('('+inputDefaults+')',context);
 let mounted=false,lastInputs,lastMount;
 const unmount=()=>{cleanup?.();cleanup=undefined;mounted=false};
 const changed=(previous,next)=>!previous||next.some((value,index)=>!Object.is(value,previous[index]));
 const mount=()=>{
  context.clusteringEnabled=vm.runInContext(gate,context);
  const nextInputs=context.exports.inputsDependencies(),nextMount=context.exports.mountDependencies();
  if(mounted&&changed(lastMount,nextMount))unmount();
  if(!mounted||changed(lastInputs,nextInputs))context.exports.inputs();
  if(!mounted){cleanup=context.exports.mount();mounted=true}
  lastInputs=nextInputs;lastMount=nextMount;
 };
 const nodes=()=>[...live].map(overlay=>overlay.options.content);
 const clusters=()=>nodes().filter(node=>node.className.startsWith('map-store-cluster'));
 const singles=()=>nodes().filter(node=>!node.className.startsWith('map-store-cluster'));
 const flush=()=>{const ready=[...frames.values()];frames.clear();for(const callback of ready)callback()};
 const click=(node,detail=1,extras={})=>{
  const event={detail,button:0,defaultPrevented:false,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.propagationStopped=true},...extras};
  node.onclick?.(event);return event;
 };
 mount();
 return {stats,state,dom,canvas,outside,get map(){return map},context,frames,listeners,observers,live,nodes,clusters,singles,emit,flush,click,unmount,
  update(props){Object.assign(context,props);if('sourcedStores' in props&&!('sourceIdentityStores' in props)&&!options.identitySources)context.sourceIdentityStores=props.sourcedStores;mount()},
  replaceMap(){map={...map};context.mapRef.current=map;context.mapRevision++;mount();return map},
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
 for(const mapOverrides of failures){const h=harness({mapOverrides});assert.equal(h.singles().length,2);assert.equal(h.clusters().length,0);assert.equal(h.listeners.size,3);h.unmount();assert.equal(h.live.size,0);assert.equal(h.listeners.size,0)}
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
 h.update({variant:'hot'});assert.equal(h.clusters().length,1);assert.equal(h.singles().length,0);assert.equal(h.listeners.size,3);h.unmount();assert.equal(h.stats.created,h.stats.removed);
});

test('SDK/DOM mock: repeated equivalent fresh feeds preserve the exact focused cluster and its listeners',()=>{
 const sources=[sourceStore(1),sourceStore(2),sourceStore(3),sourceStore(4)],h=harness({sources}),original=h.clusters()[0];
 original.focus();const listeners=[...h.listeners.values()].flatMap(callbacks=>[...callbacks]);
 for(let i=0;i<5;i++){
  const fresh=structuredClone(sources);if(i%2)fresh.reverse();
  h.update({sourcedStores:fresh});h.emit('idle');h.flush();
  assert.strictEqual(h.clusters()[0],original);assert.strictEqual(h.dom.activeElement,original);assert.equal(original.isConnected,true);
 }
 assert.equal(h.stats.created,1);assert.equal(h.stats.removed,0);assert.equal(h.stats.focus.length,1,'No synthetic refocus on an equivalent refresh');
 assert.equal(h.observers.length,1);assert.equal(h.stats.relayouts,1);assert.deepEqual([...h.listeners.values()].flatMap(callbacks=>[...callbacks]),listeners);
 h.click(original,0);h.flush();assert.ok(h.clusters().includes(h.dom.activeElement),'The retained cluster still supports keyboard zoom');
 h.unmount();assert.equal(h.live.size,0);assert.equal(h.listeners.size,0);
});

test('SDK/DOM mock: equivalent source and reported pins keep real focus but select the fresh records',()=>{
 const source=sourceStore(1),h=harness({level:4,sources:[source],menus:[{...report}]}),[link,button]=[h.singles().find(node=>node.tagName==='A'),h.singles().find(node=>node.tagName==='BUTTON')];
 const fresh=structuredClone(source);link.focus();h.update({sourcedStores:[fresh],menus:[{...report}]});
 assert.ok(h.singles().includes(link));assert.strictEqual(h.dom.activeElement,link);h.click(link);assert.strictEqual(h.stats.sourceSelected.at(-1),fresh);
 button.focus();h.update({sourcedStores:[structuredClone(source)],menus:[{...report}]});assert.ok(h.singles().includes(button));assert.strictEqual(h.dom.activeElement,button);
 let selected;h.context.callbacksRef.current.onSelect=menu=>{selected=menu};h.click(button);assert.equal(selected.id,report.id);assert.equal(selected.reportCount,1);
 assert.equal(h.stats.created,2);assert.equal(h.stats.focus.length,2);h.unmount();
});

test('SDK/DOM mock: same-source identity changes replace coordinates, claims, names, menus, and selected state immediately',()=>{
 const initial=sourceStore(1,{ownerClaimVerified:true,ownership:'verified',pinStatus:'owner-verified'}),h=harness({level:4,sources:[initial]});
 let previous=h.singles()[0];previous.focus();assert.match(previous.className,/sourced-verified/);
 const fresh=structuredClone(initial);Object.assign(fresh,{name:'새 자료명',ownerClaimVerified:false,ownership:'unclaimed',pinStatus:'gray',coordinates:{lat:37.62,lon:127.04}});
 fresh.menus[0]={...fresh.menus[0],name:'새 메뉴',price:15000,heat:4};
 h.update({sourcedStores:[fresh],selectedSourceId:fresh.id});const link=h.singles()[0];
 assert.notStrictEqual(link,previous);assert.equal(previous.isConnected,false);assert.strictEqual(h.dom.activeElement,link);
 assert.doesNotMatch(link.className,/sourced-verified/);assert.match(link.className,/selected/);assert.equal(link.getAttribute('aria-current'),'true');assert.match(link.getAttribute('aria-label'),/새 자료명/);
 const overlay=[...h.live][0];assert.equal(overlay.options.position.lat,37.62);assert.equal(overlay.options.position.lng,127.04);
 h.click(link);assert.strictEqual(h.stats.sourceSelected.at(-1),fresh);assert.equal(h.stats.sourceSelected.at(-1).menus[0].price,15000);
 previous=link;h.update({sourceSelectionEnabled:false});assert.equal(previous.isConnected,false);assert.equal(h.singles()[0].onclick,undefined);assert.equal(h.singles()[0].target,'_blank');h.unmount();
});

test('SDK/DOM mock: same-report identity refresh cannot retain old heat, price, ownership, coordinates, or selection',()=>{
 const initial={...report,verifiedOwner:true,ownerClaimVerified:true},h=harness({level:4,sources:[],menus:[initial]}),old=h.singles()[0];old.focus();
 const fresh={...report,name:'새 제보 메뉴',price:19000,heat:5,lat:37.61,lng:127.05};h.update({menus:[fresh],selectedId:fresh.id});const button=h.singles()[0];
 assert.notStrictEqual(button,old);assert.equal(old.isConnected,false);assert.strictEqual(h.dom.activeElement,button);assert.match(button.className,/map-anchor--reported/);assert.match(button.className,/selected/);
 assert.match(button.getAttribute('aria-label'),/새 제보 메뉴/);assert.match(button.getAttribute('aria-label'),/19,000원/);assert.doesNotMatch(button.getAttribute('aria-label'),/소유권 확인 매장/);assert.equal(button.children[0].style.backgroundPosition,'100% 0%');
 const position=[...h.live][0].options.position;assert.equal(position.lat,37.61);assert.equal(position.lng,127.05);
 h.click(button);assert.equal(h.stats.selected.at(-1).heat,5);assert.equal(h.stats.selected.at(-1).verifiedOwner,false);assert.equal(h.stats.selected.at(-1).price,19000);h.unmount();
});

test('SDK/DOM mock: refreshed cluster seed coordinates and membership use the current data',()=>{
 const sources=[sourceStore(1),sourceStore(2)],h=harness({sources}),original=h.clusters()[0];original.focus();
 const moved=sources.map(source=>({...source,coordinates:{lat:source.coordinates.lat+.01,lon:source.coordinates.lon+.01}}));h.update({sourcedStores:moved});const changed=h.clusters()[0];
 assert.notStrictEqual(changed,original);assert.equal(original.isConnected,false);assert.strictEqual(h.dom.activeElement,changed);
 const position=[...h.live][0].options.position;assert.equal(position.lat,moved[0].coordinates.lat);assert.equal(position.lng,moved[0].coordinates.lon);
 h.click(changed,1);assert.equal(h.stats.centers.at(-1).lat,moved[0].coordinates.lat);h.flush();
 const extra=sourceStore(3,{coordinates:{lat:moved[0].coordinates.lat,lon:moved[0].coordinates.lon}});h.update({sourcedStores:[...moved,extra]});assert.equal(h.clusters()[0].textContent,'3');
 h.map.setLevel(4);h.flush();h.click(h.singles().find(node=>node.className!=='map-store-overlap'));assert.ok([...moved,extra].includes(h.stats.sourceSelected.at(-1)));h.unmount();
});

test('SDK/DOM mock: fresh data and pending keyboard redraws never steal focus from an outside control',()=>{
 const h=harness({level:6}),cluster=h.clusters()[0];cluster.focus();h.click(cluster,0);h.outside.focus();h.flush();assert.strictEqual(h.dom.activeElement,h.outside);
 const calls=h.stats.focus.length;h.update({sourcedStores:[sourceStore(1,{name:'변경된 이름'})]});assert.strictEqual(h.dom.activeElement,h.outside);
 h.update({sourcedStores:[]});assert.strictEqual(h.dom.activeElement,h.outside);assert.equal(h.stats.focus.length,calls);assert.equal(h.live.size,0);h.unmount();
});

test('SDK/DOM mock: focus moved to another disappearing overlay before keyboard redraw falls back to the canvas',()=>{
 const h=harness({level:6,sources:[sourceStore(1),sourceStore(2),sourceStore(10),sourceStore(11)]});assert.equal(h.clusters().length,2);
 const [first,second]=h.clusters();first.focus();h.click(first,0);second.focus();h.flush();
 assert.equal(second.isConnected,false);assert.strictEqual(h.dom.activeElement,h.canvas);assert.ok(h.stats.focus.every(call=>call.connected));h.unmount();
});

test('SDK/DOM mock: removed or failed feeds drop focused nodes, focus the canvas, and never resurrect old focus',()=>{
 for(const level of [4,8]){
  const sources=[sourceStore(1),sourceStore(2)],h=harness({sources,level}),old=h.nodes()[0];old.focus();h.emit('idle');
  // useSourcedStores exposes an empty public source input after a failed refresh.
  h.update({sourcedStores:[],sourceIdentityStores:[]});assert.equal(h.frames.size,0);assert.equal(h.live.size,0);assert.equal(old.isConnected,false);assert.strictEqual(h.dom.activeElement,h.canvas);
  assert.equal(h.context.overlaysRef.current.length,0);h.click(old);assert.equal(h.stats.sourceSelected.length,0,'A retained JS reference cannot select a removed source');
  h.update({sourcedStores:structuredClone(sources)});assert.strictEqual(h.dom.activeElement,h.canvas,'Newly returned data does not revive abandoned overlay focus');
  assert.ok(!h.nodes().includes(old));h.unmount();
 }
 const h=harness({level:4,sources:[],menus:[{...report}]}),old=h.singles()[0];old.focus();h.update({menus:[]});assert.strictEqual(h.dom.activeElement,h.canvas);h.click(old);assert.equal(h.stats.selected.length,0);h.unmount();
});

test('SDK/DOM mock: changed preview heat refreshes a same-ID pin without carrying the old annotation',()=>{
 const store=sourceStore(1),h=harness({sources:[store],sourcePreview:true,sourceSelectionEnabled:false}),initial=h.singles()[0];initial.focus();
 const preview={scope:'preview-local',storeId:store.id,menuId:store.menus[0].id,menuName:store.menus[0].name,medianHeat:2,myHeat:2,sampleCount:1};
 h.update({previewSourceHeat:preview});const first=h.singles()[0];assert.notStrictEqual(first,initial);assert.match(first.getAttribute('aria-label'),/중앙값 2\/5/);assert.strictEqual(h.dom.activeElement,first);
 h.update({previewSourceHeat:{...preview,medianHeat:5,myHeat:5}});assert.match(h.singles()[0].getAttribute('aria-label'),/중앙값 5\/5/);assert.doesNotMatch(h.singles()[0].getAttribute('aria-label'),/중앙값 2\/5/);h.unmount();
});

test('SDK/DOM mock: unmount after fresh data clears the layer ref, cancels pending work, and never restores focus',()=>{
 const h=harness();h.clusters()[0].focus();h.update({sourcedStores:[sourceStore(1),sourceStore(2)]});h.emit('idle');
 const lateUpdate=h.context.refreshOverlaysRef.current,lateCallbacks=[...h.frames.values(),...[...h.listeners.values()].flatMap(callbacks=>[...callbacks])],calls=h.stats.focus.length;
 h.unmount();assert.strictEqual(h.context.refreshOverlaysRef.current,null);assert.equal(h.context.overlaysRef.current.length,0);assert.equal(h.frames.size,0);assert.equal(h.listeners.size,0);assert.equal(h.live.size,0);assert.strictEqual(h.dom.activeElement,h.dom.body);
 lateUpdate();for(const callback of lateCallbacks)callback();assert.equal(h.stats.focus.length,calls);assert.equal(h.frames.size,0);assert.equal(h.live.size,0);assert.equal(h.stats.created,h.stats.removed);
});

test('SDK/DOM mock: an already-ready replacement map gets a fresh layer and old map callbacks cannot redraw',()=>{
 assert.match(component,/mapRef\.current=map;\s*setMapRevision\(revision=>revision\+1\)/);
 const h=harness(),old=h.clusters()[0],oldMap=h.map,lateUpdate=h.context.refreshOverlaysRef.current;old.focus();h.emit('idle');const lateFrame=[...h.frames.values()][0];
 const nextMap=h.replaceMap();assert.notStrictEqual(nextMap,oldMap);assert.equal(h.context.mapState,'ready');assert.equal(old.isConnected,false);assert.notStrictEqual(h.clusters()[0],old);
 assert.ok([...h.live].every(overlay=>overlay.options.map===nextMap));assert.equal(h.frames.size,0);assert.equal(h.listeners.size,3);assert.equal(h.observers.length,2);assert.equal(h.observers[0].disconnected,true);
 const created=h.stats.created;lateUpdate();lateFrame();assert.equal(h.stats.created,created);assert.strictEqual(h.dom.activeElement,h.dom.body,'A map replacement does not restore abandoned overlay focus');h.unmount();
});

test('SDK/DOM mock: retry gaps and ready/error/remount cycles cannot draw onto the old map',()=>{
 const h=harness(),lateUpdate=h.context.refreshOverlaysRef.current;h.emit('idle');const lateFrame=[...h.frames.values()][0],created=h.stats.created;
 // Match map initialization cleanup before a replacement SDK map is available.
 h.context.overlaysRef.current.forEach(overlay=>overlay.setMap(null));h.context.mapRef.current=null;
 h.update({sourcedStores:[sourceStore(3),sourceStore(4)]});lateUpdate();h.flush();lateFrame();assert.equal(h.live.size,0);assert.equal(h.stats.created,created);
 h.update({mapState:'error'});assert.equal(h.listeners.size,0);assert.equal(h.frames.size,0);assert.strictEqual(h.context.refreshOverlaysRef.current,null);
 h.update({mapState:'loading'});h.replaceMap();assert.equal(h.live.size,0);h.update({mapState:'ready'});assert.equal(h.clusters().length,1);assert.ok([...h.live].every(overlay=>overlay.options.map===h.map));
 h.update({sourcePreview:true});assert.equal(h.clusters().length,0);assert.equal(h.singles().length,2);assert.equal(h.listeners.size,0);
 h.update({sourcePreview:false});assert.equal(h.clusters().length,1);assert.equal(h.listeners.size,3);h.unmount();assert.equal(h.stats.created,h.stats.removed);
});

test('SDK/DOM mock: primary loaded count follows the same mounted clusters across pan, refresh and invalid bounds',()=>{
 const h=harness();assert.equal(h.stats.visibleCount,2);assert.equal(Number(h.clusters()[0].textContent),2);
 const focused=h.clusters()[0];focused.focus();h.update({sourcedStores:JSON.parse(JSON.stringify(h.context.sourcedStores))});assert.strictEqual(h.dom.activeElement,focused);assert.equal(h.stats.visibleCount,2);
 h.state.bounds={south:33,north:34,west:125,east:126};h.emit('bounds_changed');h.flush();assert.equal(h.stats.visibleCount,0);assert.equal(h.live.size,0);
 h.state.bounds={...initialBounds};h.emit('bounds_changed');h.flush();assert.equal(h.stats.visibleCount,2);assert.equal(h.clusters().length,1);
 const original=h.map.getBounds;h.map.getBounds=()=>null;h.emit('bounds_changed');h.flush();assert.equal(h.stats.visibleCount,null);assert.equal(h.singles().length,2);
 h.map.getBounds=original;h.emit('bounds_changed');h.flush();assert.equal(h.stats.visibleCount,2);h.unmount();assert.equal(h.listeners.size,0);
});

test('SDK/DOM mock: coincident HOT stores expand as independent pins and collapse on movement, zoom and empty input',()=>{
 const sources=[1,2,3].map(n=>sourceStore(n,{coordinates:{lat:37.55,lon:126.98},address:'서울특별시 중구 자료길 1 '+n+'호'})),before=JSON.stringify(sources);
 const h=harness({level:4,sources});
 const root=()=>h.nodes().find(node=>node.className==='map-store-overlap');
 const toggle=()=>root().children[0];
 const pins=()=>root().children[1]?.children.filter(node=>node.className==='map-overlap-item').map(node=>node.children[0])||[];
 assert.equal(h.nodes().length,1);assert.equal(toggle().textContent,'3');assert.equal(toggle().getAttribute('aria-expanded'),'false');
 h.click(toggle());assert.equal(pins().length,3);assert.equal(toggle().getAttribute('aria-expanded'),'true');
 for(const [index,pin] of pins().entries()){h.click(pin);assert.strictEqual(h.stats.sourceSelected.at(-1),sources[index])}
 h.state.bounds={...h.state.bounds,west:h.state.bounds.west+.001};h.emit('bounds_changed');h.flush();assert.equal(pins().length,0);
 h.click(toggle());h.map.setLevel(3);h.flush();assert.equal(pins().length,0);
 h.click(toggle());h.canvas.clientWidth=1000;h.observers[0].callback();h.flush();assert.equal(pins().length,0);
 h.click(toggle());h.update({sourcedStores:[],sourceIdentityStores:[]});assert.equal(h.nodes().length,0);
 h.update({sourcedStores:sources,sourceIdentityStores:sources});assert.equal(toggle().getAttribute('aria-expanded'),'false');
 assert.equal(JSON.stringify(sources),before);h.unmount();assert.equal(h.live.size,0);assert.equal(h.listeners.size,0);
});

test('SDK/DOM mock: unchanged selection on background refresh preserves open overlap; changed targets still recenter',()=>{
 const sources=[1,2,3].map(n=>sourceStore(n,{coordinates:{lat:37.55,lon:126.98}}));
 const h=harness({level:4,sources});h.update({selectedSourceId:sources[0].id});h.runSelection();h.flush();
 const root=()=>h.nodes().find(node=>node.className==='map-store-overlap');
 h.click(root().children[0]);assert.equal(root().children[0].getAttribute('aria-expanded'),'true');
 const pans=h.stats.pans.length,levels=h.stats.levels.length;
 h.update({menus:[]});h.runSelection();h.flush();
 assert.equal(h.stats.pans.length,pans,'A refreshed menu array is not a new selection');
 assert.equal(h.stats.levels.length,levels);assert.equal(root().children[0].getAttribute('aria-expanded'),'true');
 h.update({sourcedStores:structuredClone(sources),sourceIdentityStores:structuredClone(sources)});h.runSelection();h.flush();
 assert.equal(h.stats.pans.length,pans);assert.equal(root().children[0].getAttribute('aria-expanded'),'true');
 h.update({selectedSourceId:sources[1].id});h.runSelection();h.flush();assert.equal(h.stats.pans.length,pans+1);
 h.update({selectedSourceId:undefined});h.runSelection();h.update({selectedSourceId:sources[1].id});h.runSelection();h.flush();assert.equal(h.stats.pans.length,pans+2,'Reselecting after dismissal is intentional');
 const moved=sources.map((source,i)=>i===1?{...source,coordinates:{lat:37.56,lon:126.99}}:source);
 h.update({sourcedStores:moved,sourceIdentityStores:moved});h.runSelection();h.flush();assert.equal(h.stats.pans.at(-1).lat,37.56);
 h.replaceMap();h.runSelection();h.flush();assert.equal(h.stats.pans.length,pans+4,'Replacement map needs a fresh center');h.unmount();
});

test('SDK/DOM mock: unchanged viewport notifications keep petals open, real pan/zoom/resize and unreadable state close',()=>{
 const sources=[1,2,3].map(n=>sourceStore(n,{coordinates:{lat:37.55,lon:126.98}}));
 const h=harness({level:4,sources}),root=()=>h.nodes().find(node=>node.className==='map-store-overlap'),expanded=()=>root().children[0].getAttribute('aria-expanded');
 h.click(root().children[0]);
 for(const event of ['bounds_changed','zoom_changed','idle','bounds_changed']){h.emit(event);h.flush();assert.equal(expanded(),'true','No-op '+event)}
 h.observers[0].callback();h.flush();assert.equal(expanded(),'true','Unchanged canvas size is not a resize');
 h.update({sourcedStores:structuredClone(sources),menus:[]});h.emit('bounds_changed');h.flush();assert.equal(expanded(),'true','Equivalent polling stays open');
 h.state.bounds={...h.state.bounds,west:h.state.bounds.west+.001};h.emit('bounds_changed');h.flush();assert.equal(expanded(),'false');
 h.click(root().children[0]);h.map.setLevel(3);h.flush();assert.equal(expanded(),'false');
 h.click(root().children[0]);h.canvas.clientWidth-=100;h.observers[0].callback();h.flush();assert.equal(expanded(),'false');
 h.click(root().children[0]);const getBounds=h.map.getBounds;h.map.getBounds=()=>null;h.emit('bounds_changed');h.flush();assert.equal(root(),undefined,'Unreadable viewport fails closed to individual pins');
 h.map.getBounds=getBounds;h.emit('idle');h.flush();assert.equal(expanded(),'false','Recovery cannot resurrect abandoned expansion');
 h.click(root().children[0]);h.canvas.clientHeight=0;h.observers[0].callback();h.flush();assert.equal(expanded(),'false','Hidden canvas state fails closed');
 h.unmount();assert.equal(h.live.size,0);assert.equal(h.listeners.size,0);
});
