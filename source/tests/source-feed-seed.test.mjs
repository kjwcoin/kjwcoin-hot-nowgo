import test from 'node:test';
import * as contracts from '../lib/source-feed-contract.ts';
import assert from 'node:assert/strict';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import * as sourced from '../lib/sourced-store.ts';
import {hookHarness,moduleAt} from './helpers/source-ui-components.mjs';
const store=sourcePreviewStore(),seed={stores:[store],complete:false,asOf:store.source.checkedAt};

test('SSR feed seed is not the preview bypass: mount refreshes, and failure drops seeded facts',async()=>{
 const harness=hookHarness(),timers=[];let calls=0,fail=false;
 const globals={AbortController,setTimeout:callback=>{timers.push(callback);return timers.length},clearTimeout(){},setInterval(){return 1},clearInterval(){},window:{addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},fetch:async()=>{calls++;if(fail)throw Error('unavailable');return {ok:true,headers:new Headers({[contracts.SOURCE_FEED_CONTRACT_HEADER]:contracts.CURRENT_SOURCE_FEED_CONTRACT}),json:async()=>({...seed,complete:true})}}};
 const {useSourcedStores}=moduleAt('hooks/use-sourced-stores.ts',{react:harness.react,'@/lib/source-feed-contract':contracts,'@/lib/sourced-store':sourced},globals);
 let state=harness.render(()=>useSourcedStores('hot',undefined,seed));assert.equal(state.status,'ready');assert.strictEqual(state.feed,seed);
 harness.flushEffects();assert.equal(timers.length,1);timers[0]();await new Promise(resolve=>setImmediate(resolve));
 state=harness.render(()=>useSourcedStores('hot',undefined,seed));assert.equal(calls,1);assert.equal(state.status,'ready');assert.equal(state.feed.complete,true);
 fail=true;await state.refresh();state=harness.render(()=>useSourcedStores('hot',undefined,seed));assert.equal(calls,2);assert.equal(state.status,'error');assert.equal(state.feed,null);
});

test('the explicit preview feed still skips scheduling and all network reads',async()=>{
 const harness=hookHarness();const blocked=()=>{throw Error('Unexpected preview side effect')};
 const {useSourcedStores}=moduleAt('hooks/use-sourced-stores.ts',{react:harness.react,'@/lib/source-feed-contract':contracts,'@/lib/sourced-store':sourced},{fetch:blocked,setTimeout:blocked,setInterval:blocked});
 let state=harness.render(()=>useSourcedStores('hot',seed));harness.flushEffects();await state.refresh();state=harness.render(()=>useSourcedStores('hot',seed));assert.strictEqual(state.feed,seed);assert.equal(state.status,'ready');
});


function deferredRead({feed=seed}={}){
 const harness=hookHarness();let resolve,reject;
 const globals={AbortController,setTimeout(){return 1},clearTimeout(){},fetch:()=>new Promise((yes,no)=>{resolve=yes;reject=no})};
 const {useSourcedStores}=moduleAt('hooks/use-sourced-stores.ts',{react:harness.react,'@/lib/source-feed-contract':contracts,'@/lib/sourced-store':sourced},globals);
 const render=()=>harness.render(()=>useSourcedStores('hot',undefined,feed));
 return{render,reply:body=>resolve({ok:true,headers:new Headers({[contracts.SOURCE_FEED_CONTRACT_HEADER]:contracts.CURRENT_SOURCE_FEED_CONTRACT}),json:async()=>body}),fail:()=>reject(Error('unavailable'))};
}
const readonlySeed={...seed,complete:true,stores:[{...store,registrationState:'source-only'}]};

test('a deferred background refresh retains the selected read-only store identity and facts',async()=>{
 const h=deferredRead({feed:readonlySeed});const before=h.render();const pending=before.refresh();
 const loading=h.render();assert.equal(loading.status,'loading');assert.strictEqual(loading.feed,before.feed);assert.strictEqual(loading.feed.stores[0],before.feed.stores[0]);
 h.reply({...readonlySeed,asOf:'2026-10-12T17:00:00Z'});await pending;
 const ready=h.render();assert.equal(ready.status,'ready');assert.equal(ready.feed.stores[0].id,store.id);
});

test('failure drops retained facts and authoritative removal drops the selected store',async()=>{
 const failed=deferredRead({feed:readonlySeed});const pending=failed.render().refresh();assert.equal(failed.render().feed.stores.length,1);failed.fail();await pending;assert.equal(failed.render().status,'error');assert.equal(failed.render().feed,null);
 const removed=deferredRead({feed:readonlySeed});const refresh=removed.render().refresh();removed.reply({...readonlySeed,stores:[]});await refresh;assert.equal(removed.render().status,'ready');assert.equal(removed.render().feed.stores.length,0);
});

test('database, claimed, contradictory and mixed feeds are never retained while refreshing',async()=>{
 for(const overrides of [{registrationState:'database'},{registrationState:undefined},{ownerClaimVerified:true},{ownership:'verified'},{pinStatus:'owner-verified'}]){
  const feed={...readonlySeed,stores:[{...readonlySeed.stores[0],...overrides}]};
  const h=deferredRead({feed});const pending=h.render().refresh();assert.equal(h.render().feed,null);h.fail();await pending;
 }
 const mixed=deferredRead({feed:{...readonlySeed,stores:[readonlySeed.stores[0],store]}});const p=mixed.render().refresh();assert.equal(mixed.render().feed,null);mixed.fail();await p;
});

test('malformed refreshed facts clear the old read-only panel instead of keeping a stale success',async()=>{
 const h=deferredRead({feed:readonlySeed});const pending=h.render().refresh();h.reply({...readonlySeed,complete:undefined});await pending;assert.equal(h.render().status,'error');assert.equal(h.render().feed,null);
});
