import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bindSourceMarkerSelection} from '../lib/source-map-marker.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';

function marker(){return {href:'https://hot.nowgo.space/p/source-store-1',target:'_blank',className:'map-anchor map-anchor--sourced',attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this[k]}}}
function event(change={}){return {button:0,defaultPrevented:false,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,preventDefault(){this.defaultPrevented=true},...change}}
test('ordinary and keyboard activation select the actual source in the existing panel without navigation',()=>{
 const store=sourceStore(),link=marker(),selected=[];bindSourceMarkerSelection(link,store,value=>selected.push(value),true);
 assert.equal(link.target,undefined);assert.equal(link.href,'https://hot.nowgo.space/p/source-store-1');assert.match(link.className,/ selected$/);assert.equal(link.attributes['aria-current'],'true');
 const click=event();link.onclick(click);assert.equal(click.defaultPrevented,true);assert.strictEqual(selected[0],store);
 const keyboard=event({detail:0});link.onclick(keyboard);assert.equal(keyboard.defaultPrevented,true);assert.equal(selected.length,2);
});
test('modified clicks and a previously canceled event preserve browser navigation semantics',()=>{
 const link=marker();let calls=0;bindSourceMarkerSelection(link,sourceStore(),()=>calls++);
 for(const change of [{button:1},{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{defaultPrevented:true}]){const click=event(change);link.onclick(click);assert.equal(click.defaultPrevented,!!change.defaultPrevented)}
 assert.equal(calls,0);
});
test('callers without source-panel support retain the canonical source link without a fabricated handler',()=>{
 const link=marker();bindSourceMarkerSelection(link,sourceStore());assert.equal(link.target,'_blank');assert.equal(link.onclick,undefined);assert.equal(link.attributes['aria-current'],undefined);
});
test('Kakao source overlays connect the source selection callback, separate from legacy menu identity',()=>{
 const source=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
 assert.match(source,/onSourceSelect\?:\(store:PublicSourcedStore\)=>void/);assert.match(source,/selectedSourceId\?:string/);
 assert.match(source,/bindSourceMarkerSelection\(link,store,sourceSelectionEnabled\?\(\)=>\{const current=pointByKey\.get\(point\.key\)\?\.group\.source;if\(current\)callbacksRef\.current\.onSourceSelect\?\.\(current\)\}:undefined,selectedSourceId===store\.id\)/);
});

// Browser/SDK movement still requires live verification; this locks the real effect wiring.
test('selecting a sourced store pans to its licensed coordinates, without inventing a position',()=>{
 const source=fs.readFileSync(new URL('../components/kakao-map.tsx',import.meta.url),'utf8');
 assert.match(source,/const source=sourceIdentityStores\.find\(store=>store\.id===selectedSourceId\)/);
 assert.match(source,/lat:source\.coordinates\.lat,lng:source\.coordinates\.lon/);
 assert.match(source,/map\.setLevel\(4\);map\.panTo\(new kakaoRef\.current\.maps\.LatLng\(target\.lat,target\.lng\)\)/);
 assert.match(source,/\[mapState,mapRevision,menus,selectedId,sourceIdentityStores,selectedSourceId\]/);
});
