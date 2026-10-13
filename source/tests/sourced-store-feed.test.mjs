import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseSourcedStoreFeed} from '../lib/sourced-store.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,READONLY_SOURCE_PUBLICATION} from '../lib/readonly-source-listings.ts';
const source=fs.readFileSync(new URL('../lib/sourced-store-feed.ts',import.meta.url),'utf8');
const routeSource=fs.readFileSync(new URL('../app/api/sourced-stores/route.ts',import.meta.url),'utf8');
function load({enabled=true,reader=readonlySourceStoreFeed}={}){
 const exports={},calls=[];
 const dependencies={'./sourced-store.ts':{parseSourcedStoreFeed},'./readonly-source-listings.ts':{readonlySourceStoreFeed:()=>{calls.push('manifest');return reader()}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:enabled?'true':'false'}},require:name=>{assert.ok(name in dependencies,name);return dependencies[name]}});
 return {...exports,calls};
}
test('first public feed contains exactly 130 scoped source-only listings and no held sixth',async()=>{
 const feed=await load().readSourcedStoreFeed();assert.equal(READONLY_SOURCE_PUBLICATION,true);assert.equal(feed.stores.length,130);assert.equal(feed.complete,true);
 for(const store of feed.stores){assert.equal(store.registrationState,'source-only');assert.equal(store.ownerClaimVerified,false);assert.equal(store.indexable,true);assert.equal(store.reportingState,'pending');assert.equal(isReadonlySourceStoreId(store.id),true);assert.equal(isReadonlySourceStoreId(store.id.toUpperCase()),true);assert.equal(isReadonlySourceStoreId('{'+store.id+'}'),true);assert.equal(isReadonlySourceStoreId(store.id.replaceAll('-','')),true);for(const menu of store.menus){assert.equal(menu.heat,null);assert.equal(menu.price,null);assert.equal(menu.image,null);if(menu.provenance){assert.equal(menu.sourceTaste,null);assert.equal(menu.provenance.explicitOpenLicense,false)}else{assert.ok(menu.sourceTaste.description);assert.equal(menu.sourceTaste.sourceUrl,store.source.url)}}}
 assert.ok(feed.stores.every(store=>!store.name.includes('전골그집')));assert.equal(isReadonlySourceStoreId('5c7fbc3f-8d90-58e6-9817-695de84a5efd'),false);assert.equal(isReadonlySourceStoreId(null),false);
 assert.doesNotMatch(source,/fetch\(|publicDb|service.role|\.from\(|authorization|nowgo\.space/i);
});
test('disabled, aborted or malformed manifest cannot masquerade as a complete empty feed',async()=>{
 const disabled=load({enabled:false});await assert.rejects(disabled.readSourcedStoreFeed(),/source_feed_disabled/);assert.equal(disabled.calls.length,0);
 const abort=new AbortController();abort.abort(Error('cancelled'));const cancelled=load();await assert.rejects(cancelled.readSourcedStoreFeed(abort.signal),/cancelled/);assert.equal(cancelled.calls.length,0);
 for(const reader of [()=>{throw Error('invalid_manifest')},()=>({stores:[]}),()=>({...readonlySourceStoreFeed(),stores:[{...readonlySourceStoreFeed().stores[0],ownerClaimVerified:true}]})])await assert.rejects(load({reader}).readSourcedStoreFeed());
});
test('source descriptions remain separate from unknown numerical heat/media and reject mismatched provenance',()=>{
 const feed=readonlySourceStoreFeed(),first=feed.stores[0],menu=first.menus[0];
 assert.equal(parseSourcedStoreFeed(feed).stores[0].menus[0].heat,null);
 const bad={...first,menus:[{...menu,sourceTaste:{...menu.sourceTaste,sourceUrl:'https://example.com/claim'}}]};
 assert.throws(()=>parseSourcedStoreFeed({...feed,stores:[bad]}),/invalid_source_store/);
 for(const key of ['price','heat','image'])assert.throws(()=>parseSourcedStoreFeed({...feed,stores:[{...first,menus:[{...menu,[key]:3}]}]}),/invalid_source_store/);
 assert.throws(()=>parseSourcedStoreFeed({...feed,stores:[{...first,indexable:'yes'}]}),/invalid_source_store/);
});
test('HOT proxy returns only parsed feed; non-HOT avoids manifest; failures explicitly return503',async()=>{
 for(const variant of ['hot','sweet','rich'])for(const failure of [false,true]){
  const exports={},calls=[];const fixture=readonlySourceStoreFeed();
  const dependencies={'@/lib/server':{reply:(_request,data,status=200)=>({data,status})},'@/lib/site-config':{variantForHost:()=>variant},'@/lib/sourced-store-feed':{readSourcedStoreFeed:async()=>{calls.push('manifest');if(failure)throw Error('private detail');return fixture}}};
  vm.runInNewContext(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>dependencies[name]});
  const response=await exports.GET(new Request('https://'+variant+'.nowgo.space/api/sourced-stores',{headers:{host:variant+'.nowgo.space'}}));assert.equal(calls.length,variant==='hot'?1:0);assert.equal(response.status,variant==='hot'&&failure?503:200);assert.equal(response.data.complete,!(variant==='hot'&&failure));assert.doesNotMatch(JSON.stringify(response),/private detail/);
 }
});
