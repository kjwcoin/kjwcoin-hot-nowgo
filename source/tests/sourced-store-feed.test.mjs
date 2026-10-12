import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseSourcedStoreFeed} from '../lib/sourced-store.ts';
import {sixSources} from './fixtures/sourced-stores.mjs';
const source=fs.readFileSync(new URL('../lib/sourced-store-feed.ts',import.meta.url),'utf8');
const routeSource=fs.readFileSync(new URL('../app/api/sourced-stores/route.ts',import.meta.url),'utf8');
const fixture={stores:sixSources,asOf:'2026-10-12T08:00:00Z',complete:true};
function load({enabled=true,fetcher=async()=>Response.json(fixture)}={}){
 const exports={},calls=[];
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,AbortSignal,process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:enabled?'true':'false'}},fetch:async(...args)=>{calls.push(args);return fetcher(...args)},require(name){assert.equal(name,'./sourced-store.ts');return {parseSourcedStoreFeed}}});
 return {...exports,calls};
}
test('feed is public, no-credential, non-redirecting, bounded-time fetch with strict DTO validation',async()=>{
 const api=load(),signal=new AbortController().signal;assert.equal((await api.readSourcedStoreFeed(signal)).stores.length,6);
 const [url,options]=api.calls[0];assert.equal(url,'https://www.nowgo.space/api/nowgo/hot/sourced-stores');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);assert.equal(options.headers,undefined);assert.equal(options.credentials,undefined);
 assert.doesNotMatch(source,/publicDb|service.role|\.from\(|authorization/i);
});
test('disabled feature, upstream failures, HTML, and invalid/partial feeds cannot masquerade as complete zero',async()=>{
 const disabled=load({enabled:false});await assert.rejects(disabled.readSourcedStoreFeed(),/source_feed_disabled/);assert.equal(disabled.calls.length,0);
 for(const fetcher of [async()=>{throw Error('offline')},async()=>new Response('unavailable',{status:503}),async()=>new Response('<html/>'),async()=>Response.json({stores:[],asOf:fixture.asOf}),async()=>Response.json({...fixture,stores:[{...sixSources[0],menus:[]}]})])await assert.rejects(load({fetcher}).readSourcedStoreFeed());
 assert.equal((await load({fetcher:async()=>Response.json({...fixture,complete:false})}).readSourcedStoreFeed()).complete,false);
});
test('caller cancellation reaches the upstream fetch',async()=>{
 const controller=new AbortController();let seen;
 const api=load({fetcher:async(_url,{signal})=>{seen=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))}});
 const pending=api.readSourcedStoreFeed(controller.signal);controller.abort();await assert.rejects(pending,/aborted/);assert.equal(seen.aborted,true);
});
test('HOT proxy forwards only parsed feed; non-HOT avoids source calls; safe failure returns 503',async()=>{
 for(const variant of ['hot','sweet','rich'])for(const failure of [false,true]){
  const exports={},calls=[];
  const dependencies={'@/lib/server':{reply:(_request,data,status=200)=>({data,status})},'@/lib/site-config':{variantForHost:host=>{assert.equal(host,variant+'.nowgo.space');return variant}},'@/lib/sourced-store-feed':{readSourcedStoreFeed:async signal=>{calls.push(signal);if(failure)throw Error('private upstream detail');return fixture}}};
  vm.runInNewContext(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>dependencies[name]});
  const response=await exports.GET(new Request('https://'+variant+'.nowgo.space/api/sourced-stores',{headers:{host:variant+'.nowgo.space'}}));
  assert.equal(calls.length,variant==='hot'?1:0);assert.equal(response.status,variant==='hot'&&failure?503:200);assert.equal(response.data.complete,!(variant==='hot'&&failure));assert.doesNotMatch(JSON.stringify(response),/private upstream detail/);
 }
});
