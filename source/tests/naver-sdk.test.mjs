import test from 'node:test';
import assert from 'node:assert/strict';
test('waits for NAVER geocoder callback, shares loading, and supports retry after failure',async()=>{
 const scripts=[],events=[];globalThis.window={dispatchEvent:e=>events.push(e.type)};
 globalThis.document={createElement:()=>({remove(){this.removed=true}}),head:{appendChild:s=>scripts.push(s)}};
 const {loadNaverSdk}=await import('../lib/naver-sdk.ts');
 try{
  const failed=loadNaverSdk('public-key');scripts[0].onerror();await assert.rejects(failed,/load failed/);
  assert.equal(scripts[0].removed,true);
  const promise=loadNaverSdk('public-key');assert.strictEqual(loadNaverSdk('public-key'),promise);
  const script=scripts[1],callback=new URL(script.src).searchParams.get('callback');assert.equal(new URL(script.src).searchParams.get('submodules'),'geocoder');
  window.naver={maps:{Map:class{}}};let resolved=false;promise.then(()=>{resolved=true});await Promise.resolve();assert.equal(resolved,false);
  window.naver.maps.Service={};window[callback]();assert.strictEqual(await promise,window.naver);assert.equal(window[callback],undefined);
  assert.equal(scripts.length,2);assert.equal(events.length,0);
 }finally{delete globalThis.window;delete globalThis.document}
});
