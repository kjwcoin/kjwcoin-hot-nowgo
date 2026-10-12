import test from 'node:test';
import assert from 'node:assert/strict';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import * as sourced from '../lib/sourced-store.ts';
import {hookHarness,moduleAt} from './helpers/source-ui-components.mjs';
const store=sourcePreviewStore(),seed={stores:[store],complete:false,asOf:store.source.checkedAt};

test('SSR feed seed is not the preview bypass: mount refreshes, and failure drops seeded facts',async()=>{
 const harness=hookHarness(),timers=[];let calls=0,fail=false;
 const globals={AbortController,setTimeout:callback=>{timers.push(callback);return timers.length},clearTimeout(){},setInterval(){return 1},clearInterval(){},window:{addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},fetch:async()=>{calls++;if(fail)throw Error('unavailable');return {ok:true,json:async()=>({...seed,complete:true})}}};
 const {useSourcedStores}=moduleAt('hooks/use-sourced-stores.ts',{react:harness.react,'@/lib/sourced-store':sourced},globals);
 let state=harness.render(()=>useSourcedStores('hot',undefined,seed));assert.equal(state.status,'ready');assert.strictEqual(state.feed,seed);
 harness.flushEffects();assert.equal(timers.length,1);timers[0]();await new Promise(resolve=>setImmediate(resolve));
 state=harness.render(()=>useSourcedStores('hot',undefined,seed));assert.equal(calls,1);assert.equal(state.status,'ready');assert.equal(state.feed.complete,true);
 fail=true;await state.refresh();state=harness.render(()=>useSourcedStores('hot',undefined,seed));assert.equal(calls,2);assert.equal(state.status,'error');assert.equal(state.feed,null);
});

test('the explicit preview feed still skips scheduling and all network reads',async()=>{
 const harness=hookHarness();const blocked=()=>{throw Error('Unexpected preview side effect')};
 const {useSourcedStores}=moduleAt('hooks/use-sourced-stores.ts',{react:harness.react,'@/lib/sourced-store':sourced},{fetch:blocked,setTimeout:blocked,setInterval:blocked});
 let state=harness.render(()=>useSourcedStores('hot',seed));harness.flushEffects();await state.refresh();state=harness.render(()=>useSourcedStores('hot',seed));assert.strictEqual(state.feed,seed);assert.equal(state.status,'ready');
});
